const origin = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const baseUrl = `${origin}/api/v1`
const tokenKey = 'kaantha_access_token'

export function getToken() {
  return sessionStorage.getItem(tokenKey)
}

export function saveToken(token) {
  sessionStorage.setItem(tokenKey, token)
}

export function clearToken() {
  sessionStorage.removeItem(tokenKey)
}

async function request(path, { method = 'GET', body, protectedRequest = false, token } = {}) {
  const bearer = token || (protectedRequest ? getToken() : null)
  let response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new Error('Cannot connect to the KAANTHA server. Check your connection and try again.')
  }

  if (response.status === 401 && protectedRequest) {
    clearToken()
    window.dispatchEvent(new Event('kaantha:session-expired'))
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : null
    throw new Error(detail || (response.status === 401 ? 'Invalid email or password.' : `Request failed (${response.status}). Please try again.`))
  }
  return data
}

export const api = {
  registerWorker: ({ email, password, name }) => request('/auth/register/worker', { method: 'POST', body: { email, password, name } }),
  registerBusiness: ({ email, password, business_name }) => request('/auth/register/business', { method: 'POST', body: { email, password, business_name } }),
  login: ({ email, password }) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: (token) => request('/auth/me', { protectedRequest: true, token }),
  skills: () => request('/skills', { protectedRequest: true }),
  workerProfile: () => request('/workers/me', { protectedRequest: true }),
  addWorkerSkill: (skill_id) => request('/workers/me/skills', { method: 'POST', body: { skill_id }, protectedRequest: true }),
  shifts: (filters = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null))
    return request(`/shifts${query.size ? `?${query}` : ''}`, { protectedRequest: true })
  },
  shift: (id) => request(`/shifts/${id}`, { protectedRequest: true }),
  businessShifts: () => request('/businesses/me/shifts', { protectedRequest: true }),
  createShift: (fields) => request('/shifts', { method: 'POST', body: fields, protectedRequest: true }),
  updateShift: (id, fields) => request(`/shifts/${id}`, { method: 'PATCH', body: fields, protectedRequest: true }),
  cancelShift: (id) => request(`/shifts/${id}`, { method: 'DELETE', protectedRequest: true }),
  apply: (shiftId) => request(`/shifts/${shiftId}/applications`, { method: 'POST', protectedRequest: true }),
  applicants: (shiftId) => request(`/shifts/${shiftId}/applications`, { protectedRequest: true }),
  myApplications: () => request('/workers/me/applications', { protectedRequest: true }),
  acceptApplication: (id) => request(`/applications/${id}/accept`, { method: 'PATCH', protectedRequest: true }),
  rejectApplication: (id, reason) => request(`/applications/${id}/reject`, { method: 'PATCH', body: reason ? { reason } : {}, protectedRequest: true }),
}
