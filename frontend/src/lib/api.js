import axios from 'axios'

// In production, VITE_API_URL points to the deployed backend.
// In dev, the Vite proxy handles /api → localhost:5000.
const baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

const api = axios.create({
  baseURL,
  withCredentials: true,
})

api.interceptors.response.use(
  res => res,
  err => Promise.reject(err)
)

export default api
