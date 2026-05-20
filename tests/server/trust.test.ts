import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadTrust, saveTrust, getTrustRules, setTrustRules, matchTrust } from '../../src/server/trust.js';

describe('Trust rules', () => {
  beforeEach(() => { setTrustRules({}); });

  it('reads and parses JSON from file', async () => {
    const mockRead = vi.fn().mockResolvedValue(JSON.stringify({ 'Read file': 'allow_always' }));
    await loadTrust('/home/.kiro-ui/trust.json', mockRead as any);
    expect(getTrustRules()).toEqual({ 'Read file': 'allow_always' });
  });

  it('returns empty object on missing file', async () => {
    const mockRead = vi.fn().mockRejectedValue(new Error('ENOENT'));
    await loadTrust('/home/.kiro-ui/trust.json', mockRead as any);
    expect(getTrustRules()).toEqual({});
  });

  it('returns empty object on invalid JSON', async () => {
    const mockRead = vi.fn().mockResolvedValue('not json');
    await loadTrust('/home/.kiro-ui/trust.json', mockRead as any);
    expect(getTrustRules()).toEqual({});
  });

  it('creates directory and writes JSON', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockWrite = vi.fn().mockResolvedValue(undefined);
    setTrustRules({ 'Write file': 'reject_always' });
    await saveTrust('/home/.kiro-ui/trust.json', mockMkdir as any, mockWrite as any);
    expect(mockMkdir).toHaveBeenCalledWith('/home/.kiro-ui', { recursive: true });
    expect(mockWrite).toHaveBeenCalledWith('/home/.kiro-ui/trust.json', JSON.stringify({ 'Write file': 'reject_always' }, null, 2));
  });

  it('matches allow_always rule', () => {
    setTrustRules({ 'Read src/app.ts': 'allow_always' });
    expect(matchTrust('Read src/app.ts')).toBe('allow_always');
  });

  it('matches reject_always rule', () => {
    setTrustRules({ 'Delete file': 'reject_always' });
    expect(matchTrust('Delete file')).toBe('reject_always');
  });

  it('returns null for unknown title', () => {
    setTrustRules({ 'Read file': 'allow_always' });
    expect(matchTrust('Write file')).toBeNull();
  });
});
