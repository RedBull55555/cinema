import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPatch, apiPost } from '../../api/http.js'
import { getAccessToken } from '../../utils/auth.js'
import Modal from '../../components/Modal.jsx'

const emptyMovie = {
  title: '',
  description: '',
  duration_minutes: 90,
  poster_url: '',
  is_active: true
}

export default function AdminMoviesPage() {
  const token = getAccessToken()
  const [movies, setMovies] = useState([])
  const [err, setErr] = useState(null)

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(emptyMovie)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    try {
      setErr(null)
      const ms = await apiGet('/admin/movies/', token)
      setMovies(ms)
    } catch (e) {
      setErr(e)
    }
  }

  function openCreate() {
    setEditingId(null)
    setDraft({ ...emptyMovie })
    setOpen(true)
  }

  function openEdit(m) {
    setEditingId(m.id)
    setDraft({
      title: m.title,
      description: m.description || '',
      duration_minutes: m.duration_minutes,
      poster_url: m.poster_url || '',
      is_active: m.is_active
    })
    setOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    try {
      setErr(null)
      if (editingId) {
        await apiPatch(`/admin/movies/${editingId}/`, draft, token)
      } else {
        await apiPost('/admin/movies/', draft, token)
      }
      setOpen(false)
      await load()
    } catch (e2) {
      setErr(e2)
    }
  }

  const rows = useMemo(() => movies.map(m => (
    <tr key={m.id}>
      <td>{m.title}</td>
      <td>{m.duration_minutes} мин</td>
      <td>{m.is_active ? 'Да' : 'Нет'}</td>
      <td>
        <div className="admin-actions">
          <button type="button" className="admin-btn" onClick={() => openEdit(m)}>Редактировать</button>
        </div>
      </td>
    </tr>
  )), [movies])

  return (
    <section className="admin-panel">
      <div className="admin-panel__head">
        <h2 className="admin-panel__title">Фильмы</h2>
        <button type="button" className="admin-primary" onClick={openCreate}>Добавить фильм</button>
      </div>

      {err && <p className="admin-error">Ошибка: {err.detail || 'Не удалось выполнить запрос'}</p>}

      <div className="admin-table__wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Длительность</th>
              <th>Активен</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows}
            {movies.length === 0 && (
              <tr><td colSpan="4" style={{opacity:.8}}>Пока нет фильмов</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} title={editingId ? 'Редактирование фильма' : 'Создание фильма'} onClose={() => setOpen(false)}>
        <form onSubmit={save} className="admin-form">
          <label className="admin-field">
            <span>Название</span>
            <input value={draft.title} onChange={(e)=>setDraft(d=>({...d, title:e.target.value}))} required />
          </label>

          <label className="admin-field">
            <span>Описание</span>
            <textarea rows="4" value={draft.description} onChange={(e)=>setDraft(d=>({...d, description:e.target.value}))} />
          </label>

          <div className="admin-form__row">
            <label className="admin-field">
              <span>Длительность (мин)</span>
              <input type="number" min="1" max="500" value={draft.duration_minutes} onChange={(e)=>setDraft(d=>({...d, duration_minutes:Number(e.target.value)}))} required />
            </label>

            <label className="admin-field">
              <span>Poster URL</span>
              <input value={draft.poster_url} onChange={(e)=>setDraft(d=>({...d, poster_url:e.target.value}))} placeholder="https://..." />
            </label>
          </div>

          <label className="admin-check">
            <input type="checkbox" checked={draft.is_active} onChange={(e)=>setDraft(d=>({...d, is_active:e.target.checked}))} />
            <span>Фильм активен</span>
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
