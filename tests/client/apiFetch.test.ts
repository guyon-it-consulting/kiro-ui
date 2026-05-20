import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getToken returns empty string initially', async () => {
    const { getToken } = await import('../../src/client/apiFetch');
    expect(getToken()).toBe('');
  });

  it('initToken fetches token from /api/token', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ token: 'abc' }) });
    const { initToken, getToken } = await import('../../src/client/apiFetch');
    await initToken();
    expect(getToken()).toBe('abc');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/token');
  });

  it('initToken caches and does not refetch', async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(() => { calls++; return Promise.resolve({ json: () => Promise.resolve({ token: 'cached' }) }); }) as any;
    const { initToken } = await import('../../src/client/apiFetch');
    await initToken();
    await initToken();
    expect(calls).toBe(1);
  });

  it('initToken returns null on failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));
    const { initToken } = await import('../../src/client/apiFetch');
    const result = await initToken();
    expect(result).toBeNull();
  });

  it('apiFetch sets Authorization header', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ token: 'tok' }) });
    const { initToken, apiFetch } = await import('../../src/client/apiFetch');
    await initToken();
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}'));
    await apiFetch('/api/test', { method: 'GET' });
    const [url, opts] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toBe('/api/test');
    expect((opts.headers as Headers).get('Authorization')).toBe('Bearer tok');
  });
});
