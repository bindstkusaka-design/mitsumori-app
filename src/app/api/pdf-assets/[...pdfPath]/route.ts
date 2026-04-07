import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

/**
 * GET /api/pdf-assets/[...pdfPath]
 *
 * pdf-asset-service の取得境界。
 * Supabase Storage に切り替える場合はここだけ修正する。
 *
 * ローカル fallback:
 *   /generated/{pdfPath} を返す
 *
 * Supabase Storage:
 *   storage.from(bucket).download(objectPath) で取得する
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { pdfPath: string[] } },
) {
  const pdfPath = params.pdfPath.join('/')

  // TODO: Supabase Storage 実装時に置き換え
  // const [bucket, ...parts] = pdfPath.split('/')
  // const objectPath = parts.join('/')
  // const { data, error } = await supabase.storage.from(bucket).download(objectPath)
  // if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  // const buffer = await data.arrayBuffer()

  try {
    const filePath = path.join(process.cwd(), 'generated', pdfPath)
    const buffer = await readFile(filePath)
    const fileName = path.basename(pdfPath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'PDF not found', pdfPath }, { status: 404 })
  }
}
