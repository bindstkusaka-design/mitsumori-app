// 角印画像を mitsumori_v2 とは別キーで管理する
// base64 data URL は数十〜数百 KB になるため、メインストアとは分離して保存する
const SEAL_KEY = 'mitsumori_seal'

export function loadSeal(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(SEAL_KEY)
  } catch {
    return null
  }
}

export function saveSeal(dataUrl: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SEAL_KEY, dataUrl)
  } catch {
    // quota exceeded
  }
}

export function deleteSeal(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SEAL_KEY)
  } catch {
    // ignore
  }
}
