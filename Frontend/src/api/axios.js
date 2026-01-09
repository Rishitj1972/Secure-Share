import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' }
})

console.debug('API baseURL:', baseURL)

// Attach token if present and log requests for debugging
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  console.debug('API request:', config.method, config.url, 'with token?', !!token)
  return config
})

// Log response errors to make network issues visible in the console
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API error:', error?.response?.status, error?.message)

    // If unauthorized, clear stored auth and redirect to login so the app can recover
    if (error?.response?.status === 401) {
      try {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        // Force navigation to login page
        window.location.href = '/login'
      } catch (e) {
        console.warn('Failed to perform redirect on 401', e)
      }
    }

    return Promise.reject(error)
  }
)

export default api
