const BASE = '/api';

export async function fetchRepos(filter = 'all') {
  const res = await fetch(`${BASE}/repos?filter=${filter}`);
  if (!res.ok) throw new Error('Failed to fetch repos');
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function setFavorite(id, value) {
  const method = value ? 'POST' : 'DELETE';
  const res = await fetch(`${BASE}/repos/${id}/favorite`, { method });
  if (!res.ok) throw new Error('Failed to update favorite');
  return res.json();
}

export async function triggerScrape() {
  const res = await fetch(`${BASE}/scrape`, { method: 'POST' });
  if (!res.ok) throw new Error('Scrape failed');
  return res.json();
}
