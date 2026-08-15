import { createClient } from '@supabase/supabase-js'

export const SEAL_BUCKET = 'company-assets'
export const PDF_BUCKET = 'pdf-assets'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/** insert/update の `.select().single()` 結果を検証し、成功時はデータ本体を返す */
export function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  if (data === null) throw new Error('データが返されませんでした')
  return data
}
