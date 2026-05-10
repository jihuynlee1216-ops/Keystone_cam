import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../store/AppContext.jsx'
import { useMediaSrc } from '../hooks/useMediaSrc.js'
import { getMedia } from '../store/mediaDB'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import BaseballCharacter from '../components/BaseballCharacter.jsx'
import BottomNav from '../components/BottomNav.jsx'
import './VideoPreviewPage.css'

const TRANSITIONS = ['fade', 'slide', 'zoom']
const MUSIC_OPTIONS = [
  { id: 'none',   label: '없음',   file: null },
  { id: 'soft',   label: '잔잔한', file: '/bgm-soft.wav' },
  { id: 'bright', label: '밝은',   file: '/bgm-bright.wav' },
  { id: 'epic',   label: '웅장한', file: '/bgm-epic.wav' },
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
    .sort((a, b) => a.logDate.localeCompare(b.logDate))
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

/* ─── Canvas drawing helpers ─────────────────────────────────────────── */
function drawOverlayOnly(ctx, W, H, item) {
  // 투명 배경 위에 그라데이션 + 텍스트만 그리기
  ctx.clearRect(0, 0, W, H)

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

function drawSlideToCanvas(ctx, W, H, img, item) {
  ctx.fillStyle = '#0f3460'
  ctx.fillRect(0, 0, W, H)

  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight)
    const sw = img.naturalWidth * scale
    const sh = img.naturalHeight * scale
    ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh)
  }

  drawOverlayOnly(ctx, W, H, item)
}

// 캔버스를 PNG Uint8Array로 변환
async function canvasToPngBytes(canvas) {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
  return new Uint8Array(await blob.arrayBuffer())
}

/* ─── FFmpeg 싱글톤 ─────────────────────────────────────────────────── */
let ffmpegInstance = null
async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance
  const ffmpeg = new FFmpeg()
  await ffmpeg.load()
  ffmpegInstance = ffmpeg
  return ffmpeg
}

/* ─── Save helper (MP4) ─────────────────────────────────────────────── */
async function saveVideo(logs, titleText, bgmFile, onProgress) {
  const allMedia = logs
    .flatMap(log =>
      (log.media || []).map(m => ({ ...m, logDate: log.date }))
    )
    .sort((a, b) => a.logDate.localeCompare(b.logDate))
    .slice(0, 12)

  if (allMedia.length === 0) return 'no-media'

  const W = 390, H = 690
  const PHOTO_DURATION = 1 // 사진 표시 시간 (초)
  const MAX_VIDEO_DURATION = 3 // 영상 최대 길이 (초)

  const ffmpeg = await getFFmpeg()

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // 각 미디어를 blob으로 가져오기
  const blobUrls = []
  const segments = [] // { filename, type, duration }

  for (let i = 0; i < allMedia.length; i++) {
    onProgress?.(i, allMedia.length)
    const item = allMedia[i]
    let blob = null

    if (item.dataUrl) {
      const res = await fetch(item.dataUrl)
      blob = await res.blob()
    } else if (item.mediaId) {
      blob = await getMedia(item.mediaId)
    }
    if (!blob) continue

    const data = await fetchFile(blob)

    if (item.type === 'video') {
      // 영상: 원본 + 오버레이 PNG 합성
      const inputName = `input_${i}.mp4`
      const overlayName = `overlay_${i}.png`
      const segName = `seg_${i}.mp4`
      await ffmpeg.writeFile(inputName, data)

      // 오버레이 PNG 생성 (투명 배경 + 텍스트/그라데이션)
      drawOverlayOnly(ctx, W, H, item)
      const overlayPng = await canvasToPngBytes(canvas)
      await ffmpeg.writeFile(overlayName, overlayPng)

      // 영상 크기 맞추고 오버레이 합성, 최대 3초
      await ffmpeg.exec([
        '-i', inputName,
        '-i', overlayName,
        '-t', String(MAX_VIDEO_DURATION),
        '-filter_complex',
        `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[v];[v][1:v]overlay=0:0`,
        '-c:v', 'libx264', '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p',
        '-an',
        '-y', segName
      ])
      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(overlayName)
      segments.push({ filename: segName, type: 'video' })
    } else {
      // 사진: 원본 이미지 + 오버레이 PNG → FFmpeg overlay 합성 → 1초 영상
      const inputName = `input_${i}.jpg`
      const overlayName = `overlay_${i}.png`
      const segName = `seg_${i}.mp4`
      await ffmpeg.writeFile(inputName, data)

      // 오버레이 PNG 생성 (투명 배경 + 텍스트/그라데이션)
      drawOverlayOnly(ctx, W, H, item)
      const overlayPng = await canvasToPngBytes(canvas)
      await ffmpeg.writeFile(overlayName, overlayPng)

      await ffmpeg.exec([
        '-loop', '1', '-i', inputName,
        '-i', overlayName,
        '-t', String(PHOTO_DURATION),
        '-filter_complex',
        `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[v];[v][1:v]overlay=0:0`,
        '-c:v', 'libx264', '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p',
        '-y', segName
      ])
      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(overlayName)
      segments.push({ filename: segName, type: 'photo' })
    }
  }

  if (segments.length === 0) return 'no-media'

  // concat 파일 목록 생성
  const concatList = segments.map(s => `file '${s.filename}'`).join('\n')
  await ffmpeg.writeFile('list.txt', new TextEncoder().encode(concatList))

  // 모든 세그먼트를 하나의 MP4로 합치기 (영상만)
  await ffmpeg.exec([
    '-f', 'concat', '-safe', '0',
    '-i', 'list.txt',
    '-c:v', 'libx264', '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-y', 'video_only.mp4'
  ])

  // 정리
  for (const s of segments) {
    await ffmpeg.deleteFile(s.filename).catch(() => {})
  }
  await ffmpeg.deleteFile('list.txt').catch(() => {})

  // BGM 합성
  let finalFile = 'video_only.mp4'
  if (bgmFile) {
    const bgmRes = await fetch(bgmFile)
    const bgmBlob = await bgmRes.blob()
    const bgmData = await fetchFile(bgmBlob)
    await ffmpeg.writeFile('bgm.wav', bgmData)

    await ffmpeg.exec([
      '-i', 'video_only.mp4',
      '-i', 'bgm.wav',
      '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '128k',
      '-shortest',
      '-movflags', '+faststart',
      '-y', 'output.mp4'
    ])
    await ffmpeg.deleteFile('video_only.mp4').catch(() => {})
    await ffmpeg.deleteFile('bgm.wav').catch(() => {})
    finalFile = 'output.mp4'
  }

  const outputData = await ffmpeg.readFile(finalFile)
  await ffmpeg.deleteFile(finalFile).catch(() => {})
  const blob = new Blob([outputData], { type: 'video/mp4' })

  blobUrls.forEach(u => URL.revokeObjectURL(u))

  const filename = `${titleText}.mp4`

  // Capacitor 네이티브 앱: WKWebView 메시지 핸들러로 사진 앨범에 저장
  if (window.webkit?.messageHandlers?.saveToGallery) {
    const reader = new FileReader()
    const base64 = await new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result.split(',')[1])
      reader.readAsDataURL(blob)
    })

    await new Promise((resolve, reject) => {
      window.__galleryCallback = (err) => {
        delete window.__galleryCallback
        if (err) reject(new Error(err))
        else resolve()
      }
      window.webkit.messageHandlers.saveToGallery.postMessage({ data: base64, type: 'video/mp4' })
    })
    return 'saved'
  }

  // 웹: 기존 방식 유지
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS && navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: 'video/mp4' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: titleText })
      } catch (e) { if (e.name !== 'AbortError') throw e }
      return 'saved'
    }
  }

  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url
  a.download = filename
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
  const [selectedMusic, setSelectedMusic]           = useState('none')
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
      const bgmFile = MUSIC_OPTIONS.find(m => m.id === selectedMusic)?.file || null
      await saveVideo(relevantLogs, titleText, bgmFile, (cur, total) => {
        setSaveProgress({ cur: cur + 1, total })
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (err) {
      console.error(err)
      alert('저장 오류: ' + (err.message || err))
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
