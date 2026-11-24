import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); localStorage.clear(); });

it('uses the local API proxy by default', async () => {
  vi.stubEnv('VITE_API_URL', '');
  vi.resetModules();
  const fetch = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const { api } = await import('./client');
  await api.getNotes();
  expect(fetch).toHaveBeenCalledWith('/api/notes?', expect.any(Object));
});

it('honors a configured backend URL and removes trailing slashes', async () => {
  vi.stubEnv('VITE_API_URL', 'https://example.com/api/');
  vi.resetModules();
  const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const { api } = await import('./client');
  await api.me();
  expect(fetch).toHaveBeenCalledWith('https://example.com/api/auth/me', expect.any(Object));
});
