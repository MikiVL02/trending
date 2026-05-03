const db = require('./db');

function cleanup() {
  const result = db.prepare(`
    DELETE FROM repositories
    WHERE is_favorited = 0
      AND date(first_fetched_at) <= date('now', '-7 days')
  `).run();

  if (result.changes > 0) {
    console.log(`[cleanup] Deleted ${result.changes} unfavorited repo(s) older than 7 days`);
  }
}

module.exports = { cleanup };
