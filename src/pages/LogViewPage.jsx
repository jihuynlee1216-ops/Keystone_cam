import React, { useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, getLogByDate } from '../store/AppContext.jsx'
import { useMediaSrc } from '../hooks/useMediaSrc.js'
import { getMedia } from '../store/mediaDB.js'
import MediaCard from '../components/MediaCard.jsx'
import './LogViewPage.css'

function MediaItemView({ item, idx, activeIdx }) {
  const mediaSrc = useMediaSrc(item)
  const fontSizeMap = { small: '13px', medium: '19px', large: '28px' }

  return (
    <div className={`log-view__media-item ${idx === activeIdx ? 'active' : ''}`}>
      <div
        className="log-view__media-bg"
        style={!mediaSrc ? {
          background: PLACEHOLDER_GRADIENTS[idx % PLACEHOLDER_GRADIENTS.length],
        } : undefined}
      >
        {mediaSrc && item.type === 'image' && (
          <img src={mediaSrc} alt={item.caption || ''} className="log-view__media-img" />
        )}
        {mediaSrc && item.type === 'video' && (
          <video
            key={mediaSrc}
            src={mediaSrc}
            className="log-view__media-img"
            muted
            playsInline
            loop
            autoPlay
            preload="auto"
            onCanPlay={e => e.target.play().catch(() => {})}
          />
        )}

        <div className="log-view__media-gradient" />

        {item.overlay?.text && (
          <div
            className="log-view__overlay-text"
            style={{
              left: `${item.overlay.x}%`,
              top:  `${item.overlay.y}%`,
              fontSize: fontSizeMap[item.overlay.size || 'medium'],
            }}
          >
            {item.overlay.text}
          </div>
        )}

        {item.caption && (
          <div className="log-view__media-caption">{item.caption}</div>
        )}
      </div>
    </div>
  )
}

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

  const handleDownload = useCallback(async (item) => {
    try {
      let blob
      // IndexedDB에 저장된 미디어면 blob 로드
      if (item.mediaId) {
        blob = await getMedia(item.mediaId)
      }
      // dataUrl이 base64면 fetch로 blob 변환
      if (!blob && item.dataUrl && item.dataUrl.startsWith('data:')) {
        const res = await fetch(item.dataUrl)
        blob = await res.blob()
      }
      // dataUrl이 blob URL이면 fetch
      if (!blob && item.dataUrl && item.dataUrl.startsWith('blob:')) {
        const res = await fetch(item.dataUrl)
        blob = await res.blob()
      }
      if (!blob) return

      const ext = item.type === 'video' ? 'mp4' : 'jpg'
      const filename = `직관기록_${log.date}_${Date.now()}.${ext}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.warn('다운로드 실패:', err)
    }
  }, [log])

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
              <MediaItemView
                key={item.id}
                item={item}
                idx={idx}
                activeIdx={activeIdx}
              />
            ))}
          </div>

          {/* Download button */}
          {log.media[activeIdx] && (
            <button
              className="log-view__download-btn"
              onClick={() => handleDownload(log.media[activeIdx])}
              aria-label="저장"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v13M12 16l-5-5M12 16l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          )}

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
