import { initializeApp } from 'firebase/app'
import {
  initializeAuth,
  browserLocalPersistence,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  deleteUser,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
} from 'firebase/firestore'
import { SignInWithApple } from '@capacitor-community/apple-sign-in'
import { clearAllMedia } from './mediaDB.js'

const firebaseConfig = {
  apiKey: "AIzaSyDL4813xgrAC4QSLpMGBrmXiUXp0AZbNx4",
  authDomain: "record-381f1.firebaseapp.com",
  projectId: "record-381f1",
  storageBucket: "record-381f1.firebasestorage.app",
  messagingSenderId: "1011804159446",
  appId: "1:1011804159446:web:af75328bd58da8d8067877",
  measurementId: "G-JLMHGX4XY2",
}

const app = initializeApp(firebaseConfig)
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
})
export const db = getFirestore(app)

// ─── 설정값 ──────────────────────────────────────────────────────
// client_id 류는 공개돼도 되는 식별자라 클라이언트에 둬도 되지만,
// client_secret 은 절대 클라이언트/번들에 두지 않고 서버리스 프록시에서만 사용한다.
// Firebase 콘솔 > Authentication > Sign-in method > Google > Web client ID
const GOOGLE_WEB_CLIENT_ID = '1011804159446-enau53h53kmqpr56l7jp0m319ulbtjl4.apps.googleusercontent.com'
const GOOGLE_REDIRECT_URI = 'https://keystone-cam.vercel.app/google-callback.html'
// 토큰 교환(client_secret 사용)은 서버리스 프록시 경유 — api/google-token.js
const GOOGLE_TOKEN_PROXY = 'https://keystone-cam.vercel.app/api/google-token'
// 카카오 developers.kakao.com > 앱 > REST API 키 (client_id 성격, 공개 무방)
const KAKAO_REST_API_KEY = 'ef050dae695aed6cd66f27e3b12c001d'
const KAKAO_REDIRECT_URI = 'https://keystone-cam.vercel.app/kakao-callback.html'
// 토큰 교환은 서버리스 프록시 경유 (CORS·client_secret 노출 회피) — api/kakao-token.js
const KAKAO_TOKEN_PROXY = 'https://keystone-cam.vercel.app/api/kakao-token'

const isNative = !!window.webkit?.messageHandlers

// fetch + 타임아웃 (프록시가 응답 없이 멈추면 로그인이 "잠시만..."에 무한정 걸리는 것 방지)
async function fetchWithTimeout(url, options = {}, ms = 25000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('서버 응답이 없어요. 네트워크를 확인해주세요.')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// ─── Safari 열기 (네이티브 or 웹) ──────────────────────────────────
function openInSafari(url) {
  if (window.webkit?.messageHandlers?.openSafari) {
    window.webkit.messageHandlers.openSafari.postMessage(url)
  } else {
    window.open(url, '_blank')
  }
}

// OAuth 콜백 대기 (AppDelegate에서 호출됨)
function waitForOAuthCallback(prefix) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      delete window.__handleOAuthCallback
      reject(new Error('로그인 시간 초과'))
    }, 120000) // 2분 타임아웃

    window.__handleOAuthCallback = (urlString) => {
      if (!urlString.startsWith(prefix)) return
      clearTimeout(timeout)
      delete window.__handleOAuthCallback
      resolve(urlString)
    }
  })
}

// ─── Google 로그인 ──────────────────────────────────────────────────
export async function loginWithGoogle() {
  if (!isNative) {
    const googleProvider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  }

  // 콜백 리스너 먼저 등록
  const callbackPromise = waitForOAuthCallback('sportsarchive://google-callback')

  // Safari에서 Google OAuth 열기
  const params = new URLSearchParams({
    client_id: GOOGLE_WEB_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state: Math.random().toString(36).slice(2),
    access_type: 'offline',
    prompt: 'select_account',
  })
  openInSafari(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)

  // 콜백 대기
  const urlString = await callbackPromise
  const url = new URL(urlString.replace('sportsarchive://', 'https://'))
  const code = url.searchParams.get('code')
  if (!code) throw new Error('인증 코드가 없어요')

  // code → token 교환 (client_secret 노출 회피 위해 서버리스 프록시 경유)
  const tokenRes = await fetchWithTimeout(GOOGLE_TOKEN_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: GOOGLE_REDIRECT_URI }),
  })
  const tokenData = await tokenRes.json()

  if (!tokenData.id_token) throw new Error(tokenData.error || tokenData.error_description || '토큰 교환 실패')

  const credential = GoogleAuthProvider.credential(tokenData.id_token)
  const userCred = await signInWithCredential(auth, credential)
  return userCred.user
}

// ─── 카카오 로그인 ──────────────────────────────────────────────────
export async function loginWithKakao() {
  // 콜백 리스너 먼저 등록
  const callbackPromise = waitForOAuthCallback('sportsarchive://kakao-callback')

  const params = new URLSearchParams({
    client_id: KAKAO_REST_API_KEY,
    redirect_uri: KAKAO_REDIRECT_URI,
    response_type: 'code',
  })

  if (isNative) {
    openInSafari(`https://kauth.kakao.com/oauth/authorize?${params}`)
  } else {
    window.open(`https://kauth.kakao.com/oauth/authorize?${params}`, '_blank')
  }

  const urlString = await callbackPromise
  const url = new URL(urlString.replace('sportsarchive://', 'https://'))
  const code = url.searchParams.get('code')
  if (!code) throw new Error('인증 코드가 없어요')

  // code → 서버리스 프록시에서 토큰 교환 + 유저 정보 조회 (CORS·시크릿 노출 회피)
  const proxyRes = await fetchWithTimeout(KAKAO_TOKEN_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: KAKAO_REDIRECT_URI }),
  })
  const userData = await proxyRes.json()

  if (!userData.id) throw new Error(userData.error || '카카오 로그인 실패')

  const kakaoId = userData.id
  const nickname = userData.nickname || ''
  const syntheticEmail = `kakao_${kakaoId}@sportsarchive.app`
  const syntheticPassword = `kk_${kakaoId}_${KAKAO_REST_API_KEY.slice(0, 8)}_sa`

  let userCred
  try {
    userCred = await signInWithEmailAndPassword(auth, syntheticEmail, syntheticPassword)
  } catch (e) {
    if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
      userCred = await createUserWithEmailAndPassword(auth, syntheticEmail, syntheticPassword)
    } else {
      throw e
    }
  }

  await saveUserProfile(userCred.user.uid, {
    kakaoId: String(kakaoId),
    name: nickname,
    provider: 'kakao',
  })

  return userCred.user
}

// ─── Apple 로그인 ───────────────────────────────────────────────────
// 랜덤 nonce 생성 + SHA-256 해시 (재전송 공격 방지, Firebase 요구사항)
function randomNonce(length = 32) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-._'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

async function sha256Hex(str) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

export async function loginWithApple() {
  const rawNonce = randomNonce()
  const hashedNonce = await sha256Hex(rawNonce)

  // 네이티브 Sign in with Apple 시트 표시
  const result = await SignInWithApple.authorize({
    scopes: 'email name',
    nonce: hashedNonce,
  })

  const idToken = result?.response?.identityToken
  if (!idToken) throw new Error('Apple 인증 토큰을 받지 못했어요')

  const provider = new OAuthProvider('apple.com')
  const credential = provider.credential({ idToken, rawNonce })
  const userCred = await signInWithCredential(auth, credential)

  // 이름은 Apple이 첫 로그인 때만 돌려줌 → 있을 때만 저장 (Firestore는 undefined 거부)
  const given = result?.response?.givenName || ''
  const family = result?.response?.familyName || ''
  const appleName = `${family}${given}`.trim() || result?.response?.email || ''
  const profile = { provider: 'apple' }
  if (appleName) profile.name = appleName
  await saveUserProfile(userCred.user.uid, profile)

  return userCred.user
}

// ─── 이메일 로그인 ──────────────────────────────────────────────────
export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signUpWithEmail(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  try {
    await sendEmailVerification(result.user)
  } catch (err) {
    alert('인증 메일 발송 오류: ' + (err.code || err.message))
  }
  return result.user
}

export async function resendVerification() {
  if (auth.currentUser && !auth.currentUser.emailVerified) {
    await sendEmailVerification(auth.currentUser)
  }
}

export async function logout() {
  await signOut(auth)
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback)
}

// ─── Firestore helpers ───────────────────────────────────────────────

export async function saveUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), data, { merge: true })
}

export async function loadUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export async function saveLog(uid, log) {
  const cleaned = {
    ...log,
    media: (log.media || []).map(m => ({ ...m, dataUrl: null })),
  }
  await setDoc(doc(db, 'users', uid, 'logs', log.id), cleaned)
}

export async function loadAllLogs(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'logs'))
  return snap.docs.map(d => d.data())
}

export async function deleteLogFromDB(uid, logId) {
  await deleteDoc(doc(db, 'users', uid, 'logs', logId))
}

// ─── 계정 삭제 (App Store 5.1.1(v) 요구) ─────────────────────────────
// 계정과 모든 데이터(기록·프로필·기기 내 미디어)를 영구 삭제한다.
export async function deleteAccount() {
  const user = auth.currentUser
  if (!user) throw new Error('로그인 상태가 아니에요')
  const uid = user.uid

  // 1) Firestore: 기록(logs) 전부 + 프로필 문서 삭제
  const logsSnap = await getDocs(collection(db, 'users', uid, 'logs'))
  await Promise.all(logsSnap.docs.map(d => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'users', uid))

  // 2) 기기 로컬 미디어 전부 삭제
  try { await clearAllMedia() } catch (e) { /* 미디어 없어도 진행 */ }

  // 3) Firebase 인증 계정 삭제
  try {
    await deleteUser(user)
  } catch (e) {
    // 보안상 최근 로그인 필요 → 재로그인 유도
    if (e.code === 'auth/requires-recent-login') {
      await signOut(auth)
      const err = new Error('보안을 위해 다시 로그인한 후 계정 삭제를 진행해주세요.')
      err.code = 'requires-recent-login'
      throw err
    }
    throw e
  }
}
