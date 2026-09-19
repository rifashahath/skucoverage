import { supabase } from './supabase'

// The production Worker is isolated from the static Pages site. Local development
// can override this with VITE_API_BASE_URL=http://127.0.0.1:8787.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.skucoverage.com').replace(/\/$/, '')

async function request(path, options = {}) {
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  if (!session?.access_token) throw new Error('Please sign in to continue.')
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}`, ...(options.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.')
  return body
}

export const api = {
  createAudit: (storeUrl) => request('/api/audit/free', { method: 'POST', body: JSON.stringify({ storeUrl }) }),
  subscribe: (priceId) => request('/api/subscribe', { method: 'POST', body: JSON.stringify({ priceId }) }),
  getAudit: (auditId) => request(`/api/audit/${encodeURIComponent(auditId)}`),
  listAudits: () => request('/api/audits'),
  me: () => request('/api/me'),
  updateMe: (storeUrl) => request('/api/me', { method: 'PATCH', body: JSON.stringify({ storeUrl }) }),
  async downloadCsv(url) {
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch(`${API_BASE}${url}`, { headers: { authorization: `Bearer ${session.access_token}` } })
    if (!response.ok) throw new Error('The report export is no longer available.')
    return response.blob()
  },
}

async function anonymousRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.')
  return body
}

api.anonymousAudit = (storeUrl) => anonymousRequest('/api/audit/anonymous', { method: 'POST', body: JSON.stringify({ storeUrl }) })
api.subscribeEmail = (email, storeUrl) => anonymousRequest('/api/email/subscribe', { method: 'POST', body: JSON.stringify({ email, storeUrl }) })
