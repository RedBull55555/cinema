import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import SchedulePage from './pages/client/SchedulePage.jsx'
import HallPage from './pages/client/HallPage.jsx'
import TicketPage from './pages/client/TicketPage.jsx'

import AdminLoginPage from './pages/admin/AdminLoginPage.jsx'
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx'

export default function App() {
  return (
    <Routes>
      {/* Client */}
      <Route path="/" element={<SchedulePage />} />
      <Route path="/sessions/:id" element={<HallPage />} />
      <Route path="/ticket/:code" element={<TicketPage />} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
