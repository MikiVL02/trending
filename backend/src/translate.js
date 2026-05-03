const axios = require('axios');

const CJK_RE = /[一-鿿㐀-䶿]/;
const HTML_TAG_RE = /<[^>]{1,100}>/g;

function cleanText(text) {
  if (!text) return text;
  return text
    .replace(HTML_TAG_RE, ' ')   // 去除 HTML 标签
    .replace(/&[a-z]+;/gi, ' ')  // 去除 HTML 实体
    .replace(/\s+/g, ' ')
    .trim();
}

async function translate(text) {
  const cleaned = cleanText(text);
  if (!cleaned || cleaned.length < 5) return cleaned || text;
  if (CJK_RE.test(cleaned)) return cleaned; // 已含中文，跳过

  try {
    const res = await axios.get('https://api.mymemory.translated.net/get', {
      params: { q: cleaned.slice(0, 500), langpair: 'en|zh-CN' },
      headers: { 'User-Agent': 'github-trending-app/1.0' },
      timeout: 10000,
    });
    const translated = res.data?.responseData?.translatedText;
    if (!translated || translated === cleaned || translated.startsWith('PLEASE SELECT')) {
      return cleaned;
    }
    return translated.trim();
  } catch {
    return cleaned; // 失败静默降级，返回清理后原文
  }
}

module.exports = { translate };
