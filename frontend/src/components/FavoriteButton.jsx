export function FavoriteButton({ isFavorited, onClick }) {
  return (
    <button
      onClick={onClick}
      title={isFavorited ? '取消收藏' : '收藏此项目'}
      className="btn flex-shrink-0 transition-all duration-200"
      style={isFavorited ? {
        background: 'rgba(0,229,160,0.08)',
        borderColor: 'rgba(0,229,160,0.3)',
        color: 'var(--accent)',
      } : {
        background: 'var(--surface-3)',
        borderColor: 'var(--border)',
        color: 'var(--text-2)',
      }}
      onMouseEnter={e => {
        if (!isFavorited) {
          e.currentTarget.style.borderColor = 'rgba(0,229,160,0.25)';
          e.currentTarget.style.color = 'var(--accent)';
        }
      }}
      onMouseLeave={e => {
        if (!isFavorited) {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.color = 'var(--text-2)';
        }
      }}
    >
      <span>{isFavorited ? '★' : '☆'}</span>
      {isFavorited ? '已收藏' : '收藏'}
    </button>
  );
}
