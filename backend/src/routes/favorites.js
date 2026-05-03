const db = require('../db');

function favorite(req, res) {
  const row = db.prepare('SELECT id FROM repositories WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE repositories SET is_favorited = 1, favorited_at = datetime('now')
    WHERE id = ?
  `).run(req.params.id);

  res.json({ success: true });
}

function unfavorite(req, res) {
  const row = db.prepare('SELECT id FROM repositories WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE repositories SET is_favorited = 0, favorited_at = NULL
    WHERE id = ?
  `).run(req.params.id);

  res.json({ success: true });
}

module.exports = { favorite, unfavorite };
