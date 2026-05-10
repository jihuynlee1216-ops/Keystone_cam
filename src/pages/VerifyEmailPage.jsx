import React, { useState } from 'react'
import { auth, resendVerification, logout } from '../store/firebase.js'
import './LoginPage.css'

export default function VerifyEmailPage({ onVerified }) {
  const [resent, setResent] = useState(false)
  const [checking, setChecking] = useState(false)

  const handleResend = async () => {
    try {
      await resendVerification()
      setResent(true)
      setTimeout(() => setResent(false), 5000)
    } catch {
      alert('잠시 후 다시 시도해주세요')
    }
  }

  const handleCheck = async () => {
    setChecking(true)
    try {
      await auth.currentUser.reload()
      if (auth.currentUser.emailVerified) {
        onVerified()
      } else {
        alert('아직 인증이 완료되지 않았어요.\n이메일을 확인해주세요!')
      }
    } catch {
      alert('확인 중 오류가 발생했어요')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-content">
        <div className="login-header">
          <h1 className="login-title">이메일 인증</h1>
          <p className="login-subtitle">
            {auth.currentUser?.email}로{'\n'}
            인증 메일을 보냈어요.{'\n'}
            메일함을 확인하고 인증을 완료해주세요.
          </p>
        </div>

        <button className="login-submit" onClick={handleCheck} disabled={checking}>
          {checking ? '확인 중...' : '인증 완료했어요'}
        </button>

        <button className="login-toggle" onClick={handleResend}>
          {resent ? '메일을 다시 보냈어요!' : '인증 메일 다시 보내기'}
        </button>

        <button
          className="login-toggle"
          style={{ marginTop: 8, color: '#e53e3e' }}
          onClick={logout}
        >
          다른 계정으로 로그인
        </button>
      </div>
    </div>
  )
}
