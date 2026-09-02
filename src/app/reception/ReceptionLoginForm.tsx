'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, FormGroup, Input, ToastProvider, showToast } from '@/components/ui'

export default function ReceptionLoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/reception/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        showToast(body.error ?? 'パスワードが違います', 'error')
        return
      }
      router.refresh()
    } catch {
      showToast('通信に失敗しました', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 pt-24">
      <h1 className="text-lg font-semibold mb-1">顧客受付</h1>
      <p className="text-xs text-ink-muted mb-6">パスワードを入力してください</p>
      <form onSubmit={handleSubmit}>
        <FormGroup label="パスワード" required>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
        </FormGroup>
        <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full mt-2">
          {submitting ? '確認中…' : 'ログイン'}
        </Button>
      </form>
      <ToastProvider />
    </main>
  )
}
