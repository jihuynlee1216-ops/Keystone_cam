import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../store/AppContext.jsx'
import BaseballCharacter from '../components/BaseballCharacter.jsx'
import BottomNav from '../components/BottomNav.jsx'
import './VideoPreviewPage.css'

const TRANSITIONS = ['fade', 'slide', 'zoom']
const MUSIC_OPTIONS = [
  { id: 'none',   label: '없음' },
  { id: 'soft',   label: '잔잔한' },
  { id: 'bright', label: '밝은' },
  { id: 'epic',   label: '웅장한' },
]

const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(145deg, #1a1a2e 0%, #0f3460 100%)',
  'linear-gradient(145deg, #0d0d0d 0%, #2d2d2d 100%)',
  'linear-gradient(145deg, #1e3a5f 0%, #1a3a5c 100%)',
  'linear-gradient(145deg, #2c1654 0%, #1a0d33 100%)',
  'linear-gradient(145deg, #0a1628 0%, #0d2137 100%)',
]

const OVERLAY_FONT_SIZE = { small: '13px', medium: '19px', large: '28px' }

function Slideshow({ logs, transition }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase]           = useState('visible') // 'visible' | 'exit' | 'enter'
  const timerRef = useRef(null)

  const allMedia = logs
    .flatMap(log =>
      (log.media || []).map(m => ({ ...m, logDate: log.date, memo: log.memo, opponent: log.opponent }))
    )
    .slice(0, 12)

  useEffect(() => {
    setCurrentIdx(0)
    setPhase('visible')
  }, [logs.length])

  useEffect(() => {
    if (allMedia.length <= 1) return
    timerRef.current = setInterval(() => {
      setPhase('exit')
      setTimeout(() => {
        setCurrentIdx(i => (i + 1) % allMedia.length)
        setPhase('enter')
        // brief enter → visible
        setTimeout(() => setPhase('visible'), 50)
      }, 380)
    }, 3000)
    return () => clearInterval(timerRef.current)
  }, [allMedia.length])

  if (allMedia.length === 0) {
    return (
      <div className="slideshow slideshow--empty">
        <BaseballCharacter size={64} mood="idle" className="slideshow__empty-char" />
        <p className="slideshow__empty-text">사진이 없어요</p>
        <p className="slideshow__empty-sub">기록을 추가하면 영상 미리보기가 가능해요</p>
      </div>
    )
  }

  const item    = allMedia[currentIdx]
  const hasData = !!item?.dataUrl
  const bg      = !hasData
    ? PLACEHOLDER_GRADIENTS[currentIdx % PLACEHOLDER_GRADIENTS.length]
    : undefined

  const dateObj     = item.logDate ? new Date(item.logDate + 'T00:00:00') : null
  const displayDate = dateObj?.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

  return (
    <div className={`slideshow slideshow--${transition}`}>
      <div
        className={`slideshow__frame slideshow__frame--${phase}`}
        style={{ background: bg }}
      >
        {/* ── Media ── */}
        {hasData && item.type !== 'video' && (
          <img src={item.dataUrl} alt="" className="slideshow__img" />
        )}
        {hasData && item.type === 'video' && (
          <video
            src={item.dataUrl}
            className="slideshow__img"
            muted playsInline loop autoPlay
          />
        )}

        {/* ── Gradient vignette ── */}
        <div className="slideshow__gradient" />

        {/* ── Text overlay from media item (the one the user positioned) ── */}
        {item?.overlay?.text && (
          <div
            className="slideshow__overlay-text"
            style={{
              left:     `${item.overlay.x}%`,
              top:      `${item.overlay.y}%`,
              fontSize: OVERLAY_FONT_SIZE[item.overlay.size || 'medium'],
            }}
          >
            {item.overlay.text}
          </div>
        )}

        {/* ── Bottom caption + date ── */}
        <div className="slideshow__text-block">
          {displayDate && <span className="slideshow__slide-date">{displayDate}</span>}
          {item?.caption && <span className="slideshow__slide-caption">{item.caption}</span>}
        </div>

        {/* Slide counter */}
        <div className="slideshow__counter">
          {currentIdx + 1} / {allMedia.length}
        </div>
      </div>

      {/* Progress bar */}
      {allMedia.length > 1 && (
        <div className="slideshow__progress">
          {allMedia.map((_, i) => (
            <div
              key={i}
              className={`slideshow__progress-seg ${
                i === currentIdx ? 'active' : i < currentIdx ? 'done' : ''
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Share helper ───────────────────────────────────────────────────── */
async function shareVideo(title, desc) {
  const shareData = {
    title,
    text: `${title}\n${desc}`,
    url: window.location.origin,
  }
  if (navigator.canShare && navigator.canShare(shareData)) {
    await navigator.share(shareData)
    return 'shared'
  }
  // Fallback: clipboard
  await navigator.clipboard.writeText(`${title}\n${desc}\n${window.location.origin}`)
  return 'copied'
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function VideoPreviewPage() {
  const navigate  = useNavigate()
  const { type }  = useParams()
  const { state } = useApp()

  const [selectedTransition, setSelectedTransition] = useState('fade')
  const [selectedMusic, setSelectedMusic]           = useState('soft')
  const [generating, setGenerating]                 = useState(false)
  const [generated, setGenerated]                   = useState(false)
  const [shareStatus, setShareStatus]               = useState(null) // null | 'sharing' | 'copied'

  const now          = new Date()
  const currentYear  = now.getFullYear()
  const currentMon   = now.getMonth() + 1
  const relevantLogs = filterLogsByType(state.logs, type, currentYear, currentMon)

  const titleText = type === 'monthly'
    ? `나의 ${currentMon}월 직관로그`
    : `나의 ${currentYear} 시즌 로그`

  const descText = type === 'monthly'
    ? `${currentMon}월의 경기 ${relevantLogs.length}개`
    : `${currentYear} 시즌 총 ${relevantLogs.length}경기`

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => { setGenerating(false); setGenerated(true) }, 2400)
  }

  const handleShare = async () => {
    setShareStatus('sharing')
    try {
      const result = await shareVideo(titleText, descText)
      setShareStatus(result === 'copied' ? 'copied' : null)
      if (result === 'copied') setTimeout(() => setShareStatus(null), 2200)
    } catch (err) {
      if (err.name !== 'AbortError') setShareStatus(null)
      else setShareStatus(null)
    }
  }

  return (
    <div className="video-preview-page">
      <header className="video-preview-header">
        <div className="video-preview-header__nav">
          <button className="video-preview-header__back" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="video-preview-header__tabs">
            <button
              className={`video-preview-header__tab ${type === 'monthly' ? 'active' : ''}`}
              onClick={() => navigate('/video/monthly', { replace: true })}
            >
              월간
            </button>
            <button
              className={`video-preview-header__tab ${type === 'seasonal' ? 'active' : ''}`}
              onClick={() => navigate('/video/seasonal', { replace: true })}
            >
              시즌
            </button>
          </div>
          <div style={{ width: 40 }} />
        </div>
      </header>

      <div className="video-preview-body">
        {/* ── Player ── */}
        <div className="video-preview-player-wrap">
          <Slideshow logs={relevantLogs} transition={selectedTransition} />
          <div className="video-preview-player-title">
            <span className="video-preview-player-title__main">{titleText}</span>
            <span className="video-preview-player-title__sub">{descText}</span>
          </div>
        </div>

        {/* ── Settings ── */}
        <div className="video-preview-settings">
          <div className="video-preview-settings__section">
            <p className="video-preview-settings__label">전환 효과</p>
            <div className="video-preview-settings__chips">
              {TRANSITIONS.map(t => (
                <button
                  key={t}
                  className={`video-preview-settings__chip ${selectedTransition === t ? 'active' : ''}`}
                  onClick={() => setSelectedTransition(t)}
                >
                  {t === 'fade' ? '페이드' : t === 'slide' ? '슬라이드' : '줌인'}
                </button>
              ))}
            </div>
          </div>

          <div className="video-preview-settings__section">
            <p className="video-preview-settings__label">배경 음악</p>
            <div className="video-preview-settings__chips">
              {MUSIC_OPTIONS.map(m => (
                <button
                  key={m.id}
                  className={`video-preview-settings__chip ${selectedMusic === m.id ? 'active' : ''}`}
                  onClick={() => setSelectedMusic(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Generate / Done ── */}
        {!generated ? (
          <button
            className={`video-preview-generate-btn ${generating ? 'loading' : ''}`}
            onClick={handleGenerate}
            disabled={generating || relevantLogs.length === 0}
          >
            {generating ? (
              <>
                <span className="video-preview-generate-btn__spinner" />
                영상 생성 중...
              </>
            ) : (
              '영상 생성하기'
            )}
          </button>
        ) : (
          <div className="video-preview-done">
            <div className="video-preview-done__left">
              <BaseballCharacter size={56} mood="cheer" className="video-preview-done__char" />
              <div>
                <p className="video-preview-done__title">영상이 준비됐어요!</p>
                <p className="video-preview-done__sub">저장 또는 공유할 수 있어요</p>
              </div>
            </div>
            <div className="video-preview-done__actions">
              <button
                className={`video-preview-done__btn video-preview-done__btn--share ${shareStatus ? 'sharing' : ''}`}
                onClick={handleShare}
                disabled={shareStatus === 'sharing'}
              >
                {shareStatus === 'copied' ? '링크 복사됨 ✓' : shareStatus === 'sharing' ? '공유 중...' : '공유하기'}
              </button>
              <button
                className="video-preview-done__btn video-preview-done__btn--reset"
                onClick={() => setGenerated(false)}
              >
                다시 만들기
              </button>
            </div>
          </div>
        )}

        {/* Clipboard toast */}
        {shareStatus === 'copied' && (
          <div className="video-preview-toast">링크가 복사됐어요</div>
        )}
      </div>

      <div className="video-preview-page__spacer" />
      <BottomNav />
    </div>
  )
}

function filterLogsByType(logs, type, year, month) {
  if (type === 'monthly') {
    return logs.filter(l => {
      const d = new Date(l.date)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
  }
  return logs.filter(l => new Date(l.date).getFullYear() === year)
}
