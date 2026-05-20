import { matchTrust } from './trust.js';

export type PermPolicy = 'ask' | 'allow-all' | 'approve-reads';

export function resolvePermission(
  title: string,
  kind: string | undefined,
  options: { optionId: string; kind: string }[],
  permPolicy: PermPolicy,
): { outcome: { outcome: string; optionId: string } } | null {
  const allowOpt = options.find(o => o.kind === 'allow_once' || o.kind === 'allow_always');
  const rejectOpt = options.find(o => o.kind === 'reject_once' || o.kind === 'reject_always');

  // Trust store takes priority
  const trust = matchTrust(title);
  if (trust === 'allow_always' && allowOpt) return { outcome: { outcome: 'selected', optionId: allowOpt.optionId } };
  if (trust === 'reject_always' && rejectOpt) return { outcome: { outcome: 'selected', optionId: rejectOpt.optionId } };

  // Policy
  if (permPolicy === 'allow-all' && allowOpt) return { outcome: { outcome: 'selected', optionId: allowOpt.optionId } };
  if (permPolicy === 'approve-reads' && kind === 'read' && allowOpt) return { outcome: { outcome: 'selected', optionId: allowOpt.optionId } };

  return null; // Must ask user
}
