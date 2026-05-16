const API_BASE = 'https://ai-notes-production.up.railway.app';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const msg = Array.isArray(detail)
      ? detail.map((d) => d.msg).join(', ')
      : detail || data.message || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),

  getNotes: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    return request(`/notes?${qs}`);
  },
  getNote: (id) => request(`/notes/${id}`),
  createNote: (body) => request('/notes', { method: 'POST', body: JSON.stringify(body) }),
  updateNote: (id, body) => request(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
  generateSummary: (id) => request(`/notes/${id}/generate-summary`, { method: 'POST' }),
  shareNote: (id) => request(`/notes/${id}/share`, { method: 'POST' }),
  unshareNote: (id) => request(`/notes/${id}/unshare`, { method: 'POST' }),
  getInsights: () => request('/notes/insights'),
  getSharedNote: (shareId) => request(`/shared/${shareId}`),
};
