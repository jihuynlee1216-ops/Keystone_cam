import React, { useState } from 'react'
import { signUpWithEmail } from '../store/firebase.js'
import './SignupPage.css'

const TERMS = [
  { id: 'service',  label: '서비스 이용약관', required: true },
  { id: 'privacy',  label: '개인정보 수집 및 이용 동의', required: true },
  { id: 'marketing', label: '마케팅 정보 수신 동의', required: false },
]

const EMAIL_DOMAINS = ['gmail.com', 'naver.com', 'kakao.com', 'hanmail.net', 'nate.com', 'icloud.com', 'yahoo.com']

export default function SignupPage({ onBack, onComplete }) {
  const [step, setStep] = useState('terms') // 'terms' | 'info' | 'done'

  // 약관
  const [agreed, setAgreed] = useState({})
  const allRequired = TERMS.filter(t => t.required).every(t => agreed[t.id])
  const allChecked = TERMS.every(t => agreed[t.id])

  const toggleAll = () => {
    if (allChecked) {
      setAgreed({})
    } else {
      const all = {}
      TERMS.forEach(t => { all[t.id] = true })
      setAgreed(all)
    }
  }

  // 정보 입력
  const [emailLocal, setEmailLocal] = useState('')
  const [emailDomain, setEmailDomain] = useState('gmail.com')
  const [customDomain, setCustomDomain] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const domain = emailDomain === 'direct' ? customDomain : emailDomain
  const fullEmail = `${emailLocal}@${domain}`

  // 비밀번호 유효성
  const pwLength = password.length >= 8 && password.length <= 20
  const pwHasLetter = /[a-zA-Z]/.test(password)
  const pwHasNumber = /[0-9]/.test(password)
  const pwHasSpecial = /[^a-zA-Z0-9]/.test(password)
  const pwTypeCount = [pwHasLetter, pwHasNumber, pwHasSpecial].filter(Boolean).length
  const pwValid = pwLength && pwTypeCount >= 2
  const pwMatch = password === passwordConfirm && passwordConfirm.length > 0

  const canSubmit = emailLocal.trim() && domain.trim() && pwValid && pwMatch

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signUpWithEmail(fullEmail, password)
      setStep('done')
    } catch (err) {
      const msg = {
        'auth/email-already-in-use': '이미 가입된 이메일이에요',
        'auth/invalid-email': '이메일 형식이 올바르지 않아요',
        'auth/weak-password': '비밀번호를 더 강력하게 설정해주세요',
      }
      setError(msg[err.code] || `오류: ${err.code || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signup-page">
      {/* 헤더 */}
      <header className="signup-header">
        {step !== 'done' && (
          <button className="signup-header__back" onClick={step === 'terms' ? onBack : () => setStep('terms')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <h1 className="signup-header__title">회원가입</h1>
        <div style={{ width: 20 }} />
      </header>

      {/* ─── Step 1: 약관 동의 ─── */}
      {step === 'terms' && (
        <div className="signup-body">
          <h2 className="signup-heading">
            회원가입을 위해<br />약관에 동의해주세요.
          </h2>

          <div className="signup-terms">
            <button className="signup-terms__all" onClick={toggleAll}>
              <span className={`signup-check ${allChecked ? 'checked' : ''}`} />
              <span className="signup-terms__all-label">전체동의</span>
            </button>

            <div className="signup-terms__divider" />

            {TERMS.map(term => (
              <button
                key={term.id}
                className="signup-terms__item"
                onClick={() => setAgreed(a => ({ ...a, [term.id]: !a[term.id] }))}
              >
                <span className={`signup-check ${agreed[term.id] ? 'checked' : ''}`} />
                <span className="signup-terms__label">
                  [{term.required ? '필수' : '선택'}] {term.label}
                </span>
              </button>
            ))}
          </div>

          <div className="signup-footer">
            <button
              className="signup-btn"
              disabled={!allRequired}
              onClick={() => setStep('info')}
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 2: 정보 입력 ─── */}
      {step === 'info' && (
        <form className="signup-body" onSubmit={handleSubmit}>
          <h2 className="signup-heading">
            회원님의 소중한 정보를<br />입력해 주세요.
          </h2>

          <div className="signup-fields">
            {/* 이메일 */}
            <div className="signup-field">
              <label className="signup-field__label">이메일 <span className="signup-req">*</span></label>
              <div className="signup-email-row">
                <input
                  type="text"
                  placeholder="이메일 입력"
                  value={emailLocal}
                  onChange={e => setEmailLocal(e.target.value)}
                  className="signup-input signup-input--half"
                  autoComplete="username"
                />
                <span className="signup-email-at">@</span>
                {emailDomain === 'direct' ? (
                  <input
                    type="text"
                    placeholder="직접 입력"
                    value={customDomain}
                    onChange={e => setCustomDomain(e.target.value)}
                    className="signup-input signup-input--half"
                  />
                ) : (
                  <select
                    value={emailDomain}
                    onChange={e => setEmailDomain(e.target.value)}
                    className="signup-select"
                  >
                    {EMAIL_DOMAINS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    <option value="direct">직접 입력</option>
                  </select>
                )}
              </div>
            </div>

            {/* 비밀번호 */}
            <div className="signup-field">
              <label className="signup-field__label">비밀번호 <span className="signup-req">*</span></label>
              <div className="signup-input-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="signup-input"
                  autoComplete="new-password"
                />
                <button type="button" className="signup-eye" onClick={() => setShowPw(!showPw)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    {showPw ? (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                      </>
                    ) : (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
              {password.length > 0 && (
                <p className={`signup-hint ${pwValid ? 'valid' : ''}`}>
                  8~20자, 영문/숫자/특수문자 중 2가지 이상 조합
                </p>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div className="signup-field">
              <label className="signup-field__label">비밀번호 확인 <span className="signup-req">*</span></label>
              <div className="signup-input-wrap">
                <input
                  type={showPwConfirm ? 'text' : 'password'}
                  placeholder="비밀번호 재입력"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  className="signup-input"
                  autoComplete="new-password"
                />
                <button type="button" className="signup-eye" onClick={() => setShowPwConfirm(!showPwConfirm)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </button>
              </div>
              {passwordConfirm.length > 0 && (
                <p className={`signup-hint ${pwMatch ? 'valid' : ''}`}>
                  {pwMatch ? '비밀번호가 일치해요' : '비밀번호가 일치하지 않아요'}
                </p>
              )}
            </div>

            {error && <p className="signup-error">{error}</p>}
          </div>

          <div className="signup-footer">
            <button
              type="submit"
              className="signup-btn"
              disabled={!canSubmit || loading}
            >
              {loading ? '가입 중...' : '확인'}
            </button>
          </div>
        </form>
      )}

      {/* ─── Step 3: 가입 완료 ─── */}
      {step === 'done' && (
        <div className="signup-body signup-body--center">
          <div className="signup-done-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke="#3D5AF1" strokeWidth="1.5" />
              <path d="M7 12.5l3 3 7-7" stroke="#3D5AF1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="signup-heading" style={{ textAlign: 'center' }}>
            가입이 완료되었어요!
          </h2>
          <p className="signup-done-desc">
            {fullEmail}로<br />인증 메일을 보냈어요.<br />
            메일함을 확인해주세요.
          </p>

          <div className="signup-footer">
            <button className="signup-btn" onClick={onComplete}>
              로그인하러 가기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
