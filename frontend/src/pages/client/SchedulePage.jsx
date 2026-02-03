import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api/http.js'

function todayYmd() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function SchedulePage() {
  const [data, setData] = useState(null)
  const [date, setDate] = useState(todayYmd())
  const [err, setErr] = useState(null)

  useEffect(() => {
    setData(null)
    setErr(null)
    apiGet(`/schedule/?date=${date}`)
      .then(setData)
      .catch(setErr)
  }, [date])

  const grouped = useMemo(() => {
    if (!data) return []
    const map = new Map() // movieId -> {movie, sessions: []}
    data.sessions.forEach(s => {
      const id = s.movie.id
      if (!map.has(id)) map.set(id, { movie: s.movie, sessions: [] })
      map.get(id).sessions.push(s)
    })
    const arr = Array.from(map.values())
    // sort movies alphabetically
    arr.sort((a, b) => a.movie.title.localeCompare(b.movie.title, 'ru'))
    // sort sessions by time within movie
    arr.forEach(g => g.sessions.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)))
    return arr
  }, [data])

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header__title">Идём<span>в</span>кино</h1>
      </header>

      <main className="page-content">
        <section className="movie">
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1rem'}}>
            <h2 className="movie__title" style={{margin:0}}>Расписание</h2>
            <label style={{display:'flex', gap:8, alignItems:'center'}}>
              <span style={{opacity:.8}}>Дата</span>
              <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
            </label>
          </div>

          {err && <p style={{padding:'0 1rem'}}>Ошибка: {err.detail || 'Не удалось загрузить'}</p>}
          {!data && !err && <p style={{padding:'0 1rem'}}>Загрузка…</p>}

          {data && (
            <div style={{padding:'0 1rem'}}>
              <p style={{opacity:.8}}>Показываем сеансы на дату: <strong>{data.date}</strong></p>

              <div style={{display:'grid', gap:'14px'}}>
                {grouped.map(g => (
                  <div key={g.movie.id} className="movie-seances__hall">
                    <div className="movie__info" style={{paddingTop: 12}}>
                      <div className="movie__description">
                        <p className="movie__synopsis" style={{fontSize: '1.05rem'}}>{g.movie.title}</p>
                      </div>
                    </div>

                    <ul className="movie-seances__list" style={{flexWrap:'wrap'}}>
                      {g.sessions.map(s => (
                        <li key={s.id} className="movie-seances__time-block" style={{marginRight: 10}}>
                          <Link className="movie-seances__time" to={`/sessions/${s.id}`}>
                            {new Date(s.starts_at).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})}
                          </Link>
                          <div style={{fontSize: 12, opacity: .8, marginTop: 4}}>
                            {s.hall.name}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {grouped.length === 0 && (
                  <p style={{opacity:.8}}>На выбранную дату сеансов нет.</p>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
