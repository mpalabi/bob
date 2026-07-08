import axios from 'axios'
import { API_URL } from './config'

// Force the XHR adapter — Axios 1.7+ defaults to fetch, which has quirks
// with cross-origin localhost requests inside Electron's renderer.
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  adapter: 'xhr'
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('bob_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
