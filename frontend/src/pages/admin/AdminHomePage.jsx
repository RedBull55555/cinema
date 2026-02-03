import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api/http.js'
import { getAccessToken } from '../../utils/auth.js'

export default function AdminHomePage() {
  const token = getAccessToken()
  const [stats, setStats] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    Promise.all([
      apiGet('/admin/halls/', token),
      apiGet('/admin/movies/', token),
      apiGet('/admin/sessions/', token),
      apiGet('/admin/bookings/', token)
    ])
      .then(([halls, movies, sessions, bookings]) => {
        setStats({
          halls: halls.length,
          movies: movies.length,
          sessions: sessions.length,
          bookings: bookings.length
        })
      })
      .catch(setErr)
  }, [token])

  return (
    <section className="admin-panel">
      <h2 className="admin-panel__title">Панель администратора</h2>
      {err && <p className="admin-error">Ошибка: {err.detail || 'Не удалось загрузить'}</p>}
      {!stats && !err && <p>Загрузка…</p>}
      {stats && (
        <div className="admin-cards">
          <div className="admin-card">
            <div className="admin-card__num">{stats.halls}</div>
            <div className="admin-card__label">Залов</div>
            <Link to="/admin/halls" className="admin-card__link">Управлять</Link>
          </div>
          <div className="admin-card">
            <div className="admin-card__num">{stats.movies}</div>
            <div className="admin-card__label">Фильмов</div>
            <Link to="/admin/movies" className="admin-card__link">Управлять</Link>
          </div>
          <div className="admin-card">
            <div className="admin-card__num">{stats.sessions}</div>
            <div className="admin-card__label">Сеансов</div>
            <Link to="/admin/sessions" className="admin-card__link">Настроить</Link>
          </div>
          <div className="admin-card">
            <div className="admin-card__num">{stats.bookings}</div>
            <div className="admin-card__label">Бронирований</div>
            <span className="admin-card__hint">Просмотр через API</span>
          </div>
        </div>
      )}

      <p style={{marginTop: 16, opacity: .85}}>
        Быстрый старт: <Link to="/admin/halls">создайте зал</Link> → сгенерируйте места → назначьте типы (STANDARD/VIP) → задайте цены → <Link to="/admin/movies">добавьте фильмы</Link> → <Link to="/admin/sessions">настройте сеансы</Link>.
      </p>
    </section>
  )
}
