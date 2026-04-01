import axios from 'axios'

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const baseURL = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : '/api'

const http = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
})

export { http }
export default http
