import { NextRequest, NextResponse } from 'next/server'
import { RECEPTION_COOKIE_NAME, verifyReceptionToken } from '@/lib/reception-auth'

export async function middleware(request: NextRequest) {
  // ログイン自体は無認証で呼べる必要がある
  if (request.nextUrl.pathname === '/api/reception/login') {
    return NextResponse.next()
  }

  const token = request.cookies.get(RECEPTION_COOKIE_NAME)?.value
  const authed = await verifyReceptionToken(token)
  if (!authed) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/reception/:path*'],
}
