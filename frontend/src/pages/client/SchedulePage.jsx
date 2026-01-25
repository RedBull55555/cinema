import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api/http.js'

export default function SchedulePage() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    apiGet('/schedule/')
      .then(setData)
      .catch(setErr)
  }, [])

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header__title">Идём<span>в</span>кино</h1>
      </header>

      <main className="page-content">
        <section className="movie">
          <h2 className="movie__title">Расписание</h2>
          {err && <p style={{padding:'0 1rem'}}>Ошибка: {err.detail || 'Не удалось загрузить'}</p>}
          {!data && !err && <p style={{padding:'0 1rem'}}>Загрузка…</p>}
          {data && (
            <div style={{padding:'0 1rem'}}>
              <p>Дата: {data.date}</p>
              <div style={{display:'grid', gap:'12px'}}>
                {data.sessions.map(s => (
                  <div key={s.id} className="movie-seances__hall">
                    <h3 className="movie-seances__hall-title">{s.hall.name}</h3>
                    <ul className="movie-seances__list">
                      <li className="movie-seances__time-block">
                        <Link className="movie-seances__time" to={`/sessions/${s.id}`}>
                          {new Date(s.starts_at).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})}
                        </Link>
                      </li>
                    </ul>
                    <div className="movie__info">
                      <div className="movie__description">
                        <p className="movie__synopsis">{s.movie.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
