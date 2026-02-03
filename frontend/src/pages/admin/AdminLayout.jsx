import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../../utils/auth.js'

export default function AdminLayout() {
  const nav = useNavigate()

  function onLogout() {
    logout()
    nav('/admin/login')
  }

  return (
    <div className="page admin-page">
      <header className="page-header admin-header">
        <h1 className="page-header__title">Идём<span>в</span>кино</h1>

        <nav className="admin-nav">
          <NavLink to="/admin" end className={({isActive}) => isActive ? 'admin-nav__link active' : 'admin-nav__link'}>
            Главная
          </NavLink>
          <NavLink to="/admin/halls" className={({isActive}) => isActive ? 'admin-nav__link active' : 'admin-nav__link'}>
            Залы
          </NavLink>
          <NavLink to="/admin/movies" className={({isActive}) => isActive ? 'admin-nav__link active' : 'admin-nav__link'}>
            Фильмы
          </NavLink>
          <NavLink to="/admin/sessions" className={({isActive}) => isActive ? 'admin-nav__link active' : 'admin-nav__link'}>
            Расписание
          </NavLink>

          <button type="button" className="admin-nav__logout" onClick={onLogout}>
            Выйти
          </button>
        </nav>
      </header>

      <main className="page-content admin-content">
        <Outlet />
      </main>
    </div>
  )
}
