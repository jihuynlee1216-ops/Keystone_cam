import React from 'react'

/**
 * Cute minimal baseball character with team-color cap.
 * Uses --color-accent for the cap automatically.
 * Props: size (number, default 80), className, mood ('happy'|'cheer'|'idle')
 */
export default function BaseballCharacter({ size = 80, className = '', mood = 'happy', capColor }) {
  const cap = capColor || 'var(--color-accent)'

  const mouths = {
    happy: 'M40 75 Q50 84 60 75',
    cheer: 'M37 73 Q50 87 63 73',
    idle:  'M42 76 Q50 80 58 76',
  }
  const mouth = mouths[mood] || mouths.happy

  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 100 115"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* ── Cap crown ─────────────────────────────────────── */}
      <path
        d="M26 37 Q24 14 50 11 Q76 14 74 37"
        fill={cap}
      />

      {/* Cap brim (flat bottom of crown) */}
      <rect x="22" y="35" width="56" height="8" rx="4" fill={cap} />

      {/* Brim extension to the left */}
      <path d="M22 38 Q12 40 10 45 Q18 43 22 42" fill={cap} />

      {/* Cap button on top */}
      <circle cx="50" cy="13" r="3.5" fill="white" fillOpacity="0.30" />

      {/* ── Ball body ─────────────────────────────────────── */}
      <circle cx="50" cy="72" r="36" fill="#FFF9F3" stroke="#EDE3D5" strokeWidth="1.5" />

      {/* Shadow at bottom of ball */}
      <ellipse cx="50" cy="105" rx="22" ry="5" fill="#E8DDD0" opacity="0.45" />

      {/* ── Baseball seams ────────────────────────────────── */}
      {/* Left C-curve */}
      <path
        d="M36 55 C27 62 27 74 36 80"
        stroke="#E05050" strokeWidth="2.6" strokeLinecap="round"
      />
      {/* Left seam tick marks */}
      <line x1="36" y1="58"   x2="28" y2="55.5" stroke="#E05050" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="33" y1="63.5" x2="25" y2="63"   stroke="#E05050" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="33" y1="69.5" x2="25" y2="70"   stroke="#E05050" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="35" y1="75.5" x2="27" y2="77.5" stroke="#E05050" strokeWidth="1.8" strokeLinecap="round" />

      {/* Right C-curve */}
      <path
        d="M64 55 C73 62 73 74 64 80"
        stroke="#E05050" strokeWidth="2.6" strokeLinecap="round"
      />
      {/* Right seam tick marks */}
      <line x1="64" y1="58"   x2="72" y2="55.5" stroke="#E05050" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="67" y1="63.5" x2="75" y2="63"   stroke="#E05050" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="67" y1="69.5" x2="75" y2="70"   stroke="#E05050" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="65" y1="75.5" x2="73" y2="77.5" stroke="#E05050" strokeWidth="1.8" strokeLinecap="round" />

      {/* ── Face ──────────────────────────────────────────── */}
      {/* Eyes */}
      <circle cx="40" cy="66" r="4.2" fill="#261C1C" />
      <circle cx="60" cy="66" r="4.2" fill="#261C1C" />
      {/* Eye highlights */}
      <circle cx="41.6" cy="64.4" r="1.6" fill="white" />
      <circle cx="61.6" cy="64.4" r="1.6" fill="white" />

      {/* Rosy cheeks */}
      <ellipse cx="33" cy="72" rx="6.5" ry="4"   fill="#FF9090" fillOpacity="0.38" />
      <ellipse cx="67" cy="72" rx="6.5" ry="4"   fill="#FF9090" fillOpacity="0.38" />

      {/* Mouth */}
      <path
        d={mouth}
        stroke="#261C1C" strokeWidth="2.5" strokeLinecap="round"
      />

      {/* Cheer mode: little sparkles */}
      {mood === 'cheer' && (
        <>
          <line x1="12" y1="55" x2="16" y2="51" stroke={cap} strokeWidth="2" strokeLinecap="round" />
          <line x1="10" y1="50" x2="10" y2="45" stroke={cap} strokeWidth="2" strokeLinecap="round" />
          <line x1="14" y1="57" x2="19" y2="57" stroke={cap} strokeWidth="2" strokeLinecap="round" />
          <line x1="88" y1="55" x2="84" y2="51" stroke={cap} strokeWidth="2" strokeLinecap="round" />
          <line x1="90" y1="50" x2="90" y2="45" stroke={cap} strokeWidth="2" strokeLinecap="round" />
          <line x1="86" y1="57" x2="81" y2="57" stroke={cap} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
