/** Authenticated fetch wrapper — injects the startup auth token */
let _token: string | null = null;

export async function initToken() {
  if (_token) return _token;
  try {
    const res = await fetch('/api/token');
    const data = await res.json();
    _token = data.token;
  } catch { /* will retry on next call */ }
  return _token;
}

export function getToken() { return _token || ''; }

export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${getToken()}`);
  return fetch(url, { ...init, headers });
}
