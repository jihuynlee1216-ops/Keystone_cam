// Vercel Serverless Function
// Google OAuth authorization_code → token 교환을 서버에서 처리한다.
// client_secret 을 앱 번들/클라이언트 코드에 노출하지 않기 위해 반드시 서버 경유로 처리한다.
//
// 필요한 환경변수 (Vercel 대시보드 > Settings > Environment Variables):
//   GOOGLE_CLIENT_ID      — Google OAuth Web 클라이언트 ID
//   GOOGLE_CLIENT_SECRET  — Google OAuth Web 클라이언트 시크릿 (절대 코드에 하드코딩 금지)
//   GOOGLE_REDIRECT_URI   — (선택) 기본값: https://keystone-cam.vercel.app/google-callback.html

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const DEFAULT_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://keystone-cam.vercel.app/google-callback.html'

export default async function handler(req, res) {
  // CORS (웹뷰 origin: https://localhost / capacitor://localhost)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.status(500).json({ error: 'server_misconfigured: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 환경변수를 설정하세요' })
    return
  }

  try {
    const { code, redirect_uri } = req.body || {}
    if (!code) { res.status(400).json({ error: 'missing_code' }); return }

    // 인증 코드 → 토큰 (id_token 포함)
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirect_uri || DEFAULT_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.id_token) {
      res.status(400).json({ error: tokenData.error_description || tokenData.error || 'token_exchange_failed' })
      return
    }

    // Firebase 로그인에 필요한 id_token 만 앱에 돌려준다 (access/refresh 토큰은 서버에만)
    res.status(200).json({ id_token: tokenData.id_token })
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) })
  }
}
