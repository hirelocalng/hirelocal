import { getToken } from './storage';

const BASE_URL = 'https://hirelocal.ng';

async function request(path, options = {}, withAuth = true) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (withAuth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    let data = {};

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      await response.text();
      data = {
        success: false,
        message: response.ok
          ? 'Unexpected server response.'
          : `Server error (${response.status}). Please try again.`,
      };
    }

    return { ok: response.ok, data };
  } catch {
    return {
      ok: false,
      data: { success: false, message: 'Unable to connect. Check your internet connection.' },
    };
  }
}

export const api = {
  search: (params = {}) => {
    const entries = Object.entries(params).filter(([, v]) => v && String(v).trim());
    const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    return request(`/api/search${qs ? `?${qs}` : ''}`, {}, false);
  },

  getProvider: (id) => request(`/api/provider/${id}`, {}, false),

  getMe: () => request('/api/me'),

  login: (payload) =>
    request('/api/login', { method: 'POST', body: JSON.stringify(payload) }, false),

  register: (payload) =>
    request('/api/register', { method: 'POST', body: JSON.stringify(payload) }, false),

  updateMe: (payload) =>
    request('/api/provider/me', { method: 'PUT', body: JSON.stringify(payload) }),

  submitReview: (payload) =>
    request('/api/review', { method: 'POST', body: JSON.stringify(payload) }, false),

  forgotPassword: (email) =>
    request('/api/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }, false),

  initializePayment: (redirect_url) =>
    request('/api/payment/initialize', {
      method: 'POST',
      body: JSON.stringify({ redirect_url }),
    }),

  registerPushToken: (token) =>
    request('/api/push-token', { method: 'POST', body: JSON.stringify({ token }) }),

  logProfileView: (provider_id) =>
    request('/api/profile-view', { method: 'POST', body: JSON.stringify({ provider_id }) }, false),

  logContact: (provider_id, method) =>
    request('/api/contact-event', { method: 'POST', body: JSON.stringify({ provider_id, method }) }, false),
};

export const formatLocation = (provider = {}) =>
  [provider.city, provider.lga, provider.state].filter(Boolean).join(', ');
