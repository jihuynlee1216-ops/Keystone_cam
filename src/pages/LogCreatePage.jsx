import React, { useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, generateId } from '../store/AppContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import './LogCreatePage.css'

const SIZE_OPTIONS = ['small', 'medium', 'large']
const SIZE_LABELS  = { small: 'S', medium: 'M', large: 'L' }

function MediaEditorCard({ item, onUpdate, onRemove, isActive }) {
  const [showOverlayEditor, setShowOverlayEditor] = useState(false)
  const [overlayDraft, setOverlayDraft] = useState(
    item.overlay || { text: '', x: 50, y: 50, size: 'medium' }
  )
  const mediaRef = useRef(null)

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
  const bg = item.dataUrl
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
        {item.dataUrl && item.type === 'image' && (
          <img src={item.dataUrl} alt="" className="media-editor-card__img" />
        )}
        {item.dataUrl && item.type === 'video' && (
          <video src={item.dataUrl} className="media-editor-card__img" muted playsInline loop autoPlay />
        )}

        {!item.dataUrl && (
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
              top:  `${(item.overlay || overlayDraft).y}%`,
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
  const navigate   = useNavigate()
  const { date }   = useParams()
  const { dispatch } = useApp()

  const fileInputRef = useRef(null)

  const [opponent, setOpponent] = useState('')
  const [venue, setVenue]       = useState('')
  const [memo, setMemo]         = useState('')
  const [media, setMedia]       = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [saving, setSaving]     = useState(false)

  // Parse date for display
  const dateObj = new Date(date + 'T00:00:00')
  const displayDate = dateObj.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const item = {
          id: generateId(),
          type: file.type.startsWith('video') ? 'video' : 'image',
          dataUrl: ev.target.result,
          caption: '',
          overlay: null,
        }
        setMedia(prev => [...prev, item])
        setActiveIdx(prev => (prev >= media.length ? media.length : prev))
      }
      reader.readAsDataURL(file)
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

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      dispatch({
        type: 'ADD_LOG',
        payload: {
          id: generateId(),
          date,
          opponent: opponent.trim(),
          venue: venue.trim(),
          memo: memo.trim(),
          media,
          teamColor: 'var(--color-accent)',
          createdAt: new Date().toISOString(),
        },
      })
      navigate(`/log/${date}`, { replace: true })
    }, 600)
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
