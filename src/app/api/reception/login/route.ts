import { NextRequest, NextResponse } from 'next/server'
import { RECEPTION_COOKIE_NAME, computeReceptionToken, receptionCookieOptions, verifyReceptionPassword } from '@/lib/reception-auth'

export async function POST(request: NextRequest) {
  let password: string
  try {
    const body = await request.json()
    password = typeof body?.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  const ok = await verifyReceptionPassword(password)
  if (!ok) {
    return NextResponse.json({ error: 'パスワードが違います' }, { status: 401 })
  }

  const token = await computeReceptionToken()
  if (!token) {
    return NextResponse.json({ error: '受付フォームが設定されていません' }, { status: 503 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(RECEPTION_COOKIE_NAME, token, receptionCookieOptions())
  return response
}
