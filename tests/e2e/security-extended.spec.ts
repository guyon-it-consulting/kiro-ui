import { test, expect } from '@playwright/test';

test.describe('Security & Resilience (Extended)', () => {
  const getToken = async (request: any) => {
    const res = await request.get('/api/token');
    return (await res.json()).token;
  };

  test('all API endpoints return 401 without token', async ({ request }) => {
    const endpoints = [
      { method: 'get', path: '/api/settings' },
      { method: 'put', path: '/api/settings' },
      { method: 'get', path: '/api/trust' },
      { method: 'put', path: '/api/trust' },
      { method: 'post', path: '/api/pick-folder' },
    ];
    for (const { method, path } of endpoints) {
      const res = await (request as any)[method](path);
      expect(res.status(), `${method} ${path}`).toBe(401);
    }
  });

  test('various invalid tokens are rejected', async ({ request }) => {
    for (const token of ['expired', '', '0'.repeat(64), 'null', 'undefined']) {
      const res = await request.get('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(401);
    }
  });

  test('valid token grants access to all endpoints', async ({ request }) => {
    const token = await getToken(request);
    const opts = { headers: { Authorization: `Bearer ${token}` } };
    expect((await request.get('/api/settings', opts)).status()).toBe(200);
    expect((await request.get('/api/trust', opts)).status()).toBe(200);
  });

  test('CSP blocks inline scripts', async ({ request }) => {
    const res = await request.get('/');
    const csp = res.headers()['content-security-policy'];
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  test('XSS via script tags sanitized', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill('<script>document.title="hacked"</script>');
    await page.locator('textarea').press('Enter');
    await page.waitForTimeout(500);
    expect(await page.title()).not.toBe('hacked');
  });

  test('XSS via event handlers sanitized in rendered content', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill('<div onmouseover="alert(1)">hover</div>');
    await page.locator('textarea').press('Enter');
    await page.waitForTimeout(300);
    // User messages are plain text, so no HTML rendered - verify no onerror/onload in DOM
    const dangerous = await page.locator('[onmouseover], [onload], [onerror]').count();
    expect(dangerous).toBe(0);
  });

  test('XSS via javascript: URLs sanitized', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill('[click](javascript:alert(1))');
    await page.locator('textarea').press('Enter');
    await page.waitForTimeout(300);
    expect(await page.locator('a[href^="javascript"]').count()).toBe(0);
  });

  test('path traversal in pick-folder rejected', async ({ request }) => {
    const token = await getToken(request);
    const opts = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
    const attacks = ['../../../etc/passwd', '"; rm -rf /', '/tmp/$(whoami)', '/tmp/`id`'];
    for (const startPath of attacks) {
      const res = await request.post('/api/pick-folder', { ...opts, data: { startPath } });
      const body = await res.json();
      expect(body.path, `attack: ${startPath}`).toBeNull();
    }
  });

  test('SQL-injection strings in settings do not crash', async ({ request }) => {
    const token = await getToken(request);
    const opts = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
    const injections = ["'; DROP TABLE users; --", '{"$gt": ""}', "1 OR 1=1"];
    for (const v of injections) {
      const res = await request.put('/api/settings', { ...opts, data: { workspace: v } });
      expect(res.status()).toBeLessThan(500);
    }
    // Restore workspace to prevent polluting settings
    await request.put('/api/settings', { ...opts, data: { workspace: '' } });
  });

  test('large payload does not crash server', async ({ request }) => {
    const token = await getToken(request);
    const res = await request.put('/api/settings', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { workspace: 'x'.repeat(1024 * 100) },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('concurrent WebSocket connections work', async ({ page }) => {
    await page.goto('/');
    const token = await page.evaluate(async () => (await (await fetch('/api/token')).json()).token);
    const results = await page.evaluate(async (t) => {
      const connect = () => new Promise<string>((resolve) => {
        const ws = new WebSocket(`ws://127.0.0.1:3000?token=${t}`);
        ws.onopen = () => { ws.close(); resolve('ok'); };
        ws.onclose = () => resolve('closed');
        ws.onerror = () => resolve('error');
        setTimeout(() => resolve('timeout'), 5000);
      });
      return Promise.all([connect(), connect(), connect()]);
    }, token);
    expect(results.every((r: string) => r === 'ok')).toBe(true);
  });
});
