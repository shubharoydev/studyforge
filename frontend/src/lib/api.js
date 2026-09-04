const BASE_URL = import.meta.env.VITE_API_URL || '/api'
// Uploads go directly to the backend to avoid Vite dev proxy buffering
// large multipart bodies (which caused uploads to stall mid-transfer).
const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

function getToken() {
  return localStorage.getItem('sf_token')
}

export function setToken(token) {
  if (token) localStorage.setItem('sf_token', token)
  else localStorage.removeItem('sf_token')
}

export function clearToken() {
  localStorage.removeItem('sf_token')
}

export function isAuthenticated() {
  return !!getToken()
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const token = getToken()
  const hasJsonBody = !(body instanceof FormData) && body !== undefined && body !== null
  const allHeaders = {
    ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: allHeaders,
    body: body instanceof FormData ? body : hasJsonBody ? JSON.stringify(body) : undefined,
    signal
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, data?.message || `Request failed (${res.status})`, data?.details)
  }
  return data
}

export const api = {
  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body }),
    login: (body) => request('/auth/login', { method: 'POST', body }),
    me: () => request('/auth/me'),
    updateProfile: (body) => request('/auth/me', { method: 'PATCH', body }),
    changePassword: (body) => request('/auth/password', { method: 'PATCH', body })
  },
  documents: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/documents${q ? '?' + q : ''}`)
    },
    get: (id) => request(`/documents/${id}`),
    upload: (file, onProgress) => {
      const formData = new FormData()
      formData.append('file', file)
      const token = getToken()
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${UPLOAD_URL}/documents/upload`)
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
          else {
            try { reject(new ApiError(xhr.status, JSON.parse(xhr.responseText).message)) }
            catch { reject(new ApiError(xhr.status, `Upload failed (${xhr.status})`)) }
          }
        }
        xhr.onerror = () => reject(new ApiError(0, 'Network error'))
        xhr.send(formData)
      })
    },
    delete: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
    summary: (id) => request(`/documents/${id}/summary`, { method: 'POST' })
  },
  chat: {
    send: (body) => request('/chat', { method: 'POST', body }),
    stream: async (body, onToken, onSources, onDone, onError) => {
      const token = getToken()
      const res = await fetch(`${BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body)
      })
      if (!res.ok) { onError('AI service unavailable'); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let sepIdx
        while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, sepIdx)
          buffer = buffer.slice(sepIdx + 2)
          for (const line of raw.split('\n')) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('event: ')) continue
            const eventType = trimmed.slice(7)
            const nextLine = raw.split('\n').find((l) => l.startsWith('data: '))
            if (!nextLine) continue
            const payload = nextLine.slice(6)
            try {
              const data = JSON.parse(payload)
              if (eventType === 'token') onToken(data.text)
              else if (eventType === 'sources') onSources(data)
              else if (eventType === 'done') onDone(data)
              else if (eventType === 'error') onError(data.message)
            } catch {}
          }
        }
      }
    },
    conversations: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/conversations${q ? '?' + q : ''}`)
    },
    getConversation: (id) => request(`/conversations/${id}`),
    deleteConversation: (id) => request(`/conversations/${id}`, { method: 'DELETE' })
  },
  quizzes: {
    list: () => request('/quizzes'),
    generate: (body) => request('/quizzes/generate', { method: 'POST', body }),
    get: (id, params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/quizzes/${id}${q ? '?' + q : ''}`)
    },
    attempt: (id, body) => request(`/quizzes/${id}/attempt`, { method: 'POST', body })
  },
  analytics: () => request('/analytics'),
  recommendations: () => request('/recommendations'),
  health: () => request('/health')
}

export function parseSSE(text, handlers) {
  const events = text.split('\n\n')
  for (const evt of events) {
    const lines = evt.split('\n')
    let eventType = null
    let data = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) eventType = line.slice(7)
      if (line.startsWith('data: ')) data = line.slice(6)
    }
    if (!eventType) continue
    try {
      const payload = JSON.parse(data)
      if (eventType === 'token' && handlers.onToken) handlers.onToken(payload.text)
      if (eventType === 'sources' && handlers.onSources) handlers.onSources(payload)
      if (eventType === 'done' && handlers.onDone) handlers.onDone(payload)
      if (eventType === 'error' && handlers.onError) handlers.onError(payload.message)
    } catch {}
  }
}
