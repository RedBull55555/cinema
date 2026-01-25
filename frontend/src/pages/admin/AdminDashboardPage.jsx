import React, { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiPut } from '../../api/http.js'
import Modal from '../../components/Modal.jsx'

function token() { return localStorage.getItem('access') }

export default function AdminDashboardPage() {
  const [halls, setHalls] = useState([])
  const [movies, setMovies] = useState([])
  const [sessions, setSessions] = useState([])
  const [bookings, setBookings] = useState([])
  const [err, setErr] = useState(null)
  const [modal, setModal] = useState({open:false, title:'', content:null})

  async function loadAll() {
    setErr(null)
    try {
      const [h, m, s, b] = await Promise.all([
        apiGet('/admin/halls/', token()),
        apiGet('/admin/movies/', token()),
        apiGet('/admin/sessions/', token()),
        apiGet('/admin/bookings/', token())
      ])
      setHalls(h)
      setMovies(m)
      setSessions(s)
      setBookings(b)
    } catch (e) {
      setErr(e.detail || 'Ошибка загрузки')
    }
  }

  useEffect(() => { loadAll() }, [])

  async function toggleHallActive(hall) {
    try {
      await apiPatch(`/admin/halls/${hall.id}/`, { is_active: !hall.is_active }, token())
      await loadAll()
    } catch (e) {
      setErr(e.detail || 'Ошибка')
    }
  }

  async function generateSeats(hall) {
    try {
      await apiPost(`/admin/halls/${hall.id}/generate_seats/`, {}, token())
      setModal({open:true, title:'Места сгенерированы', content:<p>Для зала «{hall.name}» обновлена сетка мест.</p>})
    } catch (e) {
      setErr(e.detail || 'Ошибка')
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header__title">Идём<span>в</span>кино</h1>
      </header>

      <main className="page-content">
        <section className="conf-step">
          <header className="conf-step__header conf-step__header_opened">
            <h2 className="conf-step__title">Залы</h2>
          </header>
          <div className="conf-step__wrapper">
            {err && <p style={{color:'crimson'}}>{err}</p>}
            <ul>
              {halls.map(h => (
                <li key={h.id} style={{marginBottom:'12px'}}>
                  <b>{h.name}</b> — {h.rows_count}×{h.seats_per_row} — {h.is_active ? 'Продажа открыта' : 'Закрыто'}
                  <div style={{display:'flex', gap:'8px', marginTop:'6px'}}>
                    <button className="conf-step__button conf-step__button-regular" onClick={() => toggleHallActive(h)}>
                      {h.is_active ? 'Приостановить продажу билетов' : 'Открыть продажу билетов'}
                    </button>
                    <button className="conf-step__button conf-step__button-accent" onClick={() => generateSeats(h)}>
                      Сгенерировать места
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="conf-step">
          <header className="conf-step__header conf-step__header_opened">
            <h2 className="conf-step__title">Фильмы</h2>
          </header>
          <div className="conf-step__wrapper">
            <ul>
              {movies.map(m => (
                <li key={m.id}><b>{m.title}</b> ({m.duration_minutes} мин)</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="conf-step">
          <header className="conf-step__header conf-step__header_opened">
            <h2 className="conf-step__title">Сеансы</h2>
          </header>
          <div className="conf-step__wrapper">
            <ul>
              {sessions.slice(0, 20).map(s => (
                <li key={s.id}>
                  {new Date(s.starts_at).toLocaleString('ru-RU')} — <b>{s.movie.title}</b> — {s.hall.name}
                </li>
              ))}
            </ul>
            <p style={{opacity:.7}}>Для MVP: создание/редактирование сеансов и типов мест можно расширить в этом же экране через модальные формы.</p>
          </div>
        </section>

        <section className="conf-step">
          <header className="conf-step__header conf-step__header_opened">
            <h2 className="conf-step__title">Брони</h2>
          </header>
          <div className="conf-step__wrapper">
            <ul>
              {bookings.slice(0, 20).map(b => (
                <li key={b.id}>
                  Бронь #{b.id} — {b.customer_name} — {new Date(b.created_at).toLocaleString('ru-RU')} — билетов: {b.tickets.length}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <Modal open={modal.open} title={modal.title} onClose={() => setModal({open:false, title:'', content:null})}>
        {modal.content}
      </Modal>
    </div>
  )
}
