import { useState } from 'react';

export function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);

  if (!code) return null;

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-3 py-2"
        style={{ background: 'var(--surface-3)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#ff5f57' }} />
          <span className="w-2 h-2 rounded-full" style={{ background: '#febc2e' }} />
          <span className="w-2 h-2 rounded-full" style={{ background: '#28c840' }} />
          <span className="text-xs ml-2 font-medium" style={{ color: 'var(--text-3)' }}>安装命令</span>
        </div>
        <button
          onClick={copy}
          className="text-xs font-medium transition-colors duration-150 px-2 py-0.5 rounded"
          style={copied ? {
            color: 'var(--accent)',
            background: 'var(--accent-dim)',
          } : {
            color: 'var(--text-3)',
          }}
          onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'var(--text-1)'; }}
          onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          {copied ? '✓ 已复制' : '复制'}
        </button>
      </div>
      <pre className="p-4 text-xs overflow-x-auto leading-relaxed" style={{ background: '#070b12', color: '#00e5a0', fontFamily: 'inherit' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
