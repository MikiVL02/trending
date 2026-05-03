export function FilterBar({ active, onChange, stats }) {
  const tabs = [
    { key: 'all', label: '全部项目', icon: '⊞' },
    { key: 'today', label: '今日趋势', icon: '▲' },
    { key: 'favorites', label: '已收藏', icon: '★' },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className="tab flex items-center gap-1.5"
            style={active === tab.key ? {
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent)',
            } : {
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--text-2)',
            }}
          >
            <span className="text-xs opacity-70">{tab.icon}</span>
            {tab.label}
            {tab.key === 'favorites' && stats?.favorited > 0 && (
              <span className="text-xs px-1.5 py-0 rounded-md font-bold"
                style={{ background: 'rgba(0,229,160,0.15)', color: 'var(--accent)' }}>
                {stats.favorited}
              </span>
            )}
          </button>
        ))}
      </div>
      {stats?.pendingDeletion > 0 && (
        <span className="text-xs px-2 py-1 rounded-lg"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
          ⚠ {stats.pendingDeletion} 个即将过期
        </span>
      )}
    </div>
  );
}
