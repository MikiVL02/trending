import { useState } from 'react';

export function FeaturesPanel({ summary }) {
  const [expanded, setExpanded] = useState(false);

  if (!summary) return null;

  const isLong = summary.length > 150;
  const displayed = !isLong || expanded ? summary : summary.slice(0, 150) + '…';

  return (
    <div className="pl-3 py-1" style={{ borderLeft: '2px solid rgba(0,229,160,0.2)' }}>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{displayed}</p>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs mt-1 font-medium transition-colors duration-150"
          style={{ color: 'var(--accent)', opacity: 0.7 }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
        >
          {expanded ? '↑ 收起' : '↓ 展开'}
        </button>
      )}
    </div>
  );
}
