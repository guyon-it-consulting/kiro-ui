import { describe, it, expect, beforeEach } from 'vitest';
import { resolvePermission } from '../../src/server/permissions.js';
import { setTrustRules } from '../../src/server/trust.js';

const baseOptions = [{ optionId: 'opt-allow', kind: 'allow_once' }, { optionId: 'opt-reject', kind: 'reject_once' }];
const alwaysOptions = [{ optionId: 'opt-allow-always', kind: 'allow_always' }, { optionId: 'opt-reject-always', kind: 'reject_always' }];

describe('Permission policy', () => {
  beforeEach(() => { setTrustRules({}); });

  it('policy "ask" returns null (must ask user)', () => {
    expect(resolvePermission('Write', 'write', baseOptions, 'ask')).toBeNull();
  });

  it('policy "allow-all" auto-approves', () => {
    expect(resolvePermission('Write', 'write', baseOptions, 'allow-all')).toEqual({ outcome: { outcome: 'selected', optionId: 'opt-allow' } });
  });

  it('policy "approve-reads" auto-approves reads', () => {
    expect(resolvePermission('Read', 'read', baseOptions, 'approve-reads')).toEqual({ outcome: { outcome: 'selected', optionId: 'opt-allow' } });
  });

  it('policy "approve-reads" returns null for writes', () => {
    expect(resolvePermission('Write', 'write', baseOptions, 'approve-reads')).toBeNull();
  });

  it('trust allow_always overrides ask', () => {
    setTrustRules({ 'Write': 'allow_always' });
    expect(resolvePermission('Write', 'write', alwaysOptions, 'ask')).toEqual({ outcome: { outcome: 'selected', optionId: 'opt-allow-always' } });
  });

  it('trust reject_always overrides allow-all', () => {
    setTrustRules({ 'Delete': 'reject_always' });
    expect(resolvePermission('Delete', 'write', alwaysOptions, 'allow-all')).toEqual({ outcome: { outcome: 'selected', optionId: 'opt-reject-always' } });
  });
});
