export function getAccessToken() {
  return localStorage.getItem('access') || ''
}

export function isAuthed() {
  return Boolean(getAccessToken())
}

export function logout() {
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
}
