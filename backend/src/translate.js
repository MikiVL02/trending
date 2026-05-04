const axios = require('axios');

const CJK_RE = /[一-鿿㐀-䶿]/;
const HTML_TAG_RE = /<[^>]{1,100}>/g;

function cleanText(text) {
  if (!text) return text;
  return text
    .replace(HTML_TAG_RE, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function translate(text) {
  const cleaned = cleanText(text);
  if (!cleaned || cleaned.length < 5) return cleaned || text;
  if (CJK_RE.test(cleaned)) return cleaned;

  try {
    const res = await axios.get('https://translate.googleapis.com/translate_a/single', {
      params: {
        client: 'gtx',
        sl: 'en',
        tl: 'zh-CN',
        dt: 't',
        q: cleaned.slice(0, 500),
      },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });
    const translated = res.data?.[0]?.map(s => s?.[0]).filter(Boolean).join('');
    if (!translated || translated === cleaned) return cleaned;
    return translated.trim();
  } catch {
    return cleaned;
  }
}

module.exports = { translate };
