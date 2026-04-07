import { type ClassValue, clsx } from 'clsx'
import type { DocumentItem, JobItem, QuoteTotals } from '@/types'

// ── CSS class merging ──────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// ── ID generation ──────────────────────────────────────────────
export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// ── Date helpers ───────────────────────────────────────────────
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function expireISO(days = 30): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

// ── Money helpers ──────────────────────────────────────────────
export function fmtMoney(n: number): string {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

// ── Quote number ───────────────────────────────────────────────
export function autoQuoteNo(existingCount: number): string {
  const y = new Date().getFullYear()
  return `Q-${y}-${String(existingCount + 1).padStart(3, '0')}`
}

// ── Totals calculation ─────────────────────────────────────────
export function calcTotals(
  items: (JobItem | DocumentItem)[],
  taxRate: number,
): QuoteTotals {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const tax = Math.round(subtotal * taxRate)
  return { subtotal, tax, total: subtotal + tax }
}
