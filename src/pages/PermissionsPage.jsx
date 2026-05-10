import React from 'react'
import { useApp } from '../store/AppContext.jsx'
import './PermissionsPage.css'

const PERMISSIONS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="14" rx="3" stroke="#1a1a1a" strokeWidth="1.5" />
        <circle cx="12" cy="13" r="3.5" stroke="#1a1a1a" strokeWidth="1.5" />
        <path d="M7 6V4.5a1.5 1.5 0 011.5-1.5h7A1.5 1.5 0 0117 4.5V6" stroke="#1a1a1a" strokeWidth="1.5" />
      </svg>
    ),
    title: '카메라 및 갤러리',
    desc: '직관 사진과 영상을 촬영하고 선택할 때 사용해요',
    required: true,
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 21v-8H7v8M7 3v5h8" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: '저장공간',
    desc: '생성된 영상을 기기에 저장할 때 사용해요',
    required: true,
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.73 21a2 2 0 01-3.46 0" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: '알림 (선택)',
    desc: '경기 일정 리마인더 등을 푸시 알림으로 받아요',
    required: false,
  },
]

export default function PermissionsPage() {
  const { dispatch } = useApp()

  const handleConfirm = async () => {
    // 카메라 권한 요청 (iOS에서 실제 사용 시 팝업이 뜸)
    // 여기서는 안내 화면만 보여주고, 실제 권한은 기능 사용 시 요청됨
    dispatch({ type: 'SET_USER', payload: { permissionsShown: true } })
  }

  return (
    <div className="permissions-page">
      <div className="permissions-content">
        <div className="permissions-header">
          <h1 className="permissions-title">앱 접근 권한 안내</h1>
          <p className="permissions-subtitle">
            직관로그 서비스 사용을 위해{'\n'}다음 접근 권한 허용이 필요합니다
          </p>
        </div>

        <div className="permissions-list">
          {PERMISSIONS.map((perm, i) => (
            <div key={i} className="permissions-item">
              <div className="permissions-item__icon">
                {perm.icon}
              </div>
              <div className="permissions-item__text">
                <p className="permissions-item__title">
                  {perm.title}
                  {!perm.required && <span className="permissions-item__optional"> (선택)</span>}
                </p>
                <p className="permissions-item__desc">{perm.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="permissions-note">
          선택 권한을 허용하지 않아도 앱 이용이 가능하지만,{'\n'}
          일부 서비스 이용에 제한이 있을 수 있습니다.
        </p>

        <button className="permissions-confirm" onClick={handleConfirm}>
          확인
        </button>
      </div>
    </div>
  )
}
