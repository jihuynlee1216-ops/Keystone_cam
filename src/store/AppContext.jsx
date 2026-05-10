import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { deleteMedia } from './mediaDB'
import { saveUserProfile, loadUserProfile, saveLog, loadAllLogs, deleteLogFromDB } from './firebase'

/* ─── Data Model ─────────────────────────────────────────────────────── */

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

export function AppProvider({ uid, children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [loaded, setLoaded] = React.useState(false)
  const loadedRef = useRef(false)

  // Firestore에서 데이터 로드
  useEffect(() => {
    if (!uid) return
    loadedRef.current = false
    setLoaded(false)

    async function load() {
      try {
        const [profile, logs] = await Promise.all([
          loadUserProfile(uid),
          loadAllLogs(uid),
        ])

        const user = profile
          ? { ...INITIAL_USER, ...profile }
          : INITIAL_USER

        // blob URL 정리
        const cleanedLogs = (logs || []).map(l => ({
          ...l,
          media: (l.media || []).map(m => ({
            ...m,
            dataUrl: m.dataUrl?.startsWith('blob:') ? null : m.dataUrl,
          })),
        }))

        dispatch({ type: 'HYDRATE', payload: { user, logs: cleanedLogs } })
      } catch (err) {
        console.error('Firestore load error:', err)
        alert('데이터 로드 오류: ' + (err.message || err))
      } finally {
        loadedRef.current = true
        setLoaded(true)
      }
    }
    load()
  }, [uid])

  // 유저 프로필 변경 시 Firestore에 저장
  useEffect(() => {
    if (!uid || !loadedRef.current) return
    saveUserProfile(uid, state.user).catch(err =>
      console.error('Profile save error:', err)
    )
  }, [uid, state.user])

  // Apply accent color as CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', state.user.teamColor)
    document.documentElement.style.setProperty(
      '--color-accent-soft',
      hexToRgba(state.user.teamColor, 0.1)
    )
  }, [state.user.teamColor])

  // IDB 영상 정리 + Firestore 연동 dispatch 래퍼
  const enhancedDispatch = useCallback((action) => {
    if (action.type === 'DELETE_LOG') {
      const log = state.logs.find(l => l.id === action.payload)
      log?.media?.forEach(item => {
        if (item.mediaId) deleteMedia(item.mediaId)
      })
      if (uid) deleteLogFromDB(uid, action.payload).catch(console.error)
    }

    if (action.type === 'ADD_LOG' && uid) {
      saveLog(uid, action.payload).catch(console.error)
    }

    if (action.type === 'UPDATE_LOG' && uid) {
      saveLog(uid, action.payload).catch(console.error)
    }

    dispatch(action)
  }, [state.logs, uid])

  return (
    <AppContext.Provider value={{ state, dispatch: enhancedDispatch, loaded }}>
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
