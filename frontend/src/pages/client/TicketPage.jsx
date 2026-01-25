import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGet } from '../../api/http.js'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

export default function TicketPage() {
  const { code } = useParams()
  const [ticket, setTicket] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    apiGet(`/tickets/${code}/`)
      .then(setTicket)
      .catch(setErr)
  }, [code])

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header__title">Идём<span>в</span>кино</h1>
      </header>
      <main className="page-content">
        <section className="ticket">
          {err && <p style={{padding:'1rem'}}>Ошибка: {err.detail || 'Не удалось загрузить'}</p>}
          {!ticket && !err && <p style={{padding:'1rem'}}>Загрузка…</p>}
          {ticket && (
            <div style={{padding:'1rem'}}>
              <h2 className="ticket__title">Электронный билет</h2>
              <p>{ticket.movie}</p>
              <p>Зал: {ticket.hall}</p>
              <p>Начало: {new Date(ticket.starts_at).toLocaleString('ru-RU')}</p>
              <p>Ряд {ticket.row}, место {ticket.seat} ({ticket.seat_type})</p>
              <p>Код: {ticket.code}</p>
              <img alt="QR" src={`${API_BASE}/tickets/${ticket.code}/qr.png`} style={{maxWidth:'240px'}} />
              <p style={{marginTop:'1rem'}}><Link to="/">На главную</Link></p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
