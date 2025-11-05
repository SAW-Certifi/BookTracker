import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

if (!import.meta.env.VITE_API_URL) {
  console.warn('VITE_API_URL not set. Falling back to http://localhost:5000')
}

export const api = axios.create({ baseURL: apiBaseUrl })
