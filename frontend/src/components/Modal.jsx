import React, { useEffect } from 'react'

export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="app-modal__backdrop" onMouseDown={onClose}>
      <div className="app-modal__dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="app-modal__header">
          <div className="app-modal__title">{title}</div>
          <button className="app-modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <div className="app-modal__content">
          {children}
        </div>
      </div>
    </div>
  )
}
