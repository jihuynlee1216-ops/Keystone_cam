import React, { useState, useRef } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { logout, auth } from '../store/firebase.js'
import BottomNav from '../components/BottomNav.jsx'
import TeamMascot from '../components/TeamMascot.jsx'
import './SettingsPage.css'

const TEAM_PRESETS = [
  { name: '두산 베어스',     color: '#131230' },
  { name: 'LG 트윈스',      color: '#C30452' },
  { name: 'KIA 타이거즈',   color: '#EA0029' },
  { name: 'SSG 랜더스',     color: '#CE0E2D' },
  { name: 'NC 다이노스',    color: '#315288' },
  { name: '롯데 자이언츠',  color: '#041E42' },
  { name: '삼성 라이온즈',  color: '#074CA1' },
  { name: 'KT 위즈',        color: '#000000' },
  { name: '한화 이글스',    color: '#FF6600' },
  { name: '키움 히어로즈',  color: '#820024' },
]

export default function SettingsPage() {
  const { state, dispatch } = useApp()
  const user = state.user
  const firebaseUser = auth.currentUser

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(user.name || '')
  const [showTeamPicker, setShowTeamPicker] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const nameInputRef = useRef(null)

  const handleSaveName = () => {
    if (nameDraft.trim()) {
      dispatch({ type: 'SET_USER', payload: { name: nameDraft.trim() } })
    }
    setEditingName(false)
  }

  const handleTeamSelect = (team) => {
    dispatch({ type: 'SET_USER', payload: { teamName: team.name, teamColor: team.color } })
    dispatch({ type: 'SET_ACCENT', payload: team.color })
    setShowTeamPicker(false)
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-header__title">설정</h1>
      </header>

      <div className="settings-content">
        {/* ── 프로필 섹션 ── */}
        <section className="settings-section">
          <h2 className="settings-section__title">프로필</h2>

          <div className="settings-card">
            {/* 프로필 아바타 */}
            <div className="settings-profile">
              <div className="settings-profile__avatar">
                <TeamMascot teamName={user.teamName} teamColor={user.teamColor} size={56} />
              </div>
              <div className="settings-profile__info">
                <p className="settings-profile__email">{firebaseUser?.email || '이메일 없음'}</p>
              </div>
            </div>

            {/* 닉네임 */}
            <div className="settings-item">
              <span className="settings-item__label">닉네임</span>
              {editingName ? (
                <div className="settings-item__edit-row">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={nameDraft}
                    onChange={e => setNameDraft(e.target.value)}
                    maxLength={20}
                    className="settings-item__input"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  />
                  <button className="settings-item__save" onClick={handleSaveName}>저장</button>
                </div>
              ) : (
                <button className="settings-item__value" onClick={() => { setEditingName(true); setNameDraft(user.name || '') }}>
                  {user.name || '설정 안 됨'}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* 내 팀 */}
            <div className="settings-item">
              <span className="settings-item__label">내 팀</span>
              <button className="settings-item__value" onClick={() => setShowTeamPicker(true)}>
                <span className="settings-item__team-dot" style={{ background: user.teamColor }} />
                {user.teamName || '설정 안 됨'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* ── 계정 섹션 ── */}
        <section className="settings-section">
          <h2 className="settings-section__title">계정</h2>
          <div className="settings-card">
            <button className="settings-item settings-item--danger" onClick={() => setShowLogoutConfirm(true)}>
              <span className="settings-item__label">로그아웃</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </section>

        {/* ── 앱 정보 ── */}
        <p className="settings-app-version">팬로그 v0.1.0</p>
      </div>

      {/* ── 팀 선택 바텀시트 ── */}
      {showTeamPicker && (
        <div className="settings-overlay" onClick={() => setShowTeamPicker(false)}>
          <div className="settings-sheet" onClick={e => e.stopPropagation()}>
            <div className="settings-sheet__handle" />
            <h3 className="settings-sheet__title">팀 선택</h3>
            <div className="settings-sheet__list">
              {TEAM_PRESETS.map(team => (
                <button
                  key={team.name}
                  className={`settings-sheet__item ${user.teamName === team.name ? 'active' : ''}`}
                  onClick={() => handleTeamSelect(team)}
                >
                  <TeamMascot teamName={team.name} teamColor={team.color} size={32} />
                  {team.name}
                  {user.teamName === team.name && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto' }}>
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 로그아웃 확인 ── */}
      {showLogoutConfirm && (
        <div className="settings-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="settings-confirm" onClick={e => e.stopPropagation()}>
            <p className="settings-confirm__title">로그아웃 하시겠어요?</p>
            <div className="settings-confirm__actions">
              <button className="settings-confirm__btn settings-confirm__btn--cancel" onClick={() => setShowLogoutConfirm(false)}>취소</button>
              <button className="settings-confirm__btn settings-confirm__btn--confirm" onClick={handleLogout}>로그아웃</button>
            </div>
          </div>
        </div>
      )}

      <div className="settings-page__spacer" />
      <BottomNav />
    </div>
  )
}
