import { test, expect } from '@playwright/test';

test.describe('Security', () => {
  test('API rejects requests without auth token', async ({ request }) => {
    const res = await request.get('/api/settings');
    expect(res.status()).toBe(401);
  });

  test('API accepts requests with valid token', async ({ request }) => {
    // First get the token
    const tokenRes = await request.get('/api/token');
    expect(tokenRes.status()).toBe(200);
    const { token } = await tokenRes.json();
    expect(token).toBeTruthy();

    // Use it
    const res = await request.get('/api/settings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
  });

  test('API rejects invalid token', async ({ request }) => {
    const res = await request.get('/api/settings', {
      headers: { Authorization: 'Bearer invalid-token-here' }
    });
    expect(res.status()).toBe(401);
  });

  test('WebSocket rejects connection without token', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const ws = new WebSocket('ws://127.0.0.1:3000');
        ws.onopen = () => { ws.close(); resolve('connected'); };
        ws.onclose = () => resolve('rejected');
        ws.onerror = () => resolve('rejected');
        setTimeout(() => resolve('timeout'), 3000);
      });
    });
    expect(result).toBe('rejected');
  });

  test('WebSocket rejects connection with invalid token', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const ws = new WebSocket('ws://127.0.0.1:3000?token=bad-token');
        ws.onopen = () => { ws.close(); resolve('connected'); };
        ws.onclose = () => resolve('rejected');
        ws.onerror = () => resolve('rejected');
        setTimeout(() => resolve('timeout'), 3000);
      });
    });
    expect(result).toBe('rejected');
  });

  test('CSP header blocks inline scripts', async ({ request }) => {
    const res = await request.get('/');
    const csp = res.headers()['content-security-policy'];
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  test('pick-folder rejects path with special characters', async ({ request }) => {
    const tokenRes = await request.get('/api/token');
    const { token } = await tokenRes.json();

    const res = await request.post('/api/pick-folder', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { startPath: '"; rm -rf /' }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.path).toBeNull();
  });
});
