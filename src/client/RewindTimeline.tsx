import { useState } from 'react';
import type { Msg } from './types';

interface Props {
  messages: Msg[];
  onRewind: (turnIndex: number) => void;
  onClose: () => void;
}

export interface TurnSummary {
  tools: number;
  files: string[];
  commands: number;
}

export function getTurnSummary(messages: Msg[], turnIdx: number, nextTurnIdx: number | undefined): TurnSummary {
  const slice = messages.slice(turnIdx + 1, nextTurnIdx);
  const toolMsgs = slice.filter(m => m.role === 'tool' && m.tool);
  const files = new Set<string>();
  let commands = 0;

  for (const m of toolMsgs) {
    const t = m.tool!;
    // Extract files from tool content paths
    if (t.content) {
      for (const c of t.content) {
        if (c.path) files.add(c.path.split('/').pop() || c.path);
      }
    }
    // Extract file from title if it looks like a path
    if (t.title) {
      const pathMatch = t.title.match(/(?:^|\s)((?:\/|\.\/|~\/)\S+)/);
      if (pathMatch) files.add(pathMatch[1].split('/').pop() || pathMatch[1]);
    }
    // Detect commands
    if (t.kind === 'shell' || /^(bash|shell|Execute|Run|npm|npx|git|cd )/i.test(t.title || '')) {
      commands++;
    }
  }

  return { tools: toolMsgs.length, files: [...files], commands };
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
            const turnPos = userTurns.findIndex(t => t.idx === idx);
            const nextIdx = turnPos < userTurns.length - 1 ? userTurns[turnPos + 1].idx : undefined;
            const summary = getTurnSummary(messages, idx, nextIdx);
            const hasEnrichment = summary.tools > 0;
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
                  {hasEnrichment && <span className="rewind-turn-summary">
                    {summary.tools} {summary.tools === 1 ? 'tool' : 'tools'}
                    {summary.files.length > 0 && <> · {summary.files.length} {summary.files.length === 1 ? 'file' : 'files'}<span className="rewind-files"> ({summary.files.slice(0, 3).join(', ')}{summary.files.length > 3 ? `, +${summary.files.length - 3}` : ''})</span></>}
                    {summary.commands > 0 && <> · {summary.commands} {summary.commands === 1 ? 'command' : 'commands'}</>}
                  </span>}
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
