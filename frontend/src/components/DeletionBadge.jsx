export function DeletionBadge({ daysUntilDeletion }) {
  if (daysUntilDeletion === null || daysUntilDeletion === undefined) return null;

  const urgent = daysUntilDeletion <= 2;
  const label = daysUntilDeletion === 0
    ? '今日删除'
    : `${daysUntilDeletion} 天后删除`;

  return (
    <span
      className="badge"
      style={urgent ? {
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        color: '#f87171',
      } : {
        background: 'rgba(251,191,36,0.06)',
        border: '1px solid rgba(251,191,36,0.18)',
        color: '#d97706',
      }}
    >
      ⏱ {label}
    </span>
  );
}
