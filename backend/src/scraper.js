const axios = require('axios');
const cheerio = require('cheerio');
const db = require('./db');
const { translate } = require('./translate');

const TRENDING_URL = 'https://github.com/trending?since=daily';
const README_URL = (owner, repo) => `https://api.github.com/repos/${owner}/${repo}/readme`;

function buildHeaders() {
  const headers = { 'User-Agent': 'github-trending-app/1.0' };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchTrending() {
  const MAX_ATTEMPTS = 3;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await axios.get(TRENDING_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        timeout: 90000,
      });
      if (attempt > 1) console.log('[scraper] trending fetch ok on attempt ' + attempt);
      return parseTrending(res.data);
    } catch (err) {
      lastErr = err;
      console.log('[scraper] trending fetch attempt ' + attempt + '/' + MAX_ATTEMPTS + ' failed: ' + err.message);
      if (attempt < MAX_ATTEMPTS) await new Promise(function (r) { setTimeout(r, attempt * 2000); });
    }
  }
  throw lastErr;
}

function parseTrending(html) {
  const $ = cheerio.load(html);
  const repos = [];

  $('article.Box-row').slice(0, 10).each((_, el) => {
    const $el = $(el);
    const href = $el.find('h2 a').attr('href') || '';
    const parts = href.replace(/^\//, '').split('/').filter(Boolean);
    const [owner, name] = parts;
    if (!owner || !name) return;

    const descEl = $el.find('p').first();
    const description = descEl.text().trim() || null;

    const starsText = $el.find('a[href$="/stargazers"]').first().text().replace(/,/g, '').trim();
    const stars = parseInt(starsText, 10) || 0;

    const language = $el.find('span[itemprop="programmingLanguage"]').text().trim() || null;

    repos.push({ owner, name, full_name: `${owner}/${name}`, description, stars, language });
  });

  return repos;
}

async function fetchReadme(owner, repo) {
  try {
    const res = await axios.get(README_URL(owner, repo), {
      headers: buildHeaders(),
      timeout: 10000,
    });
    const content = Buffer.from(res.data.content, 'base64').toString('utf-8');
    return content;
  } catch {
    return null;
  }
}

// 候选标题关键词：英文 + 中文 + emoji前缀容忍
const FEATURES_RE = /^#{1,3}[^#\n]*(?:features?|highlights?|overview|about|what is|why|introduction|capabilities|framework|skills?|development|功能|特性|特点|介绍|亮点)[^#\n]*/im;

function extractSection(readme, headingMatch) {
  const start = readme.indexOf(headingMatch) + headingMatch.length;
  const nextHeading = readme.slice(start).search(/^#{1,3}\s/m);
  const section = nextHeading === -1
    ? readme.slice(start)
    : readme.slice(start, start + nextHeading);
  return section
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`#>\-|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500) || null;
}

function extractFeaturesSection(readme, description) {
  if (!readme) return description || null;

  // 优先匹配功能相关标题
  const match = readme.match(FEATURES_RE);
  if (match) {
    const result = extractSection(readme, match[0]);
    if (result && result.length > 20) return result;
  }

  // 兜底：取README正文第一段有意义的文字（跳过徽章行和分隔线）
  const lines = readme.split('\n');
  const paragraphs = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!') || trimmed.startsWith('[!') || trimmed.startsWith('<')) continue;
    if (trimmed.startsWith('[![') || trimmed.match(/^\[!\[/)) continue;
    if (/^[-=]{3,}$/.test(trimmed)) continue;
    if (trimmed.length > 40) paragraphs.push(trimmed);
    if (paragraphs.length >= 3) break;
  }
  const fallback = paragraphs.join(' ').replace(/\s+/g, ' ').trim().slice(0, 500);
  return fallback.length > 20 ? fallback : (description || null);
}

function extractInstallCode(readme) {
  if (!readme) return null;
  const installMatch = readme.match(
    /#{1,3}\s*(?:install(?:ation)?|setup|getting[- ]started|quick[- ]start)\b[^\n]*/i
  );
  const searchFrom = installMatch
    ? readme.indexOf(installMatch[0])
    : 0;
  const slice = readme.slice(searchFrom);
  const codeMatch = slice.match(/```[^\n]*\n([\s\S]*?)```/);
  return codeMatch ? codeMatch[1].trim() : null;
}

async function fetchOwnerAvatar(owner) {
  try {
    const res = await axios.get(`https://api.github.com/users/${owner}`, {
      headers: buildHeaders(),
      timeout: 5000,
    });
    return res.data.avatar_url || null;
  } catch {
    return null;
  }
}

const upsert = db.prepare(`
  INSERT INTO repositories
    (full_name, name, owner, description, language, stars, html_url, avatar_url,
     features_summary, install_code, first_fetched_at, last_fetched_at)
  VALUES
    (@full_name, @name, @owner, @description, @language, @stars, @html_url, @avatar_url,
     @features_summary, @install_code, date('now'), date('now'))
  ON CONFLICT(full_name) DO UPDATE SET
    stars            = excluded.stars,
    description      = excluded.description,
    language         = excluded.language,
    avatar_url       = excluded.avatar_url,
    features_summary = excluded.features_summary,
    install_code     = excluded.install_code,
    last_fetched_at  = excluded.last_fetched_at
`);

async function scrape() {
  console.log('[scraper] Starting scrape...');
  const repos = await fetchTrending();
  console.log(`[scraper] Found ${repos.length} trending repos`);

  for (const repo of repos) {
    const readme = await fetchReadme(repo.owner, repo.name);
    const avatar_url = await fetchOwnerAvatar(repo.owner);
    const features_summary_raw = extractFeaturesSection(readme, repo.description);
    const install_code = extractInstallCode(readme);

    const [description_zh, features_summary] = await Promise.all([
      translate(repo.description),
      translate(features_summary_raw),
    ]);

    upsert.run({
      ...repo,
      description: description_zh,
      html_url: `https://github.com/${repo.full_name}`,
      avatar_url,
      features_summary,
      install_code,
    });
    console.log(`[scraper] Saved ${repo.full_name}`);
  }

  console.log('[scraper] Done.');
}

module.exports = { scrape };
