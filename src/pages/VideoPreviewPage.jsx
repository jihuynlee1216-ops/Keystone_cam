import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../store/AppContext.jsx'
import { useMediaSrc } from '../hooks/useMediaSrc.js'
import { getMedia } from '../store/mediaDB'
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

function SlideFrame({ item, phase, currentIdx, total }) {
  const mediaSrc = useMediaSrc(item)

  const bg = !mediaSrc
    ? PLACEHOLDER_GRADIENTS[currentIdx % PLACEHOLDER_GRADIENTS.length]
    : undefined

  const dateObj     = item.logDate ? new Date(item.logDate + 'T00:00:00') : null
  const displayDate = dateObj?.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

  return (
    <div
      className={`slideshow__frame slideshow__frame--${phase}`}
      style={{ background: bg }}
    >
      {/* ── Media ── */}
      {mediaSrc && item.type !== 'video' && (
        <img src={mediaSrc} alt="" className="slideshow__img" />
      )}
      {mediaSrc && item.type === 'video' && (
        <video
          key={mediaSrc}
          src={mediaSrc}
          className="slideshow__img"
          muted playsInline loop autoPlay preload="auto"
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
        {currentIdx + 1} / {total}
      </div>
    </div>
  )
}

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

  const item = allMedia[currentIdx]

  return (
    <div className={`slideshow slideshow--${transition}`}>
      <SlideFrame
        item={item}
        phase={phase}
        currentIdx={currentIdx}
        total={allMedia.length}
      />

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

/* ─── Canvas drawing helper ──────────────────────────────────────────── */
function drawSlideToCanvas(ctx, W, H, img, item) {
  ctx.fillStyle = '#0f3460'
  ctx.fillRect(0, 0, W, H)

  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight)
    const sw = img.naturalWidth * scale
    const sh = img.naturalHeight * scale
    ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh)
  }

  // Gradient vignette
  const grad = ctx.createLinearGradient(0, H * 0.45, 0, H)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.75)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  ctx.textBaseline = 'bottom'
  if (item.logDate) {
    const dateObj = new Date(item.logDate + 'T00:00:00')
    const displayDate = dateObj.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = '14px -apple-system, sans-serif'
    ctx.fillText(displayDate, 20, H - 46)
  }
  if (item.caption) {
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 17px -apple-system, sans-serif'
    ctx.fillText(item.caption, 20, H - 22)
  }
}

/* ─── Save helper ────────────────────────────────────────────────────── */
async function saveVideo(logs, titleText, onProgress) {
  const allMedia = logs
    .flatMap(log =>
      (log.media || []).map(m => ({ ...m, logDate: log.date }))
    )
    .slice(0, 12)

  if (allMedia.length === 0) return 'no-media'

  const W = 390, H = 690
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Resolve each media item to an src string
  const blobUrls = []
  const resolvedSrcs = []
  for (const item of allMedia) {
    let src = null
    if (item.dataUrl) {
      src = item.dataUrl
    } else if (item.mediaId) {
      const blob = await getMedia(item.mediaId)
      if (blob) {
        src = URL.createObjectURL(blob)
        blobUrls.push(src)
      }
    }
    resolvedSrcs.push(src)
  }

  // Pre-load images (skip video items)
  const loadedImages = await Promise.all(
    allMedia.map((item, i) => {
      const src = resolvedSrcs[i]
      if (!src || item.type === 'video') return Promise.resolve(null)
      return new Promise(resolve => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = src
      })
    })
  )

  const cleanup = () => blobUrls.forEach(u => URL.revokeObjectURL(u))

  const canRecord =
    typeof MediaRecorder !== 'undefined' &&
    typeof canvas.captureStream === 'function' &&
    (MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ||
     MediaRecorder.isTypeSupported('video/webm'))

  // ── iOS / no-recorder fallback: share/download as PNG ──
  if (!canRecord) {
    drawSlideToCanvas(ctx, W, H, loadedImages[0] || null, allMedia[0])
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    const file = new File([blob], `${titleText}.png`, { type: 'image/png' })
    cleanup()

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: titleText })
      return 'saved'
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${titleText}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return 'saved'
  }

  // ── Canvas recording (Chrome / Android) ──
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
    ? 'video/webm;codecs=vp8'
    : 'video/webm'
  // captureStream(0): 수동 프레임 제어 → requestFrame() 호출 시에만 캡처
  // (자동 24fps 방식은 일부 브라우저에서 검은 화면 발생)
  const stream   = canvas.captureStream(0)
  const videoTrack = stream.getVideoTracks()[0]
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_000_000 })
  const chunks   = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  // 첫 프레임 미리 그려두고 녹화 시작 (시작 부분 검은 화면 방지)
  drawSlideToCanvas(ctx, W, H, loadedImages[0], allMedia[0])
  if (videoTrack.requestFrame) videoTrack.requestFrame()
  recorder.start(200)

  const SLIDE_MS = 2000
  for (let i = 0; i < allMedia.length; i++) {
    onProgress?.(i, allMedia.length)
    drawSlideToCanvas(ctx, W, H, loadedImages[i], allMedia[i])
    // 각 슬라이드를 스트림에 명시적으로 전송
    if (videoTrack.requestFrame) videoTrack.requestFrame()
    // SLIDE_MS 동안 30fps로 동일 프레임을 반복 전송 (부드러운 영상)
    const frameInterval = setInterval(() => {
      if (videoTrack.requestFrame) videoTrack.requestFrame()
    }, 33)
    await new Promise(r => setTimeout(r, SLIDE_MS))
    clearInterval(frameInterval)
  }

  await new Promise(resolve => { recorder.onstop = resolve; recorder.stop() })
  cleanup()

  const blob = new Blob(chunks, { type: 'video/webm' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `${titleText}.webm`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return 'saved'
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
  const [saveStatus, setSaveStatus]                 = useState(null) // null | 'saving' | 'saved'
  const [saveProgress, setSaveProgress]             = useState(null) // { cur, total }

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

  const handleSave = async () => {
    setSaveStatus('saving')
    setSaveProgress(null)
    try {
      await saveVideo(relevantLogs, titleText, (cur, total) => {
        setSaveProgress({ cur: cur + 1, total })
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (err) {
      console.error(err)
      setSaveStatus(null)
    }
  }

  const saveLabel = () => {
    if (saveStatus === 'saving') {
      if (saveProgress) return `저장 중... ${saveProgress.cur}/${saveProgress.total}`
      return '저장 중...'
    }
    if (saveStatus === 'saved') return '저장됨 ✓'
    return '저장하기'
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
                <p className="video-preview-done__sub">
                  {saveStatus === 'saving' ? '기기에 저장하는 중...' : '기기에 저장할 수 있어요'}
                </p>
              </div>
            </div>
            <div className="video-preview-done__actions">
              <button
                className={`video-preview-done__btn video-preview-done__btn--save ${saveStatus ? saveStatus : ''}`}
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' && (
                  <span className="video-preview-done__btn-spinner" />
                )}
                {saveLabel()}
              </button>
              <button
                className="video-preview-done__btn video-preview-done__btn--reset"
                onClick={() => { setGenerated(false); setSaveStatus(null) }}
              >
                다시 만들기
              </button>
            </div>
          </div>
        )}

        {/* Save done toast */}
        {saveStatus === 'saved' && (
          <div className="video-preview-toast">기기에 저장됐어요</div>
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
