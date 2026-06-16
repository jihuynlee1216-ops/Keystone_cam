import { initializeApp } from 'firebase/app'
import {
  initializeAuth,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
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
  const tokenRes = await fetch(GOOGLE_TOKEN_PROXY, {
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
  const proxyRes = await fetch(KAKAO_TOKEN_PROXY, {
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
