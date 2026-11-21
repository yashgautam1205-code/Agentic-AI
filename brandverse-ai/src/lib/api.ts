const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = (
  configuredApiUrl
    ? configuredApiUrl
    : import.meta.env.DEV
      ? 'http://127.0.0.1:8000'
      : ''
).replace(/\/$/, '');

export const API_BASE_URL_EFFECTIVE = API_BASE_URL;

export function getAccessToken(): string | null {
  return localStorage.getItem('brandverse_access_token');
}

export function setAccessToken(token: string): void {
  localStorage.setItem('brandverse_access_token', token);
}

export function clearAccessToken(): void {
  localStorage.removeItem('brandverse_access_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail = typeof payload === 'object' && payload && 'detail' in payload
      ? String((payload as { detail: unknown }).detail)
      : `Request failed (${response.status})`;
    throw new Error(detail);
  }
  return payload as T;
}

async function downloadFile(path: string): Promise<Blob> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const payload: unknown = await response.json();
      if (typeof payload === 'object' && payload && 'detail' in payload) {
        detail = String((payload as { detail: unknown }).detail);
      }
    } catch {
      // Keep the HTTP status when the server does not return JSON.
    }
    throw new Error(detail);
  }
  return response.blob();
}

export const api = {
  register: (email: string, password: string, full_name: string, handle?: string) =>
    request<{ access_token: string; token_type: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, handle }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request<unknown>('/api/auth/me'),
  listMedia: () => request<unknown[]>('/api/media/list'),
  listClips: () => request<unknown[]>('/api/clips/list'),
  toggleClip: (id: string) => request<unknown>(`/api/clips/${id}/toggle-select`, { method: 'POST' }),
  updateClipTimestamps: (id: string, start_time: number, end_time: number) =>
    request<unknown>(`/api/clips/${id}/timestamps`, {
      method: 'PUT',
      body: JSON.stringify({ start_time, end_time }),
    }),
  regenerateClips: (mediaId: string) => request<unknown>(`/api/clips/regenerate/${mediaId}`, { method: 'POST' }),
  listMemoryRules: () => request<unknown[]>('/api/memory/rules'),
  getMemoryProfile: () => request<unknown>('/api/memory/profile'),
  updateMemoryProfile: (body: object) => request<unknown>('/api/memory/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
  teachMemory: (body: object) => request<unknown>('/api/memory/teach', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  simulateTwin: (body: object) => request<unknown>('/api/memory/simulate-twin', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  getCalendar: () => request<unknown[]>('/api/calendar/posts'),
  createCalendarPost: (body: object) => request<unknown>('/api/calendar/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  updateCalendarPost: (id: string, body: object) => request<unknown>(`/api/calendar/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
  deleteCalendarPost: (id: string) => request<unknown>(`/api/calendar/posts/${id}`, { method: 'DELETE' }),
  approveCalendarPost: (id: string) => request<unknown>(`/api/calendar/posts/${id}/approve`, { method: 'POST' }),
  reviewCalendarPost: (id: string, comment: string) => request<unknown>(
    `/api/calendar/posts/${id}/comment?comment=${encodeURIComponent(comment)}`,
    { method: 'POST' },
  ),
  getAnalytics: () => request<unknown>('/api/analytics/overview'),
  getLibrary: (search = '') => request<unknown>(`/api/library/overview${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getIntegrations: () => request<unknown[]>('/api/integrations/list'),
  generateContent: (body: object) => request<unknown>('/api/content/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  saveDraft: (body: object) => request<unknown>('/api/content/save-draft', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  trimMedia: (body: object) => request<{download_url: string; success: boolean}>('/api/editor/trim', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  detectSilences: (body: object) => request<{detected_pauses_count: number; total_seconds_savable: number; pauses: unknown[]}>('/api/editor/silence-detect', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  generateThumbnail: (body: object) => request<{download_url: string}>('/api/editor/thumbnail', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  downloadFile,
  uploadMedia: (
    file: File,
    language: string,
    onProgress: (percent: number) => void,
  ) => new Promise<unknown>((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('language', language);
    form.append('title', file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/media/upload`);
    const token = getAccessToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;
      let payload: unknown = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = xhr.responseText;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
      else {
        const detail = typeof payload === 'object' && payload && 'detail' in payload
          ? String((payload as { detail: unknown }).detail)
          : `Upload failed (${xhr.status})`;
        reject(new Error(detail));
      }
    };
    xhr.send(form);
  }),
};
