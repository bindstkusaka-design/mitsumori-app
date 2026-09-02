// 受付フォーム（/reception）専用の認証ヘルパー。
// Edge Middleware と Node.js の Route Handler の両方から呼ばれるため、
// Web Crypto（crypto.subtle）のみを使用し、Node組み込みの `crypto` モジュールには依存しない。

export const RECEPTION_COOKIE_NAME = 'mitsumori_reception_auth'
const RECEPTION_COOKIE_MAX_AGE = 60 * 60 * 12 // 12時間（交代制を想定した共有端末向けの短めの有効期限）
const TOKEN_SALT = 'mitsumori-reception-v1'

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 現在の RECEPTION_PASSWORD から発行すべきトークンを計算する。未設定なら null（＝常に拒否）。 */
export async function computeReceptionToken(): Promise<string | null> {
  const password = process.env.RECEPTION_PASSWORD
  if (!password) return null
  return sha256Hex(`${TOKEN_SALT}:${password}`)
}

export async function verifyReceptionPassword(password: string): Promise<boolean> {
  const expected = process.env.RECEPTION_PASSWORD
  if (!expected) return false
  return password === expected
}

/** リクエストに付いてきたCookie値が、現在のRECEPTION_PASSWORDから発行されたものと一致するか */
export async function verifyReceptionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const expected = await computeReceptionToken()
  if (!expected) return false
  return token === expected
}

export function receptionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: RECEPTION_COOKIE_MAX_AGE,
  }
}
