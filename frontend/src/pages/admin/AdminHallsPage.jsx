import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPatch, apiPost, apiPut } from '../../api/http.js'
import { getAccessToken } from '../../utils/auth.js'
import Modal from '../../components/Modal.jsx'

const emptyHall = { name: '', rows_count: 10, seats_per_row: 10, is_active: true }

export default function AdminHallsPage() {
  const token = getAccessToken()
  const [halls, setHalls] = useState([])
  const [prices, setPrices] = useState({}) // hallId -> price obj
  const [err, setErr] = useState(null)

  const [hallFormOpen, setHallFormOpen] = useState(false)
  const [hallDraft, setHallDraft] = useState(emptyHall)
  const [editingHallId, setEditingHallId] = useState(null)

  const [pricesOpen, setPricesOpen] = useState(false)
  const [pricesDraft, setPricesDraft] = useState({ hall: null, standard_price: '0.00', vip_price: '0.00' })

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    try {
      setErr(null)
      const hs = await apiGet('/admin/halls/', token)
      setHalls(hs)

      // Prefetch prices for active halls (best-effort)
      const priceMap = {}
      await Promise.all(hs.map(async (h) => {
        try {
          const p = await apiGet(`/admin/halls/${h.id}/prices/`, token)
          priceMap[h.id] = p
        } catch {
          // ignore
        }
      }))
      setPrices(priceMap)
    } catch (e) {
      setErr(e)
    }
  }

  function openCreate() {
    setEditingHallId(null)
    setHallDraft({ ...emptyHall })
    setHallFormOpen(true)
  }

  function openEdit(h) {
    setEditingHallId(h.id)
    setHallDraft({
      name: h.name,
      rows_count: h.rows_count,
      seats_per_row: h.seats_per_row,
      is_active: h.is_active
    })
    setHallFormOpen(true)
  }

  async function saveHall(e) {
    e.preventDefault()
    try {
      setErr(null)
      if (editingHallId) {
        await apiPatch(`/admin/halls/${editingHallId}/`, hallDraft, token)
      } else {
        await apiPost('/admin/halls/', hallDraft, token)
      }
      setHallFormOpen(false)
      await load()
    } catch (e2) {
      setErr(e2)
    }
  }

  async function generateSeats(hallId) {
    try {
      setErr(null)
      await apiPost(`/admin/halls/${hallId}/generate_seats/`, {}, token)
      await load()
      alert('Места сгенерированы. Теперь можно назначать типы мест в редакторе зала.')
    } catch (e2) {
      setErr(e2)
    }
  }

  function openPrices(hallId) {
    const existing = prices[hallId]
    setPricesDraft(existing || { hall: hallId, standard_price: '0.00', vip_price: '0.00' })
    setPricesOpen(true)
  }

  async function savePrices(e) {
    e.preventDefault()
    try {
      setErr(null)
      await apiPut(`/admin/halls/${pricesDraft.hall}/prices/`, pricesDraft, token)
      setPricesOpen(false)
      await load()
    } catch (e2) {
      setErr(e2)
    }
  }

  const rows = useMemo(() => halls.map(h => (
    <tr key={h.id}>
      <td>{h.name}</td>
      <td>{h.rows_count} × {h.seats_per_row}</td>
      <td>{h.is_active ? 'Да' : 'Нет'}</td>
      <td>
        <div className="admin-actions">
          <button type="button" className="admin-btn" onClick={() => openEdit(h)}>Редактировать</button>
          <button type="button" className="admin-btn" onClick={() => generateSeats(h.id)}>Сгенерировать места</button>
          <Link className="admin-btn admin-btn--link" to={`/admin/halls/${h.id}/editor`}>Редактор мест</Link>
          <button type="button" className="admin-btn" onClick={() => openPrices(h.id)}>Цены</button>
        </div>
      </td>
    </tr>
  )), [halls])

  return (
    <section className="admin-panel">
      <div className="admin-panel__head">
        <h2 className="admin-panel__title">Залы</h2>
        <button type="button" className="admin-primary" onClick={openCreate}>Добавить зал</button>
      </div>

      {err && <p className="admin-error">Ошибка: {err.detail || 'Не удалось выполнить запрос'}</p>}

      <div className="admin-table__wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Схема</th>
              <th>Активен</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows}
            {halls.length === 0 && (
              <tr><td colSpan="4" style={{opacity:.8}}>Пока нет залов</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={hallFormOpen} title={editingHallId ? 'Редактирование зала' : 'Создание зала'} onClose={() => setHallFormOpen(false)}>
        <form onSubmit={saveHall} className="admin-form">
          <label className="admin-field">
            <span>Название</span>
            <input value={hallDraft.name} onChange={(e)=>setHallDraft(d=>({...d, name:e.target.value}))} required />
          </label>
          <div className="admin-form__row">
            <label className="admin-field">
              <span>Рядов</span>
              <input type="number" min="1" max="50" value={hallDraft.rows_count} onChange={(e)=>setHallDraft(d=>({...d, rows_count:Number(e.target.value)}))} required />
            </label>
            <label className="admin-field">
              <span>Мест в ряду</span>
              <input type="number" min="1" max="50" value={hallDraft.seats_per_row} onChange={(e)=>setHallDraft(d=>({...d, seats_per_row:Number(e.target.value)}))} required />
            </label>
          </div>
          <label className="admin-check">
            <input type="checkbox" checked={hallDraft.is_active} onChange={(e)=>setHallDraft(d=>({...d, is_active:e.target.checked}))} />
            <span>Зал активен</span>
          </label>
          <div className="admin-form__actions">
            <button type="button" className="admin-btn" onClick={() => setHallFormOpen(false)}>Отмена</button>
            <button type="submit" className="admin-primary">Сохранить</button>
          </div>
        </form>
      </Modal>

      <Modal open={pricesOpen} title="Цены зала" onClose={() => setPricesOpen(false)}>
        <form onSubmit={savePrices} className="admin-form">
          <div className="admin-form__row">
            <label className="admin-field">
              <span>Обычное место</span>
              <input value={pricesDraft.standard_price} onChange={(e)=>setPricesDraft(d=>({...d, standard_price:e.target.value}))} required />
            </label>
            <label className="admin-field">
              <span>VIP место</span>
              <input value={pricesDraft.vip_price} onChange={(e)=>setPricesDraft(d=>({...d, vip_price:e.target.value}))} required />
            </label>
          </div>
          <div className="admin-form__actions">
            <button type="button" className="admin-btn" onClick={() => setPricesOpen(false)}>Отмена</button>
            <button type="submit" className="admin-primary">Сохранить</button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
