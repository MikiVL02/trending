const cron = require('node-cron');
const { scrape } = require('./scraper');
const { cleanup } = require('./cleanup');

async function runJob() {
  try {
    await scrape();
    cleanup();
  } catch (err) {
    console.error('[scheduler] Job failed:', err.message);
  }
}

function initScheduler() {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', runJob);
  console.log('[scheduler] Daily scrape scheduled at 02:00');

  // Run once immediately on startup
  runJob();
}

module.exports = { initScheduler };
