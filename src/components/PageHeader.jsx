import React from 'react'
import { useNavigate } from 'react-router-dom'
import './PageHeader.css'

export default function PageHeader({ title, subtitle, onBack, actions, transparent = false }) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) onBack()
    else navigate(-1)
  }

  return (
    <header className={`page-header ${transparent ? 'page-header--transparent' : ''}`}>
      <div className="page-header__left">
        {onBack !== false && (
          <button className="page-header__back" onClick={handleBack} aria-label="뒤로가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="page-header__center">
        {title && <h1 className="page-header__title">{title}</h1>}
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>

      <div className="page-header__right">
        {actions}
      </div>
    </header>
  )
}
