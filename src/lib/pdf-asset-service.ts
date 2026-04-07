/**
 * pdf-asset-service
 *
 * PDF の保存・取得・存在確認の境界。
 * Supabase Storage に切り替える場合はここだけ修正する。
 *
 * - pdfPath = "documents/{documentId}.pdf" 形式（bucket/objectPath）
 * - フロントのみ動作モードでは「模擬保存」としてフラグだけ立てる
 */

export type PdfSaveResult =
  | { ok: true; pdfPath: string; savedAt: string }
  | { ok: false; error: string }

export type PdfExistsResult =
  | { exists: true; pdfPath: string }
  | { exists: false; pdfPath: string | null }

/**
 * PDF を保存する（フロント専用モードでは模擬保存）
 */
export async function savePdfAsset(
  documentId: string,
  _htmlContent?: string,
): Promise<PdfSaveResult> {
  // TODO: Supabase Storage 実装時に置き換え
  // const buffer = await generatePdfBuffer(htmlContent)
  // await supabase.storage.from('documents').upload(objectPath, buffer, { upsert: true })
  const pdfPath = `documents/${documentId}.pdf`
  const savedAt = new Date().toISOString()
  return { ok: true, pdfPath, savedAt }
}

/**
 * PDF が存在するか確認する
 */
export async function checkPdfExists(
  pdfPath: string | null,
): Promise<PdfExistsResult> {
  if (!pdfPath) return { exists: false, pdfPath: null }
  // TODO: Supabase Storage 実装時に storage.from(bucket).info(objectPath) で確認
  // フロント専用モードでは pdfPath があれば存在とみなす
  return { exists: true, pdfPath }
}

/**
 * PDF の公開 URL を返す（ダウンロード用）
 */
export function getPdfUrl(pdfPath: string): string {
  // TODO: Supabase Storage 実装時に signed URL を返す
  return `/api/pdf-assets/${pdfPath}`
}
