import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add headers to every request including ngrok warning bypass
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Ensure ngrok warning header is always sent
  config.headers['ngrok-skip-browser-warning'] = 'true'
  config.headers['user-agent'] = 'secureShare-frontend'
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401) {
      // Signal logout by setting a flag in localStorage
      localStorage.setItem('logout_triggered', 'true')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // Trigger storage event for other tabs/windows
      window.dispatchEvent(new Event('logout'))
    }
    return Promise.reject(error)
  }
)

export default api

