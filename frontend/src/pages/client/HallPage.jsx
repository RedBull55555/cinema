import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/http.js'
import Modal from '../../components/Modal.jsx'

function money(v) {
  if (v === null || v === undefined) return '0'
  return String(v)
}

export default function HallPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState([])
  const [err, setErr] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [created, setCreated] = useState(null)

  useEffect(() => {
    apiGet(`/sessions/${id}/`)
      .then(setData)
      .catch(setErr)
  }, [id])

  const occupiedSet = useMemo(() => {
    const set = new Set()
    if (!data) return set
    data.occupied.forEach(o => set.add(`${o.row}-${o.seat}`))
    return set
  }, [data])

  const seatTypeMap = useMemo(() => {
    const m = new Map()
    if (!data) return m
    data.hall_seats.forEach(s => m.set(`${s.row}-${s.seat}`, s.type))
    return m
  }, [data])

  function toggleSeat(row, seat, type) {
    const key = `${row}-${seat}`
    if (occupiedSet.has(key) || type === 'DISABLED') return
    setSelected(prev => {
      const has = prev.some(s => s.row === row && s.seat === seat)
      return has ? prev.filter(s => !(s.row === row && s.seat === seat)) : [...prev, { row, seat }]
    })
  }

  const total = useMemo(() => {
    if (!data) return 0
    const std = Number(data.prices.standard || 0)
    const vip = Number(data.prices.vip || 0)
    return selected.reduce((sum, s) => {
      const type = seatTypeMap.get(`${s.row}-${s.seat}`) || 'STANDARD'
      return sum + (type === 'VIP' ? vip : std)
    }, 0)
  }, [data, selected, seatTypeMap])

  async function book() {
    try {
      const booking = await apiPost(`/sessions/${id}/book/`, {
        customer_name: 'Гость',
        customer_email: 'guest@example.com',
        seats: selected
      })
      setCreated(booking)
      setModalOpen(true)
    } catch (e) {
      setErr(e)
    }
  }

  if (err && !data) {
    return <div className="page"><p style={{ padding: '1rem' }}>Ошибка: {err.detail || 'Не удалось загрузить'}</p></div>
  }
  if (!data) return <div className="page"><p style={{ padding: '1rem' }}>Загрузка…</p></div>

  const session = data.session
  const hall = session.hall

  // build grid
  const grid = []
  for (let r = 1; r <= hall.rows_count; r++) {
    const rowSeats = data.hall_seats.filter(s => s.row === r).sort((a, b) => a.seat - b.seat)
    grid.push(rowSeats)
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header__title">Идём<span>в</span>кино</h1>
      </header>

      <main className="page-content">
        <section className="buying">
          <div className="buying__info">
            <div className="buying__info-description">
              <h2 className="buying__info-title">{session.movie.title}</h2>
              <p className="buying__info-start">Начало: {new Date(session.starts_at).toLocaleString('ru-RU')}</p>
              <p className="buying__info-hall">{session.hall.name}</p>
            </div>
          </div>

          <div className="buying-scheme">
            <div className="buying-scheme__wrapper">
              {grid.map((rowSeats, idx) => (
                <div key={idx} className="buying-scheme__row">
                  <div className="buying-scheme__rownum" aria-hidden="true">{idx + 1}</div>

                  {rowSeats.map(s => {
                    const key = `${s.row}-${s.seat}`
                    const isOcc = occupiedSet.has(key)
                    const isSel = selected.some(x => x.row === s.row && x.seat === s.seat)
                    const cls = [
                      'buying-scheme__chair',
                      s.type === 'VIP' ? 'buying-scheme__chair_vip' : '',
                      s.type === 'DISABLED' ? 'buying-scheme__chair_disabled' : '',
                      isOcc ? 'buying-scheme__chair_taken' : '',
                      isSel ? 'buying-scheme__chair_selected' : ''
                    ].filter(Boolean).join(' ')

                    return (
                      <button
                        key={key}
                        type="button"
                        className={cls}
                        onClick={() => toggleSeat(s.row, s.seat, s.type)}
                        title={`Ряд ${s.row}, место ${s.seat}`}
                        aria-label={`Ряд ${s.row}, место ${s.seat}`}
                        disabled={isOcc || s.type === 'DISABLED'}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="buying-scheme__legend">
              <div className="buying-scheme__legend-price">
                <span className="buying-scheme__chair buying-scheme__chair_standart" /> — обычные ({money(data.prices.standard)})
                <span style={{ marginLeft: '1rem' }} className="buying-scheme__chair buying-scheme__chair_vip" /> — vip ({money(data.prices.vip)})
              </div>
              <div style={{ marginTop: 8, opacity: .9 }}>
                Вы выбрали: {selected.length === 0 ? 'ничего' : (
                  <span>
                    {selected
                      .slice()
                      .sort((a, b) => (a.row - b.row) || (a.seat - b.seat))
                      .map(s => `р.${s.row} м.${s.seat}`)
                      .join(', ')}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>
                Итого: {total.toFixed(2)}
              </div>
            </div>

            <button className="acceptin-button" disabled={selected.length === 0} onClick={book}>
              Забронировать ({selected.length})
            </button>
          </div>
        </section>
      </main>

      <Modal
        open={modalOpen}
        title="Бронь создана"
        onClose={() => {
          setModalOpen(false)
          const first = created?.tickets?.[0]?.code
          if (first) nav(`/ticket/${first}`)
          else nav('/')
        }}
      >
        <p>Бронь № {created?.id}</p>
        <p>Билеты:</p>
        <ul>
          {created?.tickets?.map(t => (
            <li key={t.code}>
              Ряд {t.row_snapshot}, место {t.seat_snapshot} — код {t.code}
            </li>
          ))}
        </ul>
        <button className="acceptin-button" onClick={() => {
          setModalOpen(false)
          const first = created?.tickets?.[0]?.code
          if (first) nav(`/ticket/${first}`)
          else nav('/')
        }}>
          Открыть билет
        </button>
      </Modal>
    </div>
  )
}
