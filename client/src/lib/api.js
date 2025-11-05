import axios from 'axios'

const apiBaseUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')

if (!import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.warn('VITE_API_URL not set; using relative base URL')
}

export const api = axios.create({ baseURL: apiBaseUrl })
