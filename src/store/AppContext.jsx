import React, { createContext, useContext, useReducer, useEffect } from 'react'

/* ─── Data Model ─────────────────────────────────────────────────────── *
 *
 * Log: {
 *   id:        string,
 *   date:      string,           // "YYYY-MM-DD"
 *   opponent:  string,
 *   venue:     string,
 *   memo:      string,
 *   media:     MediaItem[],
 *   teamColor: string,           // hex
 *   createdAt: string,
 * }
 *
 * MediaItem: {
 *   id:       string,
 *   type:     "image" | "video",
 *   dataUrl:  string,
 *   caption:  string,
 *   overlay:  { text, x, y, size } | null,
 * }
 *
 * User: {
 *   name:        string,
 *   teamColor:   string,
 *   teamName:    string,
 *   onboarded:   boolean,
 * }
 * ──────────────────────────────────────────────────────────────────── */

const SEED_LOGS = [
  {
    id: 'seed-1',
    date: '2026-04-03',
    opponent: 'LG 트윈스',
    venue: '잠실 야구장',
    memo: '역전 끝내기 홈런. 소리를 질렀다. 목이 아프다.',
    teamColor: '#003087',
    media: [
      { id: 'm1', type: 'image', dataUrl: null, caption: '시구 전 전경', overlay: null },
      { id: 'm2', type: 'image', dataUrl: null, caption: '7회 응원', overlay: { text: '역전!!', x: 50, y: 70, size: 'large' } },
    ],
    createdAt: '2026-04-03T21:10:00',
  },
  {
    id: 'seed-2',
    date: '2026-04-07',
    opponent: 'SSG 랜더스',
    venue: '잠실 야구장',
    memo: '비 속에서도 끝까지. 우산보다 응원봉.',
    teamColor: '#003087',
    media: [
      { id: 'm3', type: 'image', dataUrl: null, caption: '빗속 경기', overlay: null },
    ],
    createdAt: '2026-04-07T22:00:00',
  },
  {
    id: 'seed-3',
    date: '2026-03-29',
    opponent: 'KT 위즈',
    venue: '잠실 야구장',
    memo: '개막전. 이 순간을 1년 내내 기다렸다.',
    teamColor: '#003087',
    media: [
      { id: 'm4', type: 'image', dataUrl: null, caption: '개막전 입장', overlay: { text: '2026 개막', x: 50, y: 20, size: 'medium' } },
      { id: 'm5', type: 'image', dataUrl: null, caption: '불꽃놀이', overlay: null },
    ],
    createdAt: '2026-03-29T19:30:00',
  },
]

const INITIAL_USER = {
  name: '',
  teamColor: '#3D5AF1',
  teamName: '',
  onboarded: false,
}

/* ─── Reducer ────────────────────────────────────────────────────────── */
function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: { ...state.user, ...action.payload } }

    case 'COMPLETE_ONBOARDING':
      return { ...state, user: { ...state.user, onboarded: true } }

    case 'ADD_LOG': {
      const logs = [action.payload, ...state.logs]
      return { ...state, logs }
    }

    case 'UPDATE_LOG': {
      const logs = state.logs.map(l =>
        l.id === action.payload.id ? { ...l, ...action.payload } : l
      )
      return { ...state, logs }
    }

    case 'DELETE_LOG': {
      const logs = state.logs.filter(l => l.id !== action.payload)
      return { ...state, logs }
    }

    case 'SET_ACCENT':
      return {
        ...state,
        user: { ...state.user, teamColor: action.payload },
      }

    case 'HYDRATE':
      return action.payload

    default:
      return state
  }
}

const INITIAL_STATE = {
  user: INITIAL_USER,
  logs: SEED_LOGS,
}

/* ─── Context ────────────────────────────────────────────────────────── */
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  // Persist to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sports-archive-state')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        dispatch({ type: 'HYDRATE', payload: parsed })
      } catch (_) {
        // ignore corrupt data
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('sports-archive-state', JSON.stringify(state))
  }, [state])

  // Apply accent color as CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', state.user.teamColor)
    // Generate soft version
    document.documentElement.style.setProperty(
      '--color-accent-soft',
      hexToRgba(state.user.teamColor, 0.1)
    )
  }, [state.user.teamColor])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
export function getLogsForMonth(logs, year, month) {
  return logs.filter(log => {
    const d = new Date(log.date)
    return d.getFullYear() === year && d.getMonth() + 1 === month
  })
}

export function getLogByDate(logs, dateStr) {
  return logs.filter(l => l.date === dateStr)
}

export function generateId() {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function hexToRgba(hex, alpha) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return `rgba(61,90,241,${alpha})`
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgba(${r},${g},${b},${alpha})`
}
