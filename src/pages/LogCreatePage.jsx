import React, { useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, generateId } from '../store/AppContext.jsx'
import { putMedia } from '../store/mediaDB.js'
import PageHeader from '../components/PageHeader.jsx'
import './LogCreatePage.css'

const SIZE_OPTIONS = ['small', 'medium', 'large']
const SIZE_LABELS = { small: 'S', medium: 'M', large: 'L' }

function MediaEditorCard({ item, onUpdate, onRemove, isActive }) {
  const [showOverlayEditor, setShowOverlayEditor] = useState(false)
  const [overlayDraft, setOverlayDraft] = useState(
    item.overlay || { text: '', x: 50, y: 50, size: 'medium' }
  )
  const mediaRef = useRef(null)
  // 업로드 중엔 item.dataUrl이 항상 유효 (base64 or blob URL)
  // useMediaSrc 훅 없이 직접 사용해서 StrictMode race condition 방지
  const mediaSrc = item.dataUrl || null

  const handleTapPosition = useCallback((e) => {
    if (!showOverlayEditor) return
    const rect = e.currentTarget.getBoundingClientRect()
    const touch = e.touches?.[0] || e
    const x = ((touch.clientX - rect.left) / rect.width) * 100
    const y = ((touch.clientY - rect.top) / rect.height) * 100
    setOverlayDraft(d => ({ ...d, x: Math.round(x), y: Math.round(y) }))
  }, [showOverlayEditor])

  const saveOverlay = () => {
    if (overlayDraft.text.trim()) {
      onUpdate({ overlay: overlayDraft })
    } else {
      onUpdate({ overlay: null })
    }
    setShowOverlayEditor(false)
  }

  const fontSizeMap = { small: '13px', medium: '18px', large: '26px' }
  const bg = mediaSrc
    ? undefined
    : `linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)`

  return (
    <div className={`media-editor-card ${isActive ? 'active' : ''}`}>
      {/* Media preview area */}
      <div
        className="media-editor-card__preview"
        style={{ background: bg }}
        ref={mediaRef}
        onClick={handleTapPosition}
        onTouchEnd={handleTapPosition}
      >
        {mediaSrc && item.type === 'image' && (
          <img src={mediaSrc} alt="" className="media-editor-card__img" />
        )}
        {mediaSrc && item.type === 'video' && (
          <video
            key={mediaSrc}
            src={mediaSrc}
            className="media-editor-card__img"
            muted
            playsInline
            loop
            autoPlay
            preload="auto"
            onCanPlay={e => e.target.play().catch(() => { })}
          />
        )}

        {!mediaSrc && (
          <div className="media-editor-card__placeholder">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z"
                stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
              <path d="M14 3v6h6" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            </svg>
          </div>
        )}

        {/* Overlay text preview */}
        {(item.overlay?.text || (showOverlayEditor && overlayDraft.text)) && (
          <div
            className="media-editor-card__overlay-text"
            style={{
              left: `${(item.overlay || overlayDraft).x}%`,
              top: `${(item.overlay || overlayDraft).y}%`,
              fontSize: fontSizeMap[(item.overlay || overlayDraft).size || 'medium'],
            }}
          >
            {item.overlay?.text || overlayDraft.text}
          </div>
        )}

        {showOverlayEditor && (
          <div className="media-editor-card__tap-hint">
            탭해서 위치 지정
          </div>
        )}

        {/* Remove button */}
        <button className="media-editor-card__remove" onClick={(e) => { e.stopPropagation(); onRemove() }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Caption input */}
      <input
        className="media-editor-card__caption-input"
        placeholder="캡션 추가..."
        value={item.caption}
        onChange={e => onUpdate({ caption: e.target.value })}
        maxLength={60}
      />

      {/* Text overlay controls */}
      <div className="media-editor-card__controls">
        <button
          className={`media-editor-card__ctrl-btn ${showOverlayEditor ? 'active' : ''}`}
          onClick={() => setShowOverlayEditor(v => !v)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M4 12h10M4 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          텍스트 오버레이
        </button>
      </div>

      {/* Overlay editor panel */}
      {showOverlayEditor && (
        <div className="media-editor-card__overlay-panel">
          <input
            className="media-editor-card__overlay-input"
            placeholder="오버레이 텍스트..."
            value={overlayDraft.text}
            onChange={e => setOverlayDraft(d => ({ ...d, text: e.target.value }))}
            maxLength={40}
            autoFocus
          />
          <div className="media-editor-card__size-btns">
            {SIZE_OPTIONS.map(s => (
              <button
                key={s}
                className={`media-editor-card__size-btn ${overlayDraft.size === s ? 'active' : ''}`}
                onClick={() => setOverlayDraft(d => ({ ...d, size: s }))}
              >
                {SIZE_LABELS[s]}
              </button>
            ))}
          </div>
          <button className="media-editor-card__overlay-save" onClick={saveOverlay}>
            적용
          </button>
        </div>
      )}
    </div>
  )
}

export default function LogCreatePage() {
  const navigate = useNavigate()
  const { date } = useParams()
  const { dispatch } = useApp()

  const fileInputRef = useRef(null)
  const dbSavedIds = useRef(new Set()) // IndexedDB 저장 성공한 mediaId 목록
  const savePromises = useRef(new Map()) // mediaId → Promise (저장 완료 추적)
  const blobCache = useRef(new Map()) // mediaId → 압축 blob (저장 시 base64 변환용)

  // iOS Safari에서 IDB 트랜잭션이 무한 대기하는 버그 방지용 타임아웃
  const withIDBTimeout = (p, ms = 15000) =>
    Promise.race([p.then(() => true), new Promise(resolve => setTimeout(() => resolve(false), ms))])

  const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  const [opponent, setOpponent] = useState('')
  const [venue, setVenue] = useState('')
  const [memo, setMemo] = useState('')
  const [media, setMedia] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [saving, setSaving] = useState(false)

  // Parse date for display
  const dateObj = new Date(date + 'T00:00:00')
  const displayDate = dateObj.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  const compressToBlob = (file, maxDim = 1200, quality = 0.82) =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const img = new Image()
        img.onload = () => {
          let { width, height } = img
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * maxDim / width); width = maxDim }
            else { width = Math.round(width * maxDim / height); height = maxDim }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          canvas.getContext('2d').drawImage(img, 0, 0, width, height)
          canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', quality)
        }
        img.onerror = () => resolve(file)
        img.src = ev.target.result
      }
      reader.onerror = () => resolve(file)
      reader.readAsDataURL(file)
    })

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const isVideo = file.type.startsWith('video') || file.name?.match(/\.(mp4|mov|avi|webm|mkv)$/i)
      const mediaId = generateId()
      const itemId  = generateId()

      if (isVideo) {
        // 영상: blob URL로 즉시 프리뷰 (base64로 읽으면 수십MB → 메모리 부족)
        const tempUrl = URL.createObjectURL(file)
        setMedia(prev => [...prev, { id: itemId, type: 'video', dataUrl: tempUrl, mediaId, caption: '', overlay: null }])

        const p = withIDBTimeout(putMedia(mediaId, file))
          .then(ok => { if (ok) dbSavedIds.current.add(mediaId) })
          .catch(err => { console.warn('영상 IndexedDB 저장 실패:', err) })
        savePromises.current.set(mediaId, p)
      } else {
        // 사진: FileReader로 즉시 base64 프리뷰 (iOS PWA 등에서 blob URL보다 안정적)
        // 동시에 압축 blob을 IDB에 백업하고 blobCache에 캐시 (handleSave에서 압축본으로 교체)
        const reader = new FileReader()
        reader.onload = (ev) => {
          setMedia(prev => [...prev, { id: itemId, type: 'image', dataUrl: ev.target.result, mediaId, caption: '', overlay: null }])
        }
        reader.readAsDataURL(file)

        const p = compressToBlob(file)
          .then(blob => {
            blobCache.current.set(mediaId, blob)
            return withIDBTimeout(putMedia(mediaId, blob))
          })
          .then(ok => { if (ok) dbSavedIds.current.add(mediaId) })
          .catch(err => { console.warn('사진 IndexedDB 저장 실패:', err) })
        savePromises.current.set(mediaId, p)
      }
    })
    e.target.value = ''
  }

  const updateMediaItem = (id, patch) => {
    setMedia(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }

  const removeMediaItem = (id) => {
    setMedia(prev => prev.filter(m => m.id !== id))
    setActiveIdx(0)
  }

  const handleSave = async () => {
    setSaving(true)
    // 사진 압축·IDB 저장 완료 대기 (타임아웃 있어서 절대 멈추지 않음)
    await Promise.all([...savePromises.current.values()])

    // 이미지: 압축 blob(blobCache) → base64로 교체 (원본 raw base64보다 훨씬 작아 localStorage 절약)
    //         blobCache에 없으면 media의 raw base64 그대로 사용
    // 영상:  blob URL은 세션 종료 후 무효 → null로 교체, 재시작 시 IDB에서 로드
    const cleanMedia = await Promise.all(
      media.map(async (item) => {
        if (item.type === 'image' && item.mediaId) {
          const blob = blobCache.current.get(item.mediaId)
          if (blob) {
            try {
              const dataUrl = await blobToDataUrl(blob)
              return { ...item, dataUrl }
            } catch { /* 실패 시 raw base64 그대로 */ }
          }
        }
        if (item.type === 'video' && item.dataUrl?.startsWith('blob:')) {
          return { ...item, dataUrl: null }
        }
        return item
      })
    )
    blobCache.current.clear()

    dispatch({
      type: 'ADD_LOG',
      payload: {
        id: generateId(),
        date,
        opponent: opponent.trim(),
        venue: venue.trim(),
        memo: memo.trim(),
        media: cleanMedia,
        teamColor: 'var(--color-accent)',
        createdAt: new Date().toISOString(),
      },
    })
    navigate(`/log/${date}`, { replace: true })
  }

  const canSave = memo.trim() || media.length > 0

  return (
    <div className="log-create">
      <PageHeader
        title="새 기록"
        subtitle={displayDate}
        actions={
          <button
            className={`log-create__save-btn ${canSave ? 'enabled' : ''} ${saving ? 'saving' : ''}`}
            onClick={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? '저장 중' : '저장'}
          </button>
        }
      />

      <div className="log-create__body">
        {/* ── Media section ── */}
        <section className="log-create__media-section">
          {media.length === 0 ? (
            <button
              className="log-create__media-empty"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="log-create__media-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="log-create__media-empty-label">사진 · 영상 추가</span>
              <span className="log-create__media-empty-hint">여러 장 선택 가능</span>
            </button>
          ) : (
            <div className="log-create__media-scroll-wrap">
              {/* Card scroll strip */}
              <div className="log-create__media-scroll">
                {media.map((item, idx) => (
                  <MediaEditorCard
                    key={item.id}
                    item={item}
                    isActive={idx === activeIdx}
                    onUpdate={(patch) => updateMediaItem(item.id, patch)}
                    onRemove={() => removeMediaItem(item.id)}
                  />
                ))}

                {/* Add more */}
                <button
                  className="log-create__add-more"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Scroll indicator dots */}
              {media.length > 1 && (
                <div className="log-create__media-dots">
                  {media.map((_, i) => (
                    <div
                      key={i}
                      className={`log-create__media-dot ${i === activeIdx ? 'active' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </section>

        {/* ── Form fields ── */}
        <section className="log-create__form">
          <div className="log-create__field">
            <label className="log-create__field-label">상대 팀</label>
            <input
              className="log-create__field-input"
              type="text"
              placeholder="예) LG 트윈스 (선택)"
              value={opponent}
              onChange={e => setOpponent(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="log-create__field">
            <label className="log-create__field-label">경기장</label>
            <input
              className="log-create__field-input"
              type="text"
              placeholder="예) 잠실 야구장 (선택)"
              value={venue}
              onChange={e => setVenue(e.target.value)}
              maxLength={40}
            />
          </div>

          <div className="log-create__field">
            <label className="log-create__field-label">
              메모
              <span className="log-create__field-required">*</span>
            </label>
            <textarea
              className="log-create__field-textarea"
              placeholder="오늘 경기가 어땠나요? 느꼈던 감정을 자유롭게..."
              value={memo}
              onChange={e => setMemo(e.target.value)}
              maxLength={200}
              rows={3}
            />
            <span className="log-create__char-count">{memo.length} / 200</span>
          </div>
        </section>
      </div>
    </div>
  )
}
