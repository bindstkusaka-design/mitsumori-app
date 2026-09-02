'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import {
  Button, Card, Modal, FormGroup, Input, Textarea,
  SectionHeader, EmptyState, ToastProvider, showToast,
} from '@/components/ui'
import type { Customer } from '@/types'

type CustomerFormFields = Pick<Customer, 'name' | 'kana' | 'tel' | 'address' | 'email' | 'googleMapUrl' | 'notes'>

const EMPTY_FORM: CustomerFormFields = { name: '', kana: '', tel: '', address: '', email: '', googleMapUrl: '', notes: '' }

export default function ReceptionCustomersClient() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CustomerFormFields>(EMPTY_FORM)

  async function loadCustomers() {
    setLoading(true)
    try {
      const res = await fetch('/api/reception/customers')
      if (!res.ok) throw new Error()
      const body = await res.json()
      setCustomers(body.customers ?? [])
    } catch {
      showToast('顧客一覧の取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  function openNew() {
    setEditing(null); setForm(EMPTY_FORM); setOpen(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ name: c.name, kana: c.kana, tel: c.tel, address: c.address, email: c.email, googleMapUrl: c.googleMapUrl, notes: c.notes })
    setOpen(true)
  }

  function setField<K extends keyof CustomerFormFields>(key: K, value: CustomerFormFields[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast('顧客名を入力してください', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(), kana: form.kana.trim(), tel: form.tel.trim(),
        address: form.address.trim(), email: form.email.trim(),
        googleMapUrl: form.googleMapUrl.trim(), notes: form.notes.trim(),
      }
      const res = editing
        ? await fetch(`/api/reception/customers/${editing.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          })
        : await fetch('/api/reception/customers', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        showToast(body.error ?? '保存に失敗しました', 'error')
        return
      }

      const body = await res.json()
      showToast(editing ? '更新しました' : '顧客を追加しました', 'success')
      for (const warning of body.warnings ?? []) {
        showToast(warning, 'default')
      }
      setOpen(false)
      await loadCustomers()
    } catch {
      showToast('保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/reception/logout', { method: 'POST' })
    router.refresh()
  }

  const sortKey = (c: Customer) => c.kana.trim() || c.name
  const sorted = [...customers].sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'ja'))

  return (
    <>
      <main className="max-w-xl mx-auto px-4 pt-4 pb-tab">
        <SectionHeader
          title="顧客受付"
          sub={`${customers.length}件`}
          action={
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={openNew}>
                <Plus size={14} /> 追加
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                ログアウト
              </Button>
            </div>
          }
        />

        {loading ? (
          <p className="text-sm text-ink-muted text-center py-14">読み込み中…</p>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon="👤"
            title="顧客がありません"
            description={'「＋追加」から\n登録できます'}
            action={
              <Button variant="primary" size="md" onClick={openNew}>
                <Plus size={14} /> 顧客を追加
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {sorted.map(c => (
              <Card key={c.id} className="p-4 cursor-pointer" onClick={() => openEdit(c)}>
                <p className="font-semibold text-sm">{c.name}</p>
                {c.tel && <p className="text-xs text-ink-muted mt-0.5">📞 {c.tel}</p>}
                {c.address && <p className="text-xs text-ink-muted mt-0.5">{c.address}</p>}
                {c.email && <p className="text-xs text-ink-muted mt-0.5">{c.email}</p>}
              </Card>
            ))}
          </div>
        )}
      </main>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? '顧客を編集' : '顧客を追加'}>
        <FormGroup label="顧客名" required>
          <Input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="例: 〇〇株式会社" />
        </FormGroup>
        <FormGroup label="ふりがな">
          <Input value={form.kana} onChange={e => setField('kana', e.target.value)} placeholder="例: まるまるかぶしきがいしゃ" />
        </FormGroup>
        <FormGroup label="電話番号">
          <Input value={form.tel} onChange={e => setField('tel', e.target.value)} placeholder="03-xxxx-xxxx" />
        </FormGroup>
        <FormGroup label="住所">
          <Input value={form.address} onChange={e => setField('address', e.target.value)} placeholder="東京都渋谷区…" />
        </FormGroup>
        <FormGroup label="メールアドレス">
          <Input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="info@example.com" />
        </FormGroup>
        <FormGroup label="Google マップ URL">
          <Input value={form.googleMapUrl} onChange={e => setField('googleMapUrl', e.target.value)} placeholder="任意" />
        </FormGroup>
        <FormGroup label="備考">
          <Textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="予備の電話番号など" rows={2} />
        </FormGroup>
        <div className="flex gap-2.5 mt-2">
          <Button variant="ghost" size="lg" onClick={() => setOpen(false)} className="flex-1">キャンセル</Button>
          <Button variant="primary" size="lg" onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </Modal>

      <ToastProvider />
    </>
  )
}
