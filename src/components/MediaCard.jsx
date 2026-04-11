import React from 'react'
import { useMediaSrc } from '../hooks/useMediaSrc.js'
import './MediaCard.css'

/* Placeholder gradient images for seed data */
const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
  'linear-gradient(145deg, #0d0d0d 0%, #1a1a1a 40%, #2d2d2d 100%)',
  'linear-gradient(145deg, #1e3a5f 0%, #2d5986 40%, #1a3a5c 100%)',
  'linear-gradient(145deg, #2c1654 0%, #3d1f6e 40%, #1a0d33 100%)',
  'linear-gradient(145deg, #0a1628 0%, #1c3a5e 40%, #0d2137 100%)',
]

function getPlaceholder(id) {
  const idx = (id?.charCodeAt(id.length - 1) || 0) % PLACEHOLDER_GRADIENTS.length
  return PLACEHOLDER_GRADIENTS[idx]
}

export default function MediaCard({ item, index = 0, onClick }) {
  const isImage  = item.type !== 'video'
  const mediaSrc = useMediaSrc(item)
  const hasMedia = !!mediaSrc

  const fontSizeMap = { small: '13px', medium: '18px', large: '26px' }
  const overlaySize = fontSizeMap[item.overlay?.size || 'medium']

  return (
    <div className="media-card" onClick={onClick} role={onClick ? 'button' : undefined}>
      <div
        className="media-card__media"
        style={!hasMedia ? { background: getPlaceholder(item.id) } : undefined}
      >
        {hasMedia && isImage && (
          <img src={mediaSrc} alt={item.caption || ''} className="media-card__img" />
        )}
        {hasMedia && !isImage && (
          <video
            src={mediaSrc}
            className="media-card__video"
            muted playsInline loop autoPlay
            onLoadedMetadata={e => e.target.play().catch(() => {})}
            onCanPlay={e => e.target.play().catch(() => {})}
          />
        )}

        {/* Text overlay */}
        {item.overlay?.text && (
          <div
            className="media-card__overlay-text"
            style={{
              left: `${item.overlay.x}%`,
              top:  `${item.overlay.y}%`,
              fontSize: overlaySize,
            }}
          >
            {item.overlay.text}
          </div>
        )}

        {/* Caption badge */}
        {item.caption && (
          <div className="media-card__caption">{item.caption}</div>
        )}
      </div>
    </div>
  )
}
