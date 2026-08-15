/**
 * pdf-asset-service
 *
 * PDF の保存・取得・存在確認の境界。Supabase Storage (pdf-assets バケット) を利用する。
 *
 * - pdfPath = "pdf-assets/documents/{documentId}.pdf" 形式（bucket/objectPath）
 */
import { supabase, PDF_BUCKET } from '@/lib/supabase'

export type PdfSaveResult =
  | { ok: true; pdfPath: string; savedAt: string }
  | { ok: false; error: string }

export type PdfExistsResult =
  | { exists: true; pdfPath: string }
  | { exists: false; pdfPath: string | null }

/**
 * PDF Blob を Supabase Storage にアップロードする
 */
export async function savePdfAsset(documentId: string, blob: Blob): Promise<PdfSaveResult> {
  const objectPath = `documents/${documentId}.pdf`
  const { error } = await supabase.storage.from(PDF_BUCKET).upload(objectPath, blob, {
    upsert: true,
    contentType: 'application/pdf',
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, pdfPath: `${PDF_BUCKET}/${objectPath}`, savedAt: new Date().toISOString() }
}

/**
 * PDF が存在するか確認する（DB上の pdfPath の有無で判定）
 */
export async function checkPdfExists(pdfPath: string | null): Promise<PdfExistsResult> {
  if (!pdfPath) return { exists: false, pdfPath: null }
  return { exists: true, pdfPath }
}

/**
 * PDF の公開 URL を返す（ダウンロード用）
 */
export function getPdfUrl(pdfPath: string): string {
  const [bucket, ...rest] = pdfPath.split('/')
  const objectPath = rest.join('/')
  return supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl
}
