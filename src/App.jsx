import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext.jsx'

const OnboardingPage   = React.lazy(() => import('./pages/OnboardingPage.jsx'))
const CalendarPage     = React.lazy(() => import('./pages/CalendarPage.jsx'))
const LogCreatePage    = React.lazy(() => import('./pages/LogCreatePage.jsx'))
const LogViewPage      = React.lazy(() => import('./pages/LogViewPage.jsx'))
const ArchivePage      = React.lazy(() => import('./pages/ArchivePage.jsx'))
const VideoPreviewPage = React.lazy(() => import('./pages/VideoPreviewPage.jsx'))

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
  const { state } = useApp()

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* NFC entry point — routes based on onboarding state */}
        <Route
          path="/"
          element={
            state.user.onboarded
              ? <Navigate to="/calendar" replace />
              : <OnboardingPage />
          }
        />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/calendar"   element={<CalendarPage />} />
        <Route path="/create/:date" element={<LogCreatePage />} />
        <Route path="/log/:date"    element={<LogViewPage />} />
        <Route path="/archive"      element={<ArchivePage />} />
        <Route path="/video/:type"  element={<VideoPreviewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-shell">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AppProvider>
  )
}
