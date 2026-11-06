import { useState, useEffect } from 'react';
import { FilterBar } from './components/FilterBar.jsx';
import { RepoCard } from './components/RepoCard.jsx';
import { useRepos } from './hooks/useRepos.js';
import { fetchStats, triggerScrape } from './api.js';

export default function App() {
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState(null);
  const [scraping, setScraping] = useState(false);
  const { repos, loading, error, reload, toggleFavorite } = useRepos(filter);

  const loadStats = async () => {
    try {
      const s = await fetchStats();
      setStats(s);
    } catch {}
  };

  useEffect(() => { loadStats(); }, [repos]);

  const handleToggleFavorite = async (id, current) => {
    await toggleFavorite(id, current);
    loadStats();
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      await triggerScrape();
      await reload();
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #00e5a0 0%, transparent 70%)' }} />
        <div className="absolute top-[30%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.025]"
          style={{ background: 'radial-gradient(circle, #4f8ef7 0%, transparent 70%)' }} />
      </div>

      <header className="sticky top-0 z-20 backdrop-blur-xl" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(6,8,16,0.85)' }}>
        <div className="max-w-5xl mx-auto px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(0,229,160,0.15), rgba(0,229,160,0.04))', border: '1px solid rgba(0,229,160,0.2)' }}>
              <svg width="20" height="20" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="6" r="3.5" stroke="#4ade80" strokeWidth="1.4" />
                <circle cx="7" cy="24" r="3.5" stroke="#4ade80" strokeWidth="1.4" />
                <circle cx="29" cy="24" r="3.5" stroke="#4ade80" strokeWidth="1.4" />
                <path d="M18 9.5v6M18 15.5l-7.5 5M18 15.5l7.5 5" stroke="#4ade80" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M24 20l4 3" stroke="#4ade80" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M12 20l-4 3" stroke="#4ade80" strokeWidth="1.3" strokeLinecap="round" />
                <polyline points="6,31 10,27 14,29 20,23 26,26 30,21" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>
                github<span style={{ color: 'var(--accent)' }}>.</span>趋势
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>每日 Top 10 · 自动更新</p>
            </div>
          </div>
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="btn disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: scraping ? 'transparent' : 'var(--accent-dim)',
              borderColor: 'var(--accent-border)',
              color: scraping ? 'var(--text-2)' : 'var(--accent)',
            }}
          >
            <span className={scraping ? 'animate-spin' : ''} style={{ display: 'inline-block' }}>↻</span>
            {scraping ? 'scraping…' : '刷新'}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-7">
        <div className="mb-7">
          <FilterBar active={filter} onChange={setFilter} stats={stats} />
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: 'var(--accent)', animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>正在获取项目…</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-2xl">⚠</span>
            <p className="text-sm" style={{ color: '#f87171' }}>加载失败：{error}</p>
            <button onClick={reload} className="text-xs" style={{ color: 'var(--accent)' }}>重试 →</button>
          </div>
        )}

        {!loading && !error && repos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-3xl opacity-30">{filter === 'favorites' ? '☆' : '⊙'}</span>
            <p className="text-sm text-center max-w-xs" style={{ color: 'var(--text-3)' }}>
              {filter === 'favorites'
                ? '还没有收藏的项目，点击星标收藏吧'
                : '暂无数据，点击刷新抓取今日趋势'}
            </p>
          </div>
        )}

        {!loading && !error && repos.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {repos.map(repo => (
              <RepoCard
                key={repo.id}
                repo={repo}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
