import { NextRequest, NextResponse } from 'next/server'
import { RECEPTION_COOKIE_NAME, verifyReceptionToken } from '@/lib/reception-auth'
import { updateCustomer, type ReceptionCustomerInput } from '@/lib/reception-customers'
import { syncCustomerToSheet } from '@/lib/google-sheets'

async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get(RECEPTION_COOKIE_NAME)?.value
  const authed = await verifyReceptionToken(token)
  if (!authed) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  return null
}

function parseInput(body: unknown): Partial<ReceptionCustomerInput> | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  if (b.name !== undefined && (typeof b.name !== 'string' || !b.name.trim())) return null
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined)
  const params: Partial<ReceptionCustomerInput> = {}
  if (b.name !== undefined) params.name = (b.name as string).trim()
  if (b.kana !== undefined) params.kana = str(b.kana)
  if (b.tel !== undefined) params.tel = str(b.tel)
  if (b.address !== undefined) params.address = str(b.address)
  if (b.email !== undefined) params.email = str(b.email)
  if (b.googleMapUrl !== undefined) params.googleMapUrl = str(b.googleMapUrl)
  if (b.notes !== undefined) params.notes = str(b.notes)
  return params
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const input = parseInput(await request.json().catch(() => null))
  if (!input) {
    return NextResponse.json({ error: '顧客名を入力してください' }, { status: 400 })
  }

  try {
    const customer = await updateCustomer(params.id, input)

    const warnings: string[] = []
    const sheetResult = await syncCustomerToSheet(customer)
    if (!sheetResult.ok && sheetResult.error) warnings.push(sheetResult.error)

    return NextResponse.json({ customer, warnings })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '更新に失敗しました' }, { status: 500 })
  }
}
