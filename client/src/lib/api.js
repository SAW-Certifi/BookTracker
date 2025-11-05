import axios from 'axios'

// Use Vite dev proxy for local development (relative base URL)
// In production, require VITE_API_URL or fall back to relative
const apiBaseUrl = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || '')

if (!import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.warn('VITE_API_URL not set; using relative base URL')
}

export const api = axios.create({ baseURL: apiBaseUrl })
