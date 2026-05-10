import React from 'react'

const MASCOT_MAP = {
  '두산 베어스':     '/mascots/doosan.png',
  'LG 트윈스':      '/mascots/lg.png',
  'KIA 타이거즈':   '/mascots/kia.png',
  'SSG 랜더스':     '/mascots/ssg.png',
  'NC 다이노스':    '/mascots/nc.png',
  '롯데 자이언츠':  '/mascots/lotte.png',
  '삼성 라이온즈':  '/mascots/samsung.png',
  'KT 위즈':        '/mascots/kt.png',
  '한화 이글스':    '/mascots/hanwha.png',
  '키움 히어로즈':  '/mascots/kiwoom.png',
}

export default function TeamMascot({ teamName, teamColor, size = 48 }) {
  const src = MASCOT_MAP[teamName]

  if (!src) {
    // 팀이 없으면 기본 야구공
    return (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="30" fill="#FAFAFA" stroke="#ddd" strokeWidth="2" />
        <path d="M28 20 Q22 40 28 60" stroke="#E53935" strokeWidth="2" fill="none" />
        <path d="M52 20 Q58 40 52 60" stroke="#E53935" strokeWidth="2" fill="none" />
      </svg>
    )
  }

  return (
    <img
      src={src}
      alt={teamName}
      width={size}
      height={size}
      style={{
        objectFit: 'contain',
      }}
    />
  )
}
