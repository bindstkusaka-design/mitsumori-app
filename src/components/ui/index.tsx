'use client'

import React from 'react'
import { cn, fmtMoney } from '@/lib/utils'

// ── Button ─────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 cursor-pointer select-none',
        'disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]',
        // sizes
        size === 'sm' && 'px-3 py-1.5 text-xs rounded-btn',
        size === 'md' && 'px-4 py-2.5 text-sm rounded-btn',
        size === 'lg' && 'px-5 py-3 text-sm rounded-btn w-full',
        size === 'icon' && 'p-2 rounded-btn',
        // variants
        variant === 'primary' && 'bg-accent text-white hover:bg-accent-hover shadow-sm',
        variant === 'secondary' && 'bg-surface-2 text-ink border border-border hover:bg-border',
        variant === 'ghost' && 'text-ink-sub border border-border hover:bg-surface-2',
        variant === 'danger' && 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white',
        variant === 'outline' && 'border border-accent text-accent hover:bg-accent-light',
        className,
      )}
    >
      {children}
    </button>
  )
}

// ── Badge ──────────────────────────────────────────────────────
interface BadgeProps {
  variant?: 'draft' | 'final' | 'pdf' | 'missing' | 'default'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
        variant === 'draft' && 'bg-surface-2 text-ink-sub border-border',
        variant === 'final' && 'bg-accent-light text-accent border-green-200',
        variant === 'pdf' && 'bg-blue-50 text-blue-700 border-blue-200',
        variant === 'missing' && 'bg-amber-50 text-amber-700 border-amber-200',
        variant === 'default' && 'bg-surface-2 text-ink-sub border-border',
        className,
      )}
    >
      {children}
    </span>
  )
}

// ── Card ───────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  clickable?: boolean
  accent?: boolean
}

export function Card({ clickable, accent, className, children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        'bg-white rounded-card border border-border shadow-card',
        clickable && 'cursor-pointer hover:border-accent active:scale-[0.99] transition-all',
        accent && 'border-l-4 border-l-accent',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ── Modal (bottom sheet) ───────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  // Prevent scroll when open
  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-end transition-opacity duration-200',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      )}
      style={{ backgroundColor: open ? 'rgba(0,0,0,0.5)' : 'transparent' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={cn(
          'w-full max-h-[90vh] overflow-y-auto bg-white rounded-t-[20px] transition-transform duration-300',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{ paddingBottom: 'calc(20px + var(--safe-bottom))' }}
      >
        {/* handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        <div className="px-5 pb-2">
          {title && <h2 className="text-[17px] font-bold text-ink mb-5">{title}</h2>}
          {children}
        </div>
      </div>
    </div>
  )
}

// ── FormGroup ──────────────────────────────────────────────────
export function FormGroup({
  label,
  required,
  children,
  className,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4', className)}>
      <label className="block text-[12px] font-semibold text-ink-sub mb-1.5 tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Input ──────────────────────────────────────────────────────
export const inputBase =
  'w-full px-3.5 py-2.5 border border-border rounded-btn text-sm text-ink bg-white transition-all outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-ink-muted'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        inputBase,
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a8478' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_12px_center] pr-9 appearance-none",
        props.className,
      )}
    />
  )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(inputBase, 'min-h-[80px] resize-y', props.className)}
    />
  )
}

// ── Divider ────────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px bg-border my-4', className)} />
}

// ── EmptyState ─────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-14 px-6">
      <div className="text-5xl mb-3 opacity-40">{icon}</div>
      <div className="text-base font-semibold text-ink-sub mb-2">{title}</div>
      <div className="text-sm text-ink-muted leading-relaxed mb-4">{description}</div>
      {action}
    </div>
  )
}

// ── SectionHeader ──────────────────────────────────────────────
export function SectionHeader({
  title,
  sub,
  action,
}: {
  title: string
  sub?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Chip (template selector) ───────────────────────────────────
export function Chip({
  children,
  onClick,
  selected,
}: {
  children: React.ReactNode
  onClick?: () => void
  selected?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border cursor-pointer transition-all',
        selected
          ? 'bg-accent-light border-accent text-accent'
          : 'bg-surface-2 border-border text-ink-sub hover:border-accent hover:text-accent',
      )}
    >
      {children}
    </button>
  )
}

// ── Toast (simple imperative) ──────────────────────────────────
type ToastType = 'default' | 'success' | 'error'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

// シングルトンのトースト状態（グローバル）
let _setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null

export function showToast(message: string, type: ToastType = 'default') {
  if (!_setToasts) return
  const id = Math.random().toString(36).slice(2)
  _setToasts(prev => [...prev, { id, message, type }])
  setTimeout(() => {
    _setToasts?.(prev => prev.filter(t => t.id !== id))
  }, 2500)
}

export function ToastProvider() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  _setToasts = setToasts

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2 px-5 py-3 rounded-full text-sm text-white shadow-lg whitespace-nowrap',
            'animate-[fadeUp_0.25s_ease]',
            t.type === 'success' && 'bg-accent',
            t.type === 'error' && 'bg-red-600',
            t.type === 'default' && 'bg-ink',
          )}
        >
          {t.type === 'success' && '✓'}
          {t.type === 'error' && '✗'}
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ── Amount Summary ─────────────────────────────────────────────
export function AmountSummary({
  subtotal,
  tax,
  total,
  taxRate,
}: {
  subtotal: number
  tax: number
  total: number
  taxRate: number
}) {
  return (
    <div className="bg-surface-2 rounded-btn px-4 py-3 mt-3 space-y-1">
      <div className="flex justify-between text-sm text-ink-sub">
        <span>小計</span>
        <span>{fmtMoney(subtotal)}</span>
      </div>
      <div className="flex justify-between text-sm text-ink-sub">
        <span>消費税（{Math.round(taxRate * 100)}%）</span>
        <span>{fmtMoney(tax)}</span>
      </div>
      <div className="flex justify-between text-base font-bold text-ink border-t border-border-strong pt-2 mt-1">
        <span>合計金額</span>
        <span className="text-accent">{fmtMoney(total)}</span>
      </div>
    </div>
  )
}
