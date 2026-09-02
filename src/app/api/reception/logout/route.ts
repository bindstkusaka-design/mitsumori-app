import { NextResponse } from 'next/server'
import { RECEPTION_COOKIE_NAME } from '@/lib/reception-auth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(RECEPTION_COOKIE_NAME, '', { path: '/', maxAge: 0 })
  return response
}
