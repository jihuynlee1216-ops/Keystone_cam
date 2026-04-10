import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext.jsx'
import { useMediaSrc } from '../hooks/useMediaSrc.js'
import BottomNav from '../components/BottomNav.jsx'
import './ArchivePage.css'

const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(145deg, #1a1a2e 0%, #0f3460 100%)',
  'linear-gradient(145deg, #0d0d0d 0%, #2d2d2d 100%)',
  'linear-gradient(145deg, #1e3a5f 0%, #1a3a5c 100%)',
  'linear-gradient(145deg, #2c1654 0%, #1a0d33 100%)',
  'linear-gradient(145deg, #0a1628 0%, #0d2137 100%)',
  'linear-gradient(145deg, #1a2a1a 0%, #0d330d 100%)',
]

const VIEWS = ['grid', 'feed']

function ThumbMedia({ item, className }) {
  const src = useMediaSrc(item)
  if (!src) return null
  if (item.type === 'video') {
    return (
      <video
        key={src}
        src={src}
        className={className}
        muted
        playsInline
        preload="metadata"
      />
    )
  }
  return <img src={src} alt="" className={className} />
}

function LogGridCard({ log, onClick }) {
  const firstMedia = log.media?.[0]
  const hasSrc     = !!(firstMedia?.dataUrl || firstMedia?.mediaId)
  const bg         = !hasSrc
    ? PLACEHOLDER_GRADIENTS[log.id.charCodeAt(log.id.length - 1) % PLACEHOLDER_GRADIENTS.length]
    : undefined

  const dateObj = new Date(log.date + 'T00:00:00')
  const month   = dateObj.toLocaleDateString('ko-KR', { month: 'short' })
  const day     = dateObj.getDate()

  return (
    <button className="archive-grid-card" onClick={onClick}>
      <div className="archive-grid-card__media" style={{ background: bg }}>
        {firstMedia && (
          <ThumbMedia item={firstMedia} className="archive-grid-card__img" />
        )}
        <div className="archive-grid-card__overlay" />
        <div className="archive-grid-card__date">
          <span className="archive-grid-card__day">{day}</span>
          <span className="archive-grid-card__month">{month}</span>
        </div>
        {log.opponent && (
          <div className="archive-grid-card__vs">vs {log.opponent}</div>
        )}
      </div>
    </button>
  )
}

function LogFeedCard({ log, onClick }) {
  const firstMedia = log.media?.[0]
  const hasSrc     = !!(firstMedia?.dataUrl || firstMedia?.mediaId)
  const bg         = !hasSrc
    ? PLACEHOLDER_GRADIENTS[log.id.charCodeAt(log.id.length - 1) % PLACEHOLDER_GRADIENTS.length]
    : undefined

  const dateObj    = new Date(log.date + 'T00:00:00')
  const displayDate = dateObj.toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  })
  const mediaCount = log.media?.length || 0

  return (
    <button className="archive-feed-card" onClick={onClick}>
      <div className="archive-feed-card__media-wrap" style={{ background: bg }}>
        {firstMedia && (
          <ThumbMedia item={firstMedia} className="archive-feed-card__img" />
        )}
        <div className="archive-feed-card__media-overlay" />

        {/* Stacked media count badge */}
        {mediaCount > 1 && (
          <div className="archive-feed-card__badge">{mediaCount}</div>
        )}
      </div>

      <div className="archive-feed-card__body">
        <p className="archive-feed-card__date">{displayDate}</p>
        {log.opponent && (
          <p className="archive-feed-card__opponent">vs {log.opponent}</p>
        )}
        {log.memo && (
          <p className="archive-feed-card__memo">{log.memo}</p>
        )}
      </div>
    </button>
  )
}

export default function ArchivePage() {
  const navigate = useNavigate()
  const { state } = useApp()

  const [view, setView] = useState('grid')
  const [filterYear, setFilterYear] = useState(null)

  const sortedLogs = useMemo(
    () => [...state.logs].sort((a, b) => b.date.localeCompare(a.date)),
    [state.logs]
  )

  const years = useMemo(
    () => [...new Set(sortedLogs.map(l => new Date(l.date).getFullYear()))].sort((a, b) => b - a),
    [sortedLogs]
  )

  const filtered = filterYear
    ? sortedLogs.filter(l => new Date(l.date).getFullYear() === filterYear)
    : sortedLogs

  const totalCount = state.logs.length

  return (
    <div className="archive-page">
      {/* ── Header ── */}
      <header className="archive-header">
        <div className="archive-header__top">
          <div>
            <h1 className="archive-header__title">아카이브</h1>
            <p className="archive-header__subtitle">{totalCount}경기의 기억</p>
          </div>
          <div className="archive-header__view-toggle">
            {VIEWS.map(v => (
              <button
                key={v}
                className={`archive-header__view-btn ${view === v ? 'active' : ''}`}
                onClick={() => setView(v)}
                aria-label={v === 'grid' ? '그리드 보기' : '피드 보기'}
              >
                {v === 'grid' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                    <rect x="3" y="13" width="18" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Year filter */}
        {years.length > 1 && (
          <div className="archive-header__years">
            <button
              className={`archive-header__year-btn ${filterYear === null ? 'active' : ''}`}
              onClick={() => setFilterYear(null)}
            >
              전체
            </button>
            {years.map(y => (
              <button
                key={y}
                className={`archive-header__year-btn ${filterYear === y ? 'active' : ''}`}
                onClick={() => setFilterYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Content ── */}
      <div className="archive-content">
        {filtered.length === 0 ? (
          <div className="archive-empty">
            <p className="archive-empty__text">아직 기록이 없어요</p>
            <button className="archive-empty__cta" onClick={() => navigate('/calendar')}>
              첫 직관 기록하기 →
            </button>
          </div>
        ) : view === 'grid' ? (
          <div className="archive-grid">
            {filtered.map(log => (
              <LogGridCard
                key={log.id}
                log={log}
                onClick={() => navigate(`/log/${log.date}`)}
              />
            ))}
          </div>
        ) : (
          <div className="archive-feed">
            {filtered.map(log => (
              <LogFeedCard
                key={log.id}
                log={log}
                onClick={() => navigate(`/log/${log.date}`)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="archive-page__spacer" />
      <BottomNav />
    </div>
  )
}
