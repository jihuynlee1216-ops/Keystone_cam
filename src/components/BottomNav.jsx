import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './BottomNav.css'

const NAV_ITEMS = [
  {
    id: 'calendar',
    path: '/calendar',
    label: '캘린더',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="17" rx="3" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
        <path d="M3 9h18" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
        <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
        <circle cx="8" cy="14" r="1" fill="currentColor" />
        <circle cx="12" cy="14" r="1" fill="currentColor" />
        <circle cx="16" cy="14" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'archive',
    path: '/archive',
    label: '아카이브',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
        <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
        <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      </svg>
    ),
  },
  {
    id: 'video',
    path: '/video/monthly',
    label: '영상',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
        <path d="M16 10l6-3v10l-6-3V10z" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => {
        const active = location.pathname.startsWith(item.path.split('/video')[0] || item.path)
          || (item.path.startsWith('/video') && location.pathname.startsWith('/video'))

        const isActive = location.pathname === item.path
          || (item.id === 'video' && location.pathname.startsWith('/video'))

        return (
          <button
            key={item.id}
            className={`bottom-nav__item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
          >
            <span className="bottom-nav__icon">{item.icon(isActive)}</span>
            <span className="bottom-nav__label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
