import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, getLogsForMonth, getLogByDate } from '../store/AppContext.jsx'
import { useMediaSrc } from '../hooks/useMediaSrc.js'
import BottomNav from '../components/BottomNav.jsx'
import BaseballCharacter from '../components/BaseballCharacter.jsx'
import './CalendarPage.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS_KR = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function buildCalendar(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function CalendarCell({ day, dateStr, logs, hasLogs, todayFlag, isSun, isSat, viewMonth, onClick }) {
  const firstMediaItem = logs[0]?.media?.[0]
  const thumbSrc = useMediaSrc(firstMediaItem)

  return (
    <button
      className={[
        'calendar-cell',
        hasLogs   ? 'has-log'  : '',
        todayFlag ? 'is-today' : '',
        isSun     ? 'is-sun'   : '',
        isSat     ? 'is-sat'   : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-label={`${viewMonth}월 ${day}일${hasLogs ? ', 기록 있음' : ''}`}
    >
      {/* Thumbnail background for days with logs */}
      {thumbSrc && firstMediaItem?.type === 'video' ? (
        <video
          key={thumbSrc}
          src={thumbSrc}
          className="calendar-cell__thumb"
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      ) : thumbSrc ? (
        <img src={thumbSrc} alt="" className="calendar-cell__thumb" aria-hidden="true" />
      ) : null}

      {/* Date number */}
      <span className="calendar-cell__day">{day}</span>

      {/* Indicator dots */}
      {hasLogs && !thumbSrc && (
        <div className="calendar-cell__dots">
          {logs.slice(0, 3).map(l => (
            <span key={l.id} className="calendar-cell__dot" />
          ))}
        </div>
      )}

      {hasLogs && thumbSrc && (
        <div className="calendar-cell__overlay-badge" />
      )}
    </button>
  )
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const { state } = useApp()

  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1)

  const cells       = useMemo(() => buildCalendar(viewYear, viewMonth), [viewYear, viewMonth])
  const monthLogs   = useMemo(() => getLogsForMonth(state.logs, viewYear, viewMonth), [state.logs, viewYear, viewMonth])
  const logsByDate  = useMemo(() => {
    const map = {}
    monthLogs.forEach(log => {
      if (!map[log.date]) map[log.date] = []
      map[log.date].push(log)
    })
    return map
  }, [monthLogs])

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  const handleDayTap = (day) => {
    const dateStr = formatDate(viewYear, viewMonth, day)
    const logs = logsByDate[dateStr]
    if (logs?.length) navigate(`/log/${dateStr}`)
    else navigate(`/create/${dateStr}`)
  }

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      viewMonth === today.getMonth() + 1 &&
      viewYear === today.getFullYear()
    )
  }

  const monthTotalLogs = monthLogs.length

  return (
    <div className="calendar-page">
      {/* ── Sticky header ── */}
      <header className="calendar-header">
        <div className="calendar-header__nav">
          <button className="calendar-header__arrow" onClick={prevMonth} aria-label="이전 달">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="calendar-header__month-wrap">
            <span className="calendar-header__year">{viewYear}</span>
            <h1 className="calendar-header__month">{MONTHS_KR[viewMonth - 1]}</h1>
          </div>
          <button className="calendar-header__arrow" onClick={nextMonth} aria-label="다음 달">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {monthTotalLogs > 0 && (
          <p className="calendar-header__count">
            이번 달 <strong>{monthTotalLogs}경기</strong> 직관
          </p>
        )}

        {/* Weekday labels */}
        <div className="calendar-weekdays">
          {WEEKDAYS.map((d, i) => (
            <span key={d} className={`calendar-weekdays__label ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>
              {d}
            </span>
          ))}
        </div>
      </header>

      {/* ── Grid ── */}
      <div className="calendar-grid">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="calendar-cell calendar-cell--empty" />
          }

          const dateStr  = formatDate(viewYear, viewMonth, day)
          const hasLogs  = !!logsByDate[dateStr]
          const logs     = logsByDate[dateStr] || []
          const todayFlag = isToday(day)
          const isSun    = idx % 7 === 0
          const isSat    = idx % 7 === 6

          return (
            <CalendarCell
              key={dateStr}
              day={day}
              dateStr={dateStr}
              logs={logs}
              hasLogs={hasLogs}
              todayFlag={todayFlag}
              isSun={isSun}
              isSat={isSat}
              viewMonth={viewMonth}
              onClick={() => handleDayTap(day)}
            />
          )
        })}
      </div>

      {/* ── Empty state ── */}
      {monthTotalLogs === 0 && (
        <div className="calendar-empty">
          <BaseballCharacter size={80} mood="idle" className="calendar-empty__character" />
          <p className="calendar-empty__text">이번 달 기록이 없어요</p>
          <p className="calendar-empty__sub">날짜를 탭해 첫 직관 기록을 남겨보세요</p>
        </div>
      )}

      <div className="calendar-page__spacer" />
      <BottomNav />
    </div>
  )
}
