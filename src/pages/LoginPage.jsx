import React, { useState } from 'react'
import { loginWithGoogle, loginWithKakao, loginWithEmail } from '../store/firebase.js'
import SignupPage from './SignupPage.jsx'
import './LoginPage.css'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // 회원가입 페이지 표시
  if (mode === 'signup') {
    return (
      <SignupPage
        onBack={() => setMode('login')}
        onComplete={() => setMode('login')}
      />
    )
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const timeout = setTimeout(() => {
      setError('서버 연결이 안 돼요. 네트워크를 확인해주세요.')
      setLoading(false)
    }, 10000)

    try {
      await loginWithEmail(email, password)
      clearTimeout(timeout)
    } catch (err) {
      clearTimeout(timeout)
      const msg = {
        'auth/user-not-found': '등록되지 않은 이메일이에요',
        'auth/wrong-password': '비밀번호가 틀렸어요',
        'auth/invalid-email': '이메일 형식이 올바르지 않아요',
        'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않아요',
      }
      setError(msg[err.code] || `오류: ${err.code || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setLoading(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google 로그인에 실패했어요')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKakao = async () => {
    setError(null)
    setLoading(true)
    try {
      await loginWithKakao()
    } catch (err) {
      setError('카카오 로그인에 실패했어요: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-content">
        <div className="login-header">
          <h1 className="login-title">팬카이브</h1>
          <p className="login-subtitle">나만의 경기 기록을 남겨보세요</p>
        </div>

        {/* 소셜 로그인 */}
        <div className="login-social">
          <button className="login-social-btn login-social-btn--kakao" onClick={handleKakao} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.66-.15.53-.95 3.42-.98 3.64 0 0-.02.16.08.22.1.06.22.02.22.02.29-.04 3.36-2.2 3.9-2.57.68.1 1.39.15 2.12.15 5.52 0 10-3.58 10-7.94S17.52 3 12 3z" fill="#191919"/>
            </svg>
            카카오로 시작하기
          </button>
          <button className="login-social-btn login-social-btn--google" onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google로 계속하기
          </button>
        </div>

        <div className="login-divider">
          <span>또는</span>
        </div>

        {/* 이메일 로그인/회원가입 */}
        <form className="login-form" onSubmit={handleEmailAuth}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="login-input"
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="login-input"
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? '잠시만...' : '로그인'}
          </button>
        </form>

        <button
          className="login-toggle"
          onClick={() => { setMode('signup'); setError(null) }}
        >
          계정이 없으신가요? 회원가입
        </button>
      </div>
    </div>
  )
}
