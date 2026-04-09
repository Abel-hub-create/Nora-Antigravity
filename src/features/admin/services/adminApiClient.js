const BASE = `${import.meta.env.VITE_API_URL || '/api'}/admin`;

let isRefreshing = false;

async function request(method, path, body) {
  const token = localStorage.getItem('adminAccessToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  // Try to refresh on 401
  if (res.status === 401 && !isRefreshing && path !== '/auth/login' && path !== '/auth/refresh') {
    isRefreshing = true;
    try {
      const refresh = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (refresh.ok) {
        const data = await refresh.json();
        localStorage.setItem('adminAccessToken', data.adminAccessToken);
        isRefreshing = false;
        // Retry original request
        const retryHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.adminAccessToken}` };
        const retryRes = await fetch(`${BASE}${path}`, {
          method, headers: retryHeaders, credentials: 'include',
          body: body !== undefined ? JSON.stringify(body) : undefined
        });
        if (!retryRes.ok) throw await extractError(retryRes);
        return retryRes.status === 204 ? null : retryRes.json();
      }
    } catch { /* fall through */ }
    isRefreshing = false;
    localStorage.removeItem('adminAccessToken');
    window.location.href = '/admin/login';
    throw new Error('Session expired');
  }

  if (!res.ok) throw await extractError(res);
  return res.status === 204 ? null : res.json();
}

async function extractError(res) {
  try {
    const data = await res.json();
    return new Error(data.error || 'Request failed');
  } catch {
    return new Error(`HTTP ${res.status}`);
  }
}

export const adminApi = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
