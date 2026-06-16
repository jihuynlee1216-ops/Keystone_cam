// Vercel Serverless Function
// 카카오 토큰 교환 + 유저 정보 조회를 서버에서 처리한다.
// 웹뷰/브라우저에서 kauth.kakao.com 을 직접 fetch 하면 CORS 로 막히고,
// client_secret 이 앱 번들에 노출되므로 반드시 서버 경유로 처리한다.
//
// 필요한 환경변수 (Vercel 대시보드 > Settings > Environment Variables):
//   KAKAO_CLIENT_SECRET   — 카카오 client_secret (절대 코드에 하드코딩 금지)
//   KAKAO_REST_API_KEY    — (선택) REST API 키 (client_id 성격)
//   KAKAO_REDIRECT_URI    — (선택) 리다이렉트 URI
// REST API 키는 client_id 성격이라 공개 무방하므로 fallback 을 둔다.
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || 'ef050dae695aed6cd66f27e3b12c001d'
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET
const DEFAULT_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI || 'https://keystone-cam.vercel.app/kakao-callback.html'

export default async function handler(req, res) {
  // CORS (웹뷰 origin: https://localhost / capacitor://localhost)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return }

  try {
    const { code, redirect_uri } = req.body || {}
    if (!code) { res.status(400).json({ error: 'missing_code' }); return }

    // 1) 인증 코드 → 액세스 토큰
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_API_KEY,
        redirect_uri: redirect_uri || DEFAULT_REDIRECT_URI,
        code,
        client_secret: KAKAO_CLIENT_SECRET,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      res.status(400).json({ error: tokenData.error_description || tokenData.error || 'token_exchange_failed' })
      return
    }

    // 2) 액세스 토큰 → 유저 정보
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userData = await userRes.json()
    if (!userData.id) {
      res.status(400).json({ error: userData.msg || 'user_info_failed' })
      return
    }

    // 앱에는 로그인에 필요한 최소 정보만 돌려준다 (토큰은 서버에만)
    res.status(200).json({
      id: userData.id,
      nickname: userData.kakao_account?.profile?.nickname || '',
    })
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) })
  }
}
