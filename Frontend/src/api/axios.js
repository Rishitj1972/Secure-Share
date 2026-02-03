import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 900000, // 15 minutes timeout for large file uploads
  maxContentLength: Infinity,
  maxBodyLength: Infinity
});

// Add headers to every request including ngrok warning bypass
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Ensure ngrok warning header is always sent
  config.headers['ngrok-skip-browser-warning'] = 'true'
  
  // Set longer timeout for chunk uploads (30 minutes)
  if (config.url && config.url.includes('chunked')) {
    config.timeout = 1800000 // 30 minutes for chunked uploads
  }
  
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

