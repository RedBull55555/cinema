import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../api/auth.js'

export default function AdminLoginPage() {
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    try {
      const tokens = await login(username, password)
      localStorage.setItem('access', tokens.access)
      localStorage.setItem('refresh', tokens.refresh)
      nav('/admin')
    } catch (e2) {
      setErr(e2.detail || 'Ошибка входа')
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header__title">Идём<span>в</span>кино</h1>
      </header>

      <main className="page-content">
        <section className="login">
          <h2 className="login__title">Авторизация</h2>
          <form className="login__form" onSubmit={onSubmit}>
            <label className="login__label">
              <span className="login__label-text">Логин</span>
              <input className="login__input" value={username} onChange={e=>setUsername(e.target.value)} />
            </label>
            <label className="login__label">
              <span className="login__label-text">Пароль</span>
              <input className="login__input" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            </label>
            {err && <p style={{color:'crimson'}}>{err}</p>}
            <button className="login__button" type="submit">Войти</button>
          </form>
        </section>
      </main>
    </div>
  )
}
