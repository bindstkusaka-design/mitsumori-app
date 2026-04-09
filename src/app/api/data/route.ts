import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

// ローカル開発: プロジェクトルートの data/sync.json
// Vercel: /tmp/sync.json（揮発性、Vercel KV 移行を推奨）
const DATA_FILE =
  process.env.SYNC_DATA_PATH ??
  (process.env.VERCEL
    ? '/tmp/mitsumori_sync.json'
    : path.join(process.cwd(), 'data', 'sync.json'))

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    // ファイルが存在しない場合は null を返す
    return NextResponse.json(null)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(body, null, 2), 'utf8')
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[sync] write error:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
