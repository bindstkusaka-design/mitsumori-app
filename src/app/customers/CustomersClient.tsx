'use client'

import React, { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import {
  Button, Card, Modal, ConfirmModal, FormGroup, Input, Textarea,
  SectionHeader, EmptyState, ToastProvider, showToast,
} from '@/components/ui'
import TopNav from '@/components/layout/TopNav'
import BackButton from '@/components/layout/BackButton'
import BottomTab from '@/components/layout/BottomTab'
import type { Customer } from '@/types'

export default function CustomersClient() {
  const { customers, createCustomer, updateCustomer, deleteCustomer } = useStore()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [tel, setTel] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [googleMapUrl, setGoogleMapUrl] = useState('')
  const [notes, setNotes] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openNew() {
    setEditing(null); setName(''); setTel(''); setAddress(''); setEmail(''); setGoogleMapUrl(''); setNotes('')
    setOpen(true)
  }

  function openEdit(c: Customer) {
    setEditing(c); setName(c.name); setTel(c.tel); setAddress(c.address); setEmail(c.email); setGoogleMapUrl(c.googleMapUrl); setNotes(c.notes)
    setOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) { showToast('顧客名を入力してください', 'error'); return }
    setSaving(true)
    try {
      const params = { name: name.trim(), tel: tel.trim(), address: address.trim(), email: email.trim(), googleMapUrl: googleMapUrl.trim(), notes: notes.trim() }
      if (editing) {
        await updateCustomer(editing.id, params)
        showToast('更新しました', 'success')
      } else {
        await createCustomer(params)
        showToast('顧客を追加しました', 'success')
      }
      setOpen(false)
    } catch {
      showToast('保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const result = await deleteCustomer(deleteTarget.id)
      if (result.ok) {
        showToast('削除しました')
        setDeleteTarget(null)
      } else {
        showToast(result.error ?? '削除に失敗しました', 'error')
      }
    } finally {
      setDeleting(false)
    }
  }

  const sorted = [...customers].sort((a, b) => a.name.localeCompare(b.name, 'ja'))

  return (
    <>
      <TopNav left={<BackButton href="/settings" />} />
      <main className="max-w-xl mx-auto px-4 pt-4 pb-tab">
        <SectionHeader
          title="顧客管理"
          sub={`${customers.length}件`}
          action={
            <Button variant="primary" size="sm" onClick={openNew}>
              <Plus size={14} /> 追加
            </Button>
          }
        />

        {sorted.length === 0 ? (
          <EmptyState
            icon="👤"
            title="顧客がありません"
            description={'案件作成時にも「＋新規顧客」から\n追加できます'}
            action={
              <Button variant="primary" size="md" onClick={openNew}>
                <Plus size={14} /> 顧客を追加
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {sorted.map(c => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{c.name}</p>
                    {c.tel && <p className="text-xs text-ink-muted mt-0.5">📞 {c.tel}</p>}
                    {c.address && <p className="text-xs text-ink-muted mt-0.5">{c.address}</p>}
                    {c.email && <p className="text-xs text-ink-muted mt-0.5">{c.email}</p>}
                    {c.notes && <p className="text-xs text-ink-muted mt-0.5">📝 {c.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 text-ink-muted hover:text-accent transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="p-1.5 text-ink-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? '顧客を編集' : '顧客を追加'}>
        <FormGroup label="顧客名" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="例: 〇〇株式会社" />
        </FormGroup>
        <FormGroup label="電話番号">
          <Input value={tel} onChange={e => setTel(e.target.value)} placeholder="03-xxxx-xxxx" />
        </FormGroup>
        <FormGroup label="住所">
          <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="東京都渋谷区…" />
        </FormGroup>
        <FormGroup label="メールアドレス">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="info@example.com" />
        </FormGroup>
        <FormGroup label="Google マップ URL">
          <Input value={googleMapUrl} onChange={e => setGoogleMapUrl(e.target.value)} placeholder="任意" />
        </FormGroup>
        <FormGroup label="備考">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="予備の電話番号など" rows={2} />
        </FormGroup>
        <div className="flex gap-2.5 mt-2">
          <Button variant="ghost" size="lg" onClick={() => setOpen(false)} className="flex-1">キャンセル</Button>
          <Button variant="primary" size="lg" onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        confirming={deleting}
        message={
          <>
            「{deleteTarget?.name}」を削除します。<br />
            この操作は元に戻せません。案件で使用中の場合は削除できません。
          </>
        }
      />

      <ToastProvider />
      <BottomTab />
    </>
  )
}
