import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext.jsx'
import BaseballCharacter from '../components/BaseballCharacter.jsx'
import './OnboardingPage.css'

const TEAM_PRESETS = [
  { name: '두산 베어스',   color: '#003087' },
  { name: 'LG 트윈스',    color: '#C30452' },
  { name: 'KIA 타이거즈', color: '#EA0029' },
  { name: 'SSG 랜더스',   color: '#CE0E2D' },
  { name: 'NC 다이노스',  color: '#071D49' },
  { name: '롯데 자이언츠', color: '#041E42' },
  { name: '삼성 라이온즈', color: '#1E4C96' },
  { name: 'KT 위즈',      color: '#000000' },
  { name: '한화 이글스',  color: '#FF6600' },
  { name: '키움 히어로즈', color: '#C00820' },
]

const STEPS = ['welcome', 'name', 'team', 'done']

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { dispatch } = useApp()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [customColor, setCustomColor] = useState('#3D5AF1')

  const current = STEPS[step]

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
  }

  const handleFinish = () => {
    const team = selectedTeam || { name: '나의 팀', color: customColor }
    dispatch({
      type: 'SET_USER',
      payload: { name, teamName: team.name, teamColor: team.color, onboarded: true },
    })
    dispatch({ type: 'COMPLETE_ONBOARDING' })
    navigate('/calendar', { replace: true })
  }

  return (
    <div className="onboarding">
      {/* Progress dots */}
      <div className="onboarding__progress">
        {STEPS.map((s, i) => (
          <div key={s} className={`onboarding__dot ${i <= step ? 'active' : ''}`} />
        ))}
      </div>

      <div className="onboarding__content">
        {current === 'welcome' && (
          <div className="onboarding__step animate-in">
            <div className="onboarding__character-wrap">
              <BaseballCharacter size={120} mood="happy" />
            </div>
            <h1 className="onboarding__title">직관로그</h1>
            <p className="onboarding__desc">
              경기장에서 느꼈던 모든 감정을<br />
              아름다운 기록으로 남겨보세요.
            </p>
            <button className="onboarding__btn" onClick={handleNext}>
              시작하기
            </button>
          </div>
        )}

        {current === 'name' && (
          <div className="onboarding__step animate-in">
            <h2 className="onboarding__label">이름을 알려주세요</h2>
            <p className="onboarding__hint">나만의 아카이브에 표시됩니다</p>
            <input
              className="onboarding__input"
              type="text"
              placeholder="이름 또는 닉네임"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              maxLength={20}
            />
            <button
              className="onboarding__btn"
              onClick={handleNext}
              disabled={!name.trim()}
            >
              다음
            </button>
          </div>
        )}

        {current === 'team' && (
          <div className="onboarding__step animate-in">
            <h2 className="onboarding__label">응원하는 팀은?</h2>
            <p className="onboarding__hint">팀 컬러로 아카이브를 꾸며드릴게요</p>
            <div className="onboarding__teams">
              {TEAM_PRESETS.map(team => (
                <button
                  key={team.name}
                  className={`onboarding__team-chip ${selectedTeam?.name === team.name ? 'selected' : ''}`}
                  style={{ '--chip-color': team.color }}
                  onClick={() => setSelectedTeam(team)}
                >
                  <span
                    className="onboarding__team-dot"
                    style={{ background: team.color }}
                  />
                  {team.name}
                </button>
              ))}
            </div>

            <div className="onboarding__custom-color">
              <span className="onboarding__custom-label">직접 선택</span>
              <input
                type="color"
                value={customColor}
                onChange={e => {
                  setCustomColor(e.target.value)
                  setSelectedTeam(null)
                }}
                className="onboarding__color-picker"
              />
            </div>

            <button
              className="onboarding__btn"
              onClick={handleNext}
            >
              다음
            </button>
          </div>
        )}

        {current === 'done' && (
          <div className="onboarding__step animate-in onboarding__step--done">
            <div className="onboarding__done-character">
              <BaseballCharacter
                size={130}
                mood="cheer"
                capColor={selectedTeam?.color || customColor}
              />
            </div>
            <h2 className="onboarding__title onboarding__title--done">
              {name}님,<br />환영합니다
            </h2>
            <p className="onboarding__desc">
              {selectedTeam ? `${selectedTeam.name}의 팬이군요!` : '나만의 팀을 응원하는군요!'}<br />
              이제 직관 기록을 시작해볼까요?
            </p>
            <button
              className="onboarding__btn"
              style={{ background: selectedTeam?.color || customColor }}
              onClick={handleFinish}
            >
              아카이브 시작 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
