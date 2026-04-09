const KEY = 'mitsumori_v2'

// デバウンス用タイマー
let syncTimer: ReturnType<typeof setTimeout> | null = null
const SYNC_DELAY_MS = 1500

// ── localStorage ──────────────────────────────────────────────

export function loadStorage<T>(fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveStorage<T>(data: T): void {
  if (typeof window === 'undefined') return
  // まず localStorage に即時保存
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // quota exceeded など
  }
  // クラウドへはデバウンス付きで同期
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {
      // オフライン時はサイレントに無視
    })
  }, SYNC_DELAY_MS)
}

// ── クラウド同期 ──────────────────────────────────────────────

/**
 * サーバーからデータを取得し、localStorage を更新して返す。
 * 失敗した場合は fallback を返す（オフラインフォールバック）。
 */
export async function loadFromCloud<T>(fallback: T): Promise<T> {
  if (typeof window === 'undefined') return fallback
  try {
    const res = await fetch('/api/data', { cache: 'no-store' })
    if (!res.ok) return fallback
    const data = await res.json()
    if (data !== null && typeof data === 'object') {
      // クラウドデータで localStorage を上書き
      localStorage.setItem(KEY, JSON.stringify(data))
      return data as T
    }
  } catch {
    // ネットワークエラー → localStorage フォールバック
  }
  return fallback
}
