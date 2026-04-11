import React, { useState, useEffect, useRef } from 'react'
import GIF from 'gif.js'
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
          onLoadedMetadata={e => e.target.play().catch(() => {})}
          onCanPlay={e => e.target.play().catch(() => {})}
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

  // Overlay text (user-positioned)
  if (item.overlay?.text) {
    const fontSizeMap = { small: '13px', medium: '19px', large: '28px' }
    const fontSize = fontSizeMap[item.overlay.size || 'medium']
    ctx.save()
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.font = `600 ${fontSize} -apple-system, sans-serif`
    ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgba(0,0,0,0.65)'
    ctx.shadowBlur = 10
    const ox = (item.overlay.x / 100) * W
    const oy = (item.overlay.y / 100) * H
    ctx.fillText(item.overlay.text, ox, oy)
    ctx.restore()
  }

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

/* ─── Blob builder (heavy async work — call during "generate") ───────── */
async function buildBlob(logs, titleText, onProgress) {
  const allMedia = logs
    .flatMap(log =>
      (log.media || []).map(m => ({ ...m, logDate: log.date }))
    )
    .slice(0, 12)

  if (allMedia.length === 0) return null

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

  // Pre-load images; for video items, seek to first frame and capture
  const loadedImages = await Promise.all(
    allMedia.map((item, i) => {
      const src = resolvedSrcs[i]
      if (!src) return Promise.resolve(null)
      if (item.type === 'video') {
        return new Promise(resolve => {
          const vid = document.createElement('video')
          vid.muted = true
          vid.playsInline = true
          vid.preload = 'auto'

          let settled = false
          const settle = (val) => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            resolve(val)
          }
          const timer = setTimeout(() => settle(null), 5000)

          const captureFrame = () => {
            try {
              const tc = document.createElement('canvas')
              tc.width = vid.videoWidth || 390
              tc.height = vid.videoHeight || 690
              tc.getContext('2d').drawImage(vid, 0, 0, tc.width, tc.height)
              const snap = new Image()
              snap.onload = () => settle(snap)
              snap.onerror = () => settle(null)
              snap.src = tc.toDataURL('image/jpeg', 0.85)
            } catch {
              settle(null)
            }
          }

          vid.onloadedmetadata = () => { vid.currentTime = 0.1 }
          vid.onseeked = captureFrame
          vid.onloadeddata = () => {
            setTimeout(() => { if (!settled) captureFrame() }, 200)
          }
          vid.onerror = () => settle(null)
          vid.src = src
          vid.load()
        })
      }
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

  // ── iOS / no-recorder fallback: GIF ──
  if (!canRecord) {
    const gifBlob = await new Promise((resolve, reject) => {
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: W,
        height: H,
        workerScript: '/gif.worker.js',
      })

      for (let i = 0; i < allMedia.length; i++) {
        drawSlideToCanvas(ctx, W, H, loadedImages[i] || null, allMedia[i])
        gif.addFrame(canvas, { copy: true, delay: 2000 })
        onProgress?.(i + 1, allMedia.length)
      }

      gif.on('finished', blob => resolve(blob))
      gif.on('error', err => reject(err))
      gif.render()
    })
    cleanup()
    return { blob: gifBlob, fileName: `${titleText}.gif` }
  }

  // ── Canvas recording (Chrome / Android) ──
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
    ? 'video/webm;codecs=vp8'
    : 'video/webm'

  const stream   = canvas.captureStream(30)
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_000_000 })
  const chunks   = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  drawSlideToCanvas(ctx, W, H, loadedImages[0], allMedia[0])
  recorder.start(200)

  const SLIDE_MS = 2000
  for (let i = 0; i < allMedia.length; i++) {
    onProgress?.(i, allMedia.length)
    drawSlideToCanvas(ctx, W, H, loadedImages[i], allMedia[i])
    await new Promise(r => setTimeout(r, SLIDE_MS))
  }

  await new Promise(r => setTimeout(r, 300))

  await new Promise(resolve => {
    let settled = false
    const finish = () => { if (!settled) { settled = true; resolve() } }
    recorder.onstop  = finish
    recorder.onerror = finish
    setTimeout(finish, 5000)
    try { recorder.stop() } catch { finish() }
  })
  cleanup()

  const blob = new Blob(chunks, { type: 'video/webm' })

  // 녹화 데이터가 너무 작으면(인코딩 실패) GIF 폴백
  if (blob.size < 1000) {
    const gifBlob = await new Promise((resolve, reject) => {
      const gif = new GIF({ workers: 2, quality: 10, width: W, height: H, workerScript: '/gif.worker.js' })
      for (let i = 0; i < allMedia.length; i++) {
        drawSlideToCanvas(ctx, W, H, loadedImages[i] || null, allMedia[i])
        gif.addFrame(canvas, { copy: true, delay: 2000 })
      }
      gif.on('finished', b => resolve(b))
      gif.on('error', err => reject(err))
      gif.render()
    })
    return { blob: gifBlob, fileName: `${titleText}.gif` }
  }

  return { blob, fileName: `${titleText}.webm` }
}

/* ─── Save helpers ───────────────────────────────────────────────────── */
function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// 브라우저 다운로드 트리거 (데스크탑 + Android)
function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

// iOS는 await 이후에 navigator.share() 호출하면 user gesture 만료로 실패함.
// blob을 미리 만들어두고, 클릭 핸들러에서 await 없이 즉시 호출해야 함.
// 반환값: Promise (iOS share) | null (download 트리거됨)
function triggerSave(blob, fileName, titleText) {
  // 모바일(iOS/Android): Web Share API로 파일 공유
  if (isMobileDevice()) {
    const file = new File([blob], fileName, { type: blob.type })
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: titleText })
    }
    // canShare 없거나 false → 구형 iOS 등: 새 탭으로 열기 (사용자가 길게 눌러 저장)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    return null
  }

  // 데스크탑: navigator.share 건너뛰고 바로 다운로드
  downloadBlob(blob, fileName)
  return null
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
  const [generateError, setGenerateError]           = useState(false)
  const [saveStatus, setSaveStatus]                 = useState(null) // null | 'saving' | 'saved' | 'error'
  const [saveProgress, setSaveProgress]             = useState(null) // { cur, total }
  const [readyBlob, setReadyBlob]                   = useState(null) // { blob, fileName } — 미리 생성한 blob

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

  // "영상 생성하기" 클릭 → 실제로 blob을 만들어 readyBlob에 저장
  const handleGenerate = async () => {
    setGenerating(true)
    setReadyBlob(null)
    setSaveProgress(null)
    setGenerateError(false)
    try {
      const result = await buildBlob(relevantLogs, titleText, (cur, total) => {
        setSaveProgress({ cur: cur + 1, total })
      })
      if (!result) {
        setGenerateError(true)
        return
      }
      setReadyBlob(result)
      setGenerated(true)
    } catch (err) {
      console.error(err)
      setGenerateError(true)
    } finally {
      setGenerating(false)
      setSaveProgress(null)
    }
  }

  // "저장하기" 클릭 → await 없이 즉시 triggerSave 호출 (iOS user gesture 유지)
  const handleSave = () => {
    if (!readyBlob) return
    // setSaveStatus를 triggerSave 이전에 호출하지 않음 — iOS에서 React re-render가
    // user gesture를 소모해 navigator.share가 실패할 수 있기 때문
    let sharePromise
    try {
      sharePromise = triggerSave(readyBlob.blob, readyBlob.fileName, titleText)
    } catch (err) {
      console.error('triggerSave 오류:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
      return
    }

    if (!sharePromise) {
      // 다운로드 or 새 탭 열기가 트리거됨 (동기 완료)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
      return
    }

    // iOS navigator.share Promise 처리
    setSaveStatus('saving')
    sharePromise
      .then(() => {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus(null), 3000)
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          // 사용자가 공유 시트에서 취소
          setSaveStatus(null)
          return
        }
        console.error('share 오류:', err)
        setSaveStatus('error')
        setTimeout(() => setSaveStatus(null), 3000)
      })
  }

  const saveLabel = () => {
    if (saveStatus === 'saving') {
      if (saveProgress) return `저장 중... ${saveProgress.cur}/${saveProgress.total}`
      return '저장 중...'
    }
    if (saveStatus === 'saved') return '저장됨 ✓'
    if (saveStatus === 'error') return '저장 실패 — 다시 시도'
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
          <>
            <button
              className={`video-preview-generate-btn ${generating ? 'loading' : ''} ${generateError ? 'error' : ''}`}
              onClick={handleGenerate}
              disabled={generating || relevantLogs.length === 0}
            >
              {generating ? (
                <>
                  <span className="video-preview-generate-btn__spinner" />
                  {saveProgress
                    ? `생성 중... ${saveProgress.cur}/${saveProgress.total}`
                    : '영상 생성 중...'}
                </>
              ) : generateError ? (
                '생성 실패 — 다시 시도'
              ) : (
                '영상 생성하기'
              )}
            </button>
          </>
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
                disabled={saveStatus === 'saving' || !readyBlob}
              >
                {saveStatus === 'saving' && (
                  <span className="video-preview-done__btn-spinner" />
                )}
                {saveLabel()}
              </button>
              <button
                className="video-preview-done__btn video-preview-done__btn--reset"
                onClick={() => { setGenerated(false); setSaveStatus(null); setReadyBlob(null); setGenerateError(false) }}
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
