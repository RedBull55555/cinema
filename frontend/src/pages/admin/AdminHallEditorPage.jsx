import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGet, apiPatch } from '../../api/http.js'
import { getAccessToken } from '../../utils/auth.js'

const TYPE_LABEL = {
  STANDARD: 'Обычное',
  VIP: 'VIP',
  DISABLED: 'Отключено'
}

export default function AdminHallEditorPage() {
  const { id } = useParams()
  const token = getAccessToken()

  const [hall, setHall] = useState(null)
  const [seats, setSeats] = useState([])
  const [err, setErr] = useState(null)
  const [brush, setBrush] = useState('VIP')
  const [isMouseDown, setIsMouseDown] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function load() {
    try {
      setErr(null)
      const h = await apiGet(`/admin/halls/${id}/`, token)
      const allSeats = await apiGet('/admin/seats/', token)
      setHall(h)
      setSeats(allSeats.filter(s => String(s.hall) === String(id)))
    } catch (e) {
      setErr(e)
    }
  }

  const seatMap = useMemo(() => {
    const m = new Map()
    seats.forEach(s => m.set(`${s.row}-${s.number}`, s))
    return m
  }, [seats])

  async function setSeatType(row, number, nextType) {
    const seat = seatMap.get(`${row}-${number}`)
    if (!seat) return
    if (seat.seat_type === nextType) return
    try {
      const updated = await apiPatch(`/admin/seats/${seat.id}/`, { seat_type: nextType }, token)
      setSeats(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    } catch (e) {
      setErr(e)
    }
  }

  function onPaint(row, number) {
    if (!isMouseDown) return
    setSeatType(row, number, brush)
  }

  if (err && !hall) return <p className="admin-error">Ошибка: {err.detail || 'Не удалось загрузить'}</p>
  if (!hall) return <p>Загрузка…</p>

  const rows = Array.from({ length: hall.rows_count }, (_, i) => i + 1)
  const cols = Array.from({ length: hall.seats_per_row }, (_, i) => i + 1)

  return (
    <section className="admin-panel">
      <div className="admin-panel__head">
        <h2 className="admin-panel__title">Редактор зала: {hall.name}</h2>
        <Link className="admin-btn admin-btn--link" to="/admin/halls">← К залам</Link>
      </div>

      {err && <p className="admin-error">Ошибка: {err.detail || 'Не удалось выполнить действие'}</p>}

      <div className="admin-toolbar">
        <div className="admin-toolbar__group">
          <div className="admin-toolbar__label">Кисть:</div>
          {['STANDARD','VIP','DISABLED'].map(t => (
            <button
              key={t}
              type="button"
              className={brush === t ? 'admin-chip active' : 'admin-chip'}
              onClick={() => setBrush(t)}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="admin-toolbar__hint">
          Подсказка: зажмите кнопку мыши и «красьте» места. DISABLED скрывает место для покупателя.
        </div>
      </div>

      <div
        className="admin-seatgrid"
        onMouseDown={() => setIsMouseDown(true)}
        onMouseUp={() => setIsMouseDown(false)}
        onMouseLeave={() => setIsMouseDown(false)}
      >
        {rows.map(r => (
          <div key={r} className="admin-seatgrid__row">
            <div className="admin-seatgrid__rownum">{r}</div>
            {cols.map(c => {
              const seat = seatMap.get(`${r}-${c}`)
              const type = seat?.seat_type || 'STANDARD'
              const cls = [
                'admin-seat',
                type === 'VIP' ? 'admin-seat--vip' : '',
                type === 'DISABLED' ? 'admin-seat--disabled' : '',
              ].filter(Boolean).join(' ')

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  className={cls}
                  title={`Ряд ${r}, место ${c} — ${TYPE_LABEL[type] || type}`}
                  onMouseEnter={() => onPaint(r, c)}
                  onClick={() => setSeatType(r, c, brush)}
                />
              )
            })}
          </div>
        ))}
        <div className="admin-seatgrid__colnums">
          <span />
          {cols.map(c => <span key={c}>{c}</span>)}
        </div>
      </div>
    </section>
  )
}
