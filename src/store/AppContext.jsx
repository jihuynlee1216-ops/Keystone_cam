import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { deleteMedia } from './mediaDB'

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
  logs: [],
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
        // 예시 데이터(seed-)로 시작하는 id 제거
        if (parsed.logs) {
          parsed.logs = parsed.logs.filter(l => !l.id.startsWith('seed-'))
        }
        dispatch({ type: 'HYDRATE', payload: parsed })
      } catch (_) {
        // ignore corrupt data
      }
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('sports-archive-state', JSON.stringify(state))
    } catch (e) {
      // QuotaExceededError: 사진 용량 초과 시 미디어 없이 저장 시도
      try {
        const fallback = {
          ...state,
          logs: state.logs.map(l => ({ ...l, media: [] })),
        }
        localStorage.setItem('sports-archive-state', JSON.stringify(fallback))
        console.warn('저장 용량 초과 - 미디어 제외 후 저장됨')
      } catch (_) {
        console.error('localStorage 저장 실패:', e)
      }
    }
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

  // IDB 영상 정리를 포함한 dispatch 래퍼
  const enhancedDispatch = useCallback((action) => {
    if (action.type === 'DELETE_LOG') {
      const log = state.logs.find(l => l.id === action.payload)
      log?.media?.forEach(item => {
        if (item.mediaId) deleteMedia(item.mediaId)
      })
    }
    dispatch(action)
  }, [state.logs])

  return (
    <AppContext.Provider value={{ state, dispatch: enhancedDispatch }}>
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
