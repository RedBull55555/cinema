import { apiPost } from './http.js'

export async function login(username, password) {
  // SimpleJWT expects username/password
  return apiPost('/admin/token/', { username, password })
}
