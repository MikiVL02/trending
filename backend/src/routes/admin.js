const { scrape } = require('../scraper');
const { cleanup } = require('../cleanup');

async function triggerScrape(req, res) {
  try {
    await scrape();
    cleanup();
    res.json({ success: true, message: 'Scrape completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { triggerScrape };
