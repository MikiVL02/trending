const db = require('../db');

function computeDaysUntilDeletion(row) {
  if (row.is_favorited) return null;
  const first = new Date(row.first_fetched_at);
  const now = new Date();
  const daysSince = Math.floor((now - first) / (1000 * 60 * 60 * 24));
  return Math.max(0, 7 - daysSince);
}

function formatRepo(row) {
  const { scraped_at, is_today, ...rest } = row;
  return { ...rest, days_until_deletion: computeDaysUntilDeletion(row) };
}

function getRepos(req, res) {
  const filter = req.query.filter || 'all';
  let rows;

  if (filter === 'today') {
    rows = db.prepare(`
      SELECT * FROM repositories
      WHERE date(last_fetched_at) = date('now')
      ORDER BY stars DESC
    `).all();
  } else if (filter === 'favorites') {
    rows = db.prepare(`
      SELECT * FROM repositories
      WHERE is_favorited = 1
      ORDER BY favorited_at DESC
    `).all();
  } else {
    rows = db.prepare(`
      SELECT * FROM repositories
      ORDER BY stars DESC
    `).all();
  }

  res.json(rows.map(formatRepo));
}

function getRepo(req, res) {
  const row = db.prepare('SELECT * FROM repositories WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(formatRepo(row));
}

function getStats(req, res) {
  const total = db.prepare('SELECT COUNT(*) as count FROM repositories').get().count;
  const favorited = db.prepare('SELECT COUNT(*) as count FROM repositories WHERE is_favorited = 1').get().count;
  const pendingDeletion = db.prepare(`
    SELECT COUNT(*) as count FROM repositories
    WHERE is_favorited = 0
      AND date(first_fetched_at) <= date('now', '-6 days')
  `).get().count;

  res.json({ total, favorited, pendingDeletion });
}

module.exports = { getRepos, getRepo, getStats };
