import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAuthed } from '../../utils/auth.js'

export default function RequireAdmin({ children }) {
  const loc = useLocation()
  if (!isAuthed()) {
    return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />
  }
  return children
}
