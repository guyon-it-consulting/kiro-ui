import { useState } from 'react';
import type { Msg } from './types';

interface Props {
  messages: Msg[];
  onRewind: (turnIndex: number) => void;
  onClose: () => void;
}

export function RewindTimeline({ messages, onRewind, onClose }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const userTurns = messages
    .map((m, i) => ({ msg: m, idx: i }))
    .filter(({ msg }) => msg.role === 'user' || msg.role === 'user-stream');

  // Exclude turn 1 (can't rewind to the very beginning — use "new chat" instead)
  const rewindableTurns = userTurns.slice(1).reverse();

  if (rewindableTurns.length < 1) return null;

  return (
    <div className="rewind-overlay" onClick={onClose}>
      <div className="rewind-timeline" onClick={e => e.stopPropagation()}>
        <div className="rewind-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Rewind to turn</span>
          <button className="rewind-close" onClick={onClose}>✕</button>
        </div>
        <div className="rewind-turns">
          {rewindableTurns.map(({ msg, idx }, i) => {
            const turnNum = userTurns.findIndex(t => t.idx === idx) + 1;
            return (
              <div
                key={idx}
                className={`rewind-turn ${hoveredIdx === i ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onRewind(idx)}
              >
                <div className="rewind-dot-col">
                  <div className="rewind-dot" />
                  {i < rewindableTurns.length - 1 && <div className="rewind-line" />}
                </div>
                <div className="rewind-turn-content">
                  <span className="rewind-turn-num">Turn {turnNum}</span>
                  <span className="rewind-turn-text">{msg.text.slice(0, 80)}{msg.text.length > 80 ? '…' : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="rewind-hint">Click a turn to rewind. A new session will branch from that point.</div>
      </div>
    </div>
  );
}
