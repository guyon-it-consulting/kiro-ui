import { useState } from 'react';
import type { Msg } from './types';

export function MessageActions({ msg, idx, onRetry, onRewind, isLastUser, canRetry }: { msg: Msg; idx: number; onRetry: (i: number) => void; onRewind?: (i: number) => void; isLastUser?: boolean; canRetry?: boolean }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(msg.text);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="msg-actions">
      <button onClick={copy} title="Copy">{copied ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}</button>
      {msg.role === 'user' && isLastUser && canRetry && <button onClick={() => onRetry(idx)} title="Retry"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg></button>}
      {msg.role === 'user' && onRewind && <button onClick={() => onRewind(idx)} title="Rewind to here"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>}
    </div>
  );
}
