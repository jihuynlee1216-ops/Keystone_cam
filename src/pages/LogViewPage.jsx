import React, { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, getLogByDate } from '../store/AppContext.jsx'
import MediaCard from '../components/MediaCard.jsx'
import './LogViewPage.css'

const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
  'linear-gradient(145deg, #0d0d0d 0%, #1a1a1a 40%, #2d2d2d 100%)',
  'linear-gradient(145deg, #1e3a5f 0%, #2d5986 40%, #1a3a5c 100%)',
]

export default function LogViewPage() {
  const navigate    = useNavigate()
  const { date }    = useParams()
  const { state, dispatch } = useApp()

  const [activeIdx, setActiveIdx] = useState(0)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const scrollRef = useRef(null)

  const logs = getLogByDate(state.logs, date)
  const log  = logs[0] // show first log for this date

  if (!log) {
    return (
      <div className="log-view log-view--empty">
        <button className="log-view__back-btn" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className="log-view__empty-msg">기록을 찾을 수 없어요</p>
        <button className="log-view__create-link" onClick={() => navigate(`/create/${date}`)}>
          새 기록 만들기 →
        </button>
      </div>
    )
  }

  const dateObj     = new Date(log.date + 'T00:00:00')
  const displayDate = dateObj.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  const handleScroll = (e) => {
    const el = e.currentTarget
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    setActiveIdx(idx)
  }

  const handleDelete = () => {
    dispatch({ type: 'DELETE_LOG', payload: log.id })
    navigate('/calendar', { replace: true })
  }

  const hasMedia = log.media?.length > 0

  return (
    <div className="log-view">
      {/* Floating back button */}
      <button className="log-view__back-btn" onClick={() => navigate(-1)} aria-label="뒤로가기">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Options button */}
      <button
        className="log-view__options-btn"
        onClick={() => setShowConfirmDelete(true)}
        aria-label="더보기"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="5"  r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="19" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {/* ── Media strip (story-style) ── */}
      {hasMedia ? (
        <div className="log-view__media-wrap">
          <div
            className="log-view__media-scroll"
            ref={scrollRef}
            onScroll={handleScroll}
          >
            {log.media.map((item, idx) => (
              <div
                key={item.id}
                className={`log-view__media-item ${idx === activeIdx ? 'active' : ''}`}
              >
                <div
                  className="log-view__media-bg"
                  style={!item.dataUrl ? {
                    background: PLACEHOLDER_GRADIENTS[idx % PLACEHOLDER_GRADIENTS.length],
                  } : undefined}
                >
                  {item.dataUrl && item.type === 'image' && (
                    <img src={item.dataUrl} alt={item.caption || ''} className="log-view__media-img" />
                  )}
                  {item.dataUrl && item.type === 'video' && (
                    <video src={item.dataUrl} className="log-view__media-img" muted playsInline loop autoPlay />
                  )}

                  {/* Gradient overlay */}
                  <div className="log-view__media-gradient" />

                  {/* Text overlay */}
                  {item.overlay?.text && (
                    <div
                      className="log-view__overlay-text"
                      style={{
                        left: `${item.overlay.x}%`,
                        top:  `${item.overlay.y}%`,
                        fontSize: { small: '13px', medium: '19px', large: '28px' }[item.overlay.size || 'medium'],
                      }}
                    >
                      {item.overlay.text}
                    </div>
                  )}

                  {/* Caption */}
                  {item.caption && (
                    <div className="log-view__media-caption">{item.caption}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Story progress bar */}
          {log.media.length > 1 && (
            <div className="log-view__story-bar">
              {log.media.map((_, i) => (
                <div
                  key={i}
                  className={`log-view__story-seg ${i === activeIdx ? 'active' : i < activeIdx ? 'done' : ''}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* No media fallback */
        <div className="log-view__no-media">
          <div className="log-view__no-media-inner" />
        </div>
      )}

      {/* ── Log info card ── */}
      <div className="log-view__info-card">
        <div className="log-view__info-header">
          <div>
            <p className="log-view__date">{displayDate}</p>
            {log.opponent && (
              <p className="log-view__opponent">
                vs {log.opponent}
                {log.venue && <span className="log-view__venue"> · {log.venue}</span>}
              </p>
            )}
          </div>
          <button
            className="log-view__edit-btn"
            onClick={() => navigate(`/create/${date}`)}
          >
            편집
          </button>
        </div>

        {log.memo && (
          <p className="log-view__memo">{log.memo}</p>
        )}
      </div>

      {/* ── Delete confirm ── */}
      {showConfirmDelete && (
        <div className="log-view__overlay" onClick={() => setShowConfirmDelete(false)}>
          <div className="log-view__sheet" onClick={e => e.stopPropagation()}>
            <div className="log-view__sheet-handle" />
            <p className="log-view__sheet-title">이 기록을 삭제할까요?</p>
            <p className="log-view__sheet-desc">삭제한 기록은 복구할 수 없어요.</p>
            <button className="log-view__sheet-btn log-view__sheet-btn--delete" onClick={handleDelete}>
              삭제
            </button>
            <button className="log-view__sheet-btn log-view__sheet-btn--cancel" onClick={() => setShowConfirmDelete(false)}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
