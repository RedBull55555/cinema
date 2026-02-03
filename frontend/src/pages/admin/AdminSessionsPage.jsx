import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPatch, apiPost } from '../../api/http.js'
import { getAccessToken } from '../../utils/auth.js'
import Modal from '../../components/Modal.jsx'

function toDateInputValue(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isoToLocalInput(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminSessionsPage() {
  const token = getAccessToken()

  const [sessions, setSessions] = useState([])
  const [halls, setHalls] = useState([])
  const [movies, setMovies] = useState([])
  const [err, setErr] = useState(null)

  const [date, setDate] = useState(toDateInputValue(new Date()))

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({
    hall_id: '',
    movie_id: '',
    starts_at: ''
  })

  useEffect(() => {
    loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  async function loadLookups() {
    try {
      setErr(null)
      const [hs, ms] = await Promise.all([
        apiGet('/admin/halls/', token),
        apiGet('/admin/movies/', token)
      ])
      setHalls(hs.filter(h => h.is_active))
      setMovies(ms.filter(m => m.is_active))
    } catch (e) {
      setErr(e)
    }
  }

  async function loadSessions() {
    try {
      setErr(null)
      const ss = await apiGet('/admin/sessions/', token)
      // filter by selected date in local time
      const want = date
      const filtered = ss.filter(s => isoToLocalInput(s.starts_at).slice(0, 10) === want)
      // sort by time
      filtered.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      setSessions(filtered)
    } catch (e) {
      setErr(e)
    }
  }

  function openCreate() {
    setEditingId(null)
    setDraft({
      hall_id: halls[0]?.id || '',
      movie_id: movies[0]?.id || '',
      starts_at: `${date}T12:00`
    })
    setOpen(true)
  }

  function openEdit(s) {
    setEditingId(s.id)
    setDraft({
      hall_id: s.hall.id,
      movie_id: s.movie.id,
      starts_at: isoToLocalInput(s.starts_at)
    })
    setOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    try {
      setErr(null)
      const payload = {
        hall_id: Number(draft.hall_id),
        movie_id: Number(draft.movie_id),
        starts_at: new Date(draft.starts_at).toISOString()
      }
      if (editingId) {
        await apiPatch(`/admin/sessions/${editingId}/`, payload, token)
      } else {
        await apiPost('/admin/sessions/', payload, token)
      }
      setOpen(false)
      await loadSessions()
    } catch (e2) {
      setErr(e2)
    }
  }

  const rows = useMemo(() => sessions.map(s => (
    <tr key={s.id}>
      <td>{new Date(s.starts_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</td>
      <td>{s.movie.title}</td>
      <td>{s.hall.name}</td>
      <td>
        <button type="button" className="admin-btn" onClick={() => openEdit(s)}>Редактировать</button>
      </td>
    </tr>
  )), [sessions])

  return (
    <section className="admin-panel">
      <div className="admin-panel__head">
        <h2 className="admin-panel__title">Расписание</h2>
        <div className="admin-panel__tools">
          <label className="admin-inline">
            <span>Дата</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <button type="button" className="admin-primary" onClick={openCreate} disabled={halls.length === 0 || movies.length === 0}>
            Добавить сеанс
          </button>
        </div>
      </div>

      {err && <p className="admin-error">Ошибка: {err.detail || 'Не удалось выполнить запрос'}</p>}
      {(halls.length === 0 || movies.length === 0) && (
        <p style={{opacity:.85}}>
          Чтобы добавлять сеансы, нужны активные залы и фильмы.
        </p>
      )}

      <div className="admin-table__wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Время</th>
              <th>Фильм</th>
              <th>Зал</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows}
            {sessions.length === 0 && (
              <tr><td colSpan="4" style={{opacity:.8}}>На выбранную дату ({date}) сеансов нет</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} title={editingId ? 'Редактирование сеанса' : 'Создание сеанса'} onClose={() => setOpen(false)}>
        <form onSubmit={save} className="admin-form">
          <div className="admin-form__row">
            <label className="admin-field">
              <span>Зал</span>
              <select value={draft.hall_id} onChange={(e)=>setDraft(d=>({...d, hall_id:e.target.value}))} required>
                {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>

            <label className="admin-field">
              <span>Фильм</span>
              <select value={draft.movie_id} onChange={(e)=>setDraft(d=>({...d, movie_id:e.target.value}))} required>
                {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </label>
          </div>

          <label className="admin-field">
            <span>Начало</span>
            <input type="datetime-local" value={draft.starts_at} onChange={(e)=>setDraft(d=>({...d, starts_at:e.target.value}))} required />
          </label>

          <div className="admin-form__actions">
            <button type="button" className="admin-btn" onClick={() => setOpen(false)}>Отмена</button>
            <button type="submit" className="admin-primary">Сохранить</button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
