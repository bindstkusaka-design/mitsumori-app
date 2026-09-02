import { NextRequest, NextResponse } from 'next/server'
import { RECEPTION_COOKIE_NAME, verifyReceptionToken } from '@/lib/reception-auth'
import { listCustomers, createCustomer, type ReceptionCustomerInput } from '@/lib/reception-customers'
import { syncCustomerToSheet } from '@/lib/google-sheets'
import { notifyReceptionCustomerSaved } from '@/lib/reception-notify'

// Middlewareでも認証チェックしているが、設定ミスへの多重防御として各Route Handlerでも再検証する
async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get(RECEPTION_COOKIE_NAME)?.value
  const authed = await verifyReceptionToken(token)
  if (!authed) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  return null
}

function parseInput(body: unknown): ReceptionCustomerInput | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  if (typeof b.name !== 'string' || !b.name.trim()) return null
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    name: b.name.trim(),
    kana: str(b.kana).trim(),
    tel: str(b.tel).trim(),
    address: str(b.address).trim(),
    email: str(b.email).trim(),
    googleMapUrl: str(b.googleMapUrl).trim(),
    notes: str(b.notes).trim(),
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const customers = await listCustomers()
    return NextResponse.json({ customers })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const input = parseInput(await request.json().catch(() => null))
  if (!input) {
    return NextResponse.json({ error: '顧客名を入力してください' }, { status: 400 })
  }

  try {
    const customer = await createCustomer(input)

    const warnings: string[] = []
    const sheetResult = await syncCustomerToSheet(customer)
    if (!sheetResult.ok && sheetResult.error) warnings.push(sheetResult.error)
    const notifyResult = await notifyReceptionCustomerSaved(customer, 'created')
    if (!notifyResult.ok && notifyResult.error) warnings.push(notifyResult.error)

    return NextResponse.json({ customer, warnings })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '登録に失敗しました' }, { status: 500 })
  }
}
