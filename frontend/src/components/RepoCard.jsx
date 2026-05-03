import { FavoriteButton } from './FavoriteButton.jsx';
import { DeletionBadge } from './DeletionBadge.jsx';
import { CodeBlock } from './CodeBlock.jsx';
import { FeaturesPanel } from './FeaturesPanel.jsx';

const LANG_COLORS = {
  JavaScript: '#f0db4f',
  TypeScript: '#3178c6',
  Python: '#3572a5',
  Go: '#00acd7',
  Rust: '#dea584',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  Swift: '#f05138',
  Kotlin: '#a97bff',
  PHP: '#4f5d95',
  Shell: '#89e051',
  Nix: '#7e7eff',
};

function formatStars(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

export function RepoCard({ repo, onToggleFavorite }) {
  const langColor = LANG_COLORS[repo.language] || '#4a5568';

  return (
    <div className="card group">
      {/* Top row: avatar + name + favorite */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {repo.avatar_url ? (
            <img
              src={repo.avatar_url}
              alt={repo.owner}
              className="w-10 h-10 rounded-xl flex-shrink-0 ring-1"
              style={{ ringColor: 'var(--border)' }}
            />
          ) : (
            <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
              ⬡
            </div>
          )}
          <div className="min-w-0 flex-1">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-sm tracking-tight block truncate transition-colors duration-150"
              style={{ color: 'var(--text-1)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-1)'}
            >
              <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>{repo.owner}</span>
              <span style={{ color: 'var(--text-3)' }}>/</span>
              <span>{repo.name}</span>
            </a>
            {repo.description && (
              <p className="text-xs mt-0.5 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                {repo.description}
              </p>
            )}
          </div>
        </div>
        <FavoriteButton
          isFavorited={!!repo.is_favorited}
          onClick={() => onToggleFavorite(repo.id, !!repo.is_favorited)}
        />
      </div>

      {/* Meta row: language + stars + badges */}
      <div className="flex items-center gap-3 flex-wrap" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        {repo.language && (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: langColor, boxShadow: `0 0 6px ${langColor}66` }} />
            {repo.language}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-2)' }}>
          <span style={{ color: '#fbbf24' }}>★</span>
          <span className="font-medium">{formatStars(repo.stars)}</span>
        </span>
        {!repo.is_favorited && (
          <DeletionBadge daysUntilDeletion={repo.days_until_deletion} />
        )}
        {!!repo.is_favorited && (
          <span className="badge" style={{ background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', color: 'var(--accent)' }}>
            ★ 已收藏
          </span>
        )}
      </div>

      <FeaturesPanel summary={repo.features_summary} />
      <CodeBlock code={repo.install_code} />

      {/* 项目地址 */}
      <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>项目地址</span>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium transition-colors duration-150"
          style={{ color: 'var(--text-2)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}
        >
          <span style={{ opacity: 0.5 }}>github.com/</span>
          <span>{repo.full_name}</span>
          <span style={{ fontSize: '10px' }}>↗</span>
        </a>
      </div>
    </div>
  );
}
