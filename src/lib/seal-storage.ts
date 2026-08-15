// 角印画像を Supabase Storage (company-assets バケット) で管理する。
// company_settings.seal_image_path にオブジェクトパスを保持する。
import { supabase, SEAL_BUCKET } from '@/lib/supabase'

export async function saveSeal(file: File): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const ext = file.name.split('.').pop() || 'png'
  const path = `seal.${ext}`
  const { error } = await supabase.storage.from(SEAL_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/png',
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, path }
}

export async function deleteSealFile(path: string): Promise<void> {
  await supabase.storage.from(SEAL_BUCKET).remove([path])
}

export function getSealUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from(SEAL_BUCKET).getPublicUrl(path).data.publicUrl
}
