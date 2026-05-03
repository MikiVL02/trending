import { useState, useEffect, useCallback } from 'react';
import { fetchRepos, setFavorite } from '../api.js';

export function useRepos(filter) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRepos(filter);
      setRepos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const toggleFavorite = useCallback(async (id, currentValue) => {
    const newValue = !currentValue;
    setRepos(prev =>
      prev.map(r => r.id === id ? { ...r, is_favorited: newValue ? 1 : 0 } : r)
    );
    try {
      await setFavorite(id, newValue);
    } catch {
      setRepos(prev =>
        prev.map(r => r.id === id ? { ...r, is_favorited: currentValue ? 1 : 0 } : r)
      );
    }
  }, []);

  return { repos, loading, error, reload: load, toggleFavorite };
}
