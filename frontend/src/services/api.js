const configuredOrigin = import.meta.env.VITE_API_BASE_URL
const origin = (configuredOrigin || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : window.location.origin)).replace(/\/+$/, '')
const baseUrl = `${origin}/api/v1`
const tokenKey = 'shiftly_access_token'
const businessKey = 'shiftly_business_id'

function validOrigin(value) {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.pathname === '/' && !parsed.search && !parsed.hash && !parsed.username && !parsed.password
  } catch { return false }
}

function queryString(filters = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null))
  return query.size ? `?${query}` : ''
}

function errorMessage(status, data) {
  if (typeof data?.detail === 'string') return data.detail
  if (Array.isArray(data?.detail)) return data.detail.map((item) => `${item.loc?.slice(1).join('.') || 'Field'}: ${item.msg}`).join('; ')
  return ({ 401: 'Please log in again.', 403: 'You do not have access to this action.', 404: 'This record was not found.', 409: 'This action conflicts with the current state.', 422: 'Please check the entered values.' })[status] || `Request failed (${status}). Please try again.`
}

export function getToken() {
  return sessionStorage.getItem(tokenKey)
}

export function saveToken(token) {
  sessionStorage.setItem(tokenKey, token)
  sessionStorage.removeItem(businessKey)
}

export function clearToken() {
  sessionStorage.removeItem(tokenKey)
  sessionStorage.removeItem(businessKey)
}

export function getBusinessId() {
  return Number(sessionStorage.getItem(businessKey)) || null
}

export function saveBusinessId(id) {
  sessionStorage.setItem(businessKey, String(id))
}

async function request(path, { method = 'GET', body, protectedRequest = false, token, responseType = 'json', accept } = {}) {
  if (!validOrigin(origin) || (import.meta.env.PROD && !origin.startsWith('https://'))) throw new Error('The Shiftly API origin is invalid.')
  const bearer = token || (protectedRequest ? getToken() : null)
  let response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: accept || (responseType === 'blob' ? 'application/octet-stream' : 'application/json'),
        ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(protectedRequest && getBusinessId() ? { 'X-Business-Id': String(getBusinessId()) } : {}),
      },
      ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
    })
  } catch {
    throw new Error('Cannot connect to the Shiftly server. Check your connection and try again.')
  }

  if (response.status === 401 && protectedRequest) {
    clearToken()
    window.dispatchEvent(new Event('shiftly:session-expired'))
  }
  const data = response.ok && responseType === 'blob' ? await response.blob() : await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(errorMessage(response.status, data))
  }
  return data
}

export const api = {
  registerWorker: ({ email, password, name }) => request('/auth/register/worker', { method: 'POST', body: { email, password, name } }),
  registerBusiness: ({ email, password, business_name }) => request('/auth/register/business', { method: 'POST', body: { email, password, business_name } }),
  login: ({ email, password }) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: (token) => request('/auth/me', { protectedRequest: true, token }),
  myBusinesses: () => request('/businesses/me', { protectedRequest: true }),
  createBusiness: (business_name) => request('/businesses', { method: 'POST', body: { business_name }, protectedRequest: true }),
  skills: () => request('/skills', { protectedRequest: true }),
  workerProfile: () => request('/workers/me', { protectedRequest: true }),
  updateWorkerProfile: (fields) => request('/workers/me', { method: 'PATCH', body: fields, protectedRequest: true }),
  addWorkerSkill: (skill_id) => request('/workers/me/skills', { method: 'POST', body: { skill_id }, protectedRequest: true }),
  removeWorkerSkill: (id) => request(`/workers/me/skills/${id}`, { method: 'DELETE', protectedRequest: true }),
  addAvailability: (fields) => request('/workers/me/availability', { method: 'POST', body: fields, protectedRequest: true }),
  updateAvailability: (id, fields) => request(`/workers/me/availability/${id}`, { method: 'PATCH', body: fields, protectedRequest: true }),
  removeAvailability: (id) => request(`/workers/me/availability/${id}`, { method: 'DELETE', protectedRequest: true }),
  shifts: (filters = {}) => {
    return request(`/shifts${queryString(filters)}`, { protectedRequest: true })
  },
  shift: (id) => request(`/shifts/${id}`, { protectedRequest: true }),
  businessShifts: () => request('/businesses/me/shifts', { protectedRequest: true }),
  createShift: (fields) => request('/shifts', { method: 'POST', body: fields, protectedRequest: true }),
  updateShift: (id, fields) => request(`/shifts/${id}`, { method: 'PATCH', body: fields, protectedRequest: true }),
  cancelShift: (id) => request(`/shifts/${id}`, { method: 'DELETE', protectedRequest: true }),
  apply: (shiftId) => request(`/shifts/${shiftId}/applications`, { method: 'POST', protectedRequest: true }),
  applicants: (shiftId) => request(`/shifts/${shiftId}/applications`, { protectedRequest: true }),
  myApplications: (filters = {}) => request(`/workers/me/applications${queryString(filters)}`, { protectedRequest: true }),
  acceptApplication: (id) => request(`/applications/${id}/accept`, { method: 'PATCH', protectedRequest: true }),
  rejectApplication: (id, reason) => request(`/applications/${id}/reject`, { method: 'PATCH', body: reason ? { reason } : {}, protectedRequest: true }),
  markAttendance: (id, status) => request(`/applications/${id}/attendance`, { method: 'PATCH', body: { status }, protectedRequest: true }),
  completeShift: (id) => request(`/shifts/${id}/complete`, { method: 'PATCH', protectedRequest: true }),
  importShifts: (file) => { const form = new FormData(); form.append('file', file); return request('/shifts/import', { method: 'POST', body: form, protectedRequest: true }) },
  report: (kind, filters) => request(`/reports/${kind}${queryString(filters)}`, { protectedRequest: true }),
  exportReport: (kind, filters, format = 'csv') => request(`/reports/${kind}/export${format === 'pdf' ? '/pdf' : ''}${queryString(filters)}`, { protectedRequest: true, responseType: 'blob', accept: format === 'pdf' ? 'application/pdf' : 'text/csv' }),
}
