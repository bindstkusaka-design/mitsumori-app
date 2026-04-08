import { type ClassValue, clsx } from 'clsx'
import type { DocumentItem, JobItem, QuoteTotals, DocumentType } from '@/types'

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

// ── Document number ────────────────────────────────────────────
const DOC_PREFIX: Record<DocumentType, string> = {
  quote: 'Q',
  invoice: 'S',
  receipt: 'R',
}

export function autoDocNo(type: DocumentType, count: number): string {
  const y = new Date().getFullYear()
  const prefix = DOC_PREFIX[type]
  return `${prefix}-${y}-${String(count + 1).padStart(3, '0')}`
}

/** 後方互換: 旧コードが参照している場合に備えて残す */
export function autoQuoteNo(existingCount: number): string {
  return autoDocNo('quote', existingCount)
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
