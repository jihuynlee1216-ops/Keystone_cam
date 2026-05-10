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

// ─── 설정값 (콘솔 등록 후 교체) ────────────────────────────────────
// Firebase 콘솔 > Authentication > Sign-in method > Google > Web client ID
const GOOGLE_WEB_CLIENT_ID = '1011804159446-enau53h53kmqpr56l7jp0m319ulbtjl4.apps.googleusercontent.com'
// 카카오 developers.kakao.com > 앱 > REST API 키
const KAKAO_REST_API_KEY = 'YOUR_KAKAO_REST_API_KEY'
const KAKAO_REDIRECT_URI = 'sportsarchive://kakao-callback'

const isNative = !!window.webkit?.messageHandlers

// ─── Google 로그인 ──────────────────────────────────────────────────
export async function loginWithGoogle() {
  if (!isNative) {
    // 웹: popup 방식
    const googleProvider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  }

  // 네이티브: Safari에서 Google OAuth
  const { Browser } = await import('@capacitor/browser')
  const { App: CapApp } = await import('@capacitor/app')

  return new Promise((resolve, reject) => {
    const state = Math.random().toString(36).slice(2)
    sessionStorage.setItem('google_oauth_state', state)

    const listener = CapApp.addListener('appUrlOpen', async (event) => {
      if (!event.url.startsWith('sportsarchive://google-callback')) return

      await Browser.close()
      listener.remove()

      try {
        const url = new URL(event.url.replace('sportsarchive://', 'https://'))
        const code = url.searchParams.get('code')
        if (!code) throw new Error('인증 코드가 없어요')

        // code → token 교환
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_WEB_CLIENT_ID,
            redirect_uri: 'https://keystone-cam.vercel.app/google-callback.html',
            grant_type: 'authorization_code',
          }),
        })
        const tokenData = await tokenRes.json()

        if (!tokenData.id_token) throw new Error(tokenData.error_description || '토큰 교환 실패')

        // Firebase 로그인
        const credential = GoogleAuthProvider.credential(tokenData.id_token)
        const userCred = await signInWithCredential(auth, credential)
        resolve(userCred.user)
      } catch (err) {
        reject(err)
      }
    })

    const params = new URLSearchParams({
      client_id: GOOGLE_WEB_CLIENT_ID,
      redirect_uri: 'https://keystone-cam.vercel.app/google-callback.html',
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'select_account',
    })

    Browser.open({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
  })
}

// ─── 카카오 로그인 ──────────────────────────────────────────────────
export async function loginWithKakao() {
  const { Browser } = await import('@capacitor/browser')
  const { App: CapApp } = await import('@capacitor/app')

  return new Promise((resolve, reject) => {
    const listener = CapApp.addListener('appUrlOpen', async (event) => {
      if (!event.url.startsWith('sportsarchive://kakao-callback')) return

      await Browser.close()
      listener.remove()

      try {
        const url = new URL(event.url.replace('sportsarchive://', 'https://'))
        const code = url.searchParams.get('code')
        if (!code) throw new Error('인증 코드가 없어요')

        // code → 카카오 토큰 교환
        const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: KAKAO_REST_API_KEY,
            redirect_uri: KAKAO_REDIRECT_URI,
            code,
          }),
        })
        const tokenData = await tokenRes.json()

        if (!tokenData.access_token) throw new Error('카카오 토큰 교환 실패')

        // 카카오 유저 정보 가져오기
        const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        })
        const userData = await userRes.json()

        const kakaoId = userData.id
        const nickname = userData.kakao_account?.profile?.nickname || ''
        const syntheticEmail = `kakao_${kakaoId}@sportsarchive.app`
        const syntheticPassword = `kk_${kakaoId}_${KAKAO_REST_API_KEY.slice(0, 8)}_sa`

        // Firebase 로그인 또는 회원가입
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

        // 카카오 프로필 Firestore에 저장
        await saveUserProfile(userCred.user.uid, {
          kakaoId: String(kakaoId),
          name: nickname,
          provider: 'kakao',
        })

        resolve(userCred.user)
      } catch (err) {
        reject(err)
      }
    })

    const params = new URLSearchParams({
      client_id: KAKAO_REST_API_KEY,
      redirect_uri: KAKAO_REDIRECT_URI,
      response_type: 'code',
    })

    Browser.open({ url: `https://kauth.kakao.com/oauth/authorize?${params}` })
  })
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
