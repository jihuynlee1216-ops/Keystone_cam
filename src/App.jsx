import React, { Suspense, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext.jsx'
import { onAuth } from './store/firebase.js'

const LoginPage        = React.lazy(() => import('./pages/LoginPage.jsx'))
const OnboardingPage   = React.lazy(() => import('./pages/OnboardingPage.jsx'))
const CalendarPage     = React.lazy(() => import('./pages/CalendarPage.jsx'))
const LogCreatePage    = React.lazy(() => import('./pages/LogCreatePage.jsx'))
const LogViewPage      = React.lazy(() => import('./pages/LogViewPage.jsx'))
const ArchivePage      = React.lazy(() => import('./pages/ArchivePage.jsx'))
const VideoPreviewPage = React.lazy(() => import('./pages/VideoPreviewPage.jsx'))
const SettingsPage     = React.lazy(() => import('./pages/SettingsPage.jsx'))
const PermissionsPage  = React.lazy(() => import('./pages/PermissionsPage.jsx'))
const VerifyEmailPage  = React.lazy(() => import('./pages/VerifyEmailPage.jsx'))

function PageLoader() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <div className="spinner" />
    </div>
  )
}

function AppRoutes() {
  const { state, loaded } = useApp()

  // Firestore 로딩 중이면 로딩 화면
  if (!loaded) return <PageLoader />

  // 온보딩 안 된 유저는 무조건 온보딩으로
  if (!state.user.onboarded) {
    return (
      <Suspense fallback={<PageLoader />}>
        <OnboardingPage />
      </Suspense>
    )
  }

  // 온보딩은 했지만 권한 안내를 아직 안 본 유저
  if (!state.user.permissionsShown) {
    return (
      <Suspense fallback={<PageLoader />}>
        <PermissionsPage />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/calendar" replace />} />
        <Route path="/calendar"   element={<CalendarPage />} />
        <Route path="/create/:date" element={<LogCreatePage />} />
        <Route path="/log/:date"    element={<LogViewPage />} />
        <Route path="/archive"      element={<ArchivePage />} />
        <Route path="/video/:type"  element={<VideoPreviewPage />} />
        <Route path="/settings"    element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading, null = not logged in

  useEffect(() => {
    let timeout
    try {
      const unsub = onAuth((firebaseUser) => {
        clearTimeout(timeout)
        setUser(firebaseUser)
      })
      // 5초 안에 응답 없으면 로그인 안 된 것으로 처리
      timeout = setTimeout(() => setUser(null), 5000)
      return () => { unsub(); clearTimeout(timeout) }
    } catch (err) {
      console.error('Firebase auth error:', err)
      setUser(null)
    }
  }, [])

  // 로딩 중
  if (user === undefined) {
    return <PageLoader />
  }

  // 로그인 안 됨
  if (user === null) {
    return (
      <Suspense fallback={<PageLoader />}>
        <div className="app-shell">
          <LoginPage />
        </div>
      </Suspense>
    )
  }

  // 이메일 로그인인데 인증 안 됨 (Google/카카오 로그인은 스킵)
  const isEmailProvider = user.providerData?.[0]?.providerId === 'password'
  const isKakaoSynthetic = user.email?.startsWith('kakao_') && user.email?.endsWith('@sportsarchive.app')
  if (isEmailProvider && !user.emailVerified && !isKakaoSynthetic) {
    return (
      <Suspense fallback={<PageLoader />}>
        <div className="app-shell">
          <VerifyEmailPage onVerified={() => setUser({ ...user, emailVerified: true })} />
        </div>
      </Suspense>
    )
  }

  // 로그인 됨
  return (
    <AppProvider uid={user.uid}>
      <BrowserRouter>
        <div className="app-shell">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AppProvider>
  )
}
