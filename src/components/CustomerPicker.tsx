'use client'

import React, { useState } from 'react'
import { useStore } from '@/lib/store'
import { Select, Modal, FormGroup, Input, Button, showToast } from '@/components/ui'

const NEW_CUSTOMER_VALUE = '__new__'

interface CustomerPickerProps {
  value: string
  onChange: (customerId: string) => void
}

export default function CustomerPicker({ value, onChange }: CustomerPickerProps) {
  const { customers, createCustomer } = useStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const sortKey = (c: typeof customers[number]) => c.kana.trim() || c.name
  const sorted = [...customers].sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'ja'))

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === NEW_CUSTOMER_VALUE) {
      setName('')
      setOpen(true)
      return
    }
    onChange(e.target.value)
  }

  async function handleCreate() {
    if (!name.trim()) { showToast('顧客名を入力してください', 'error'); return }
    setSaving(true)
    try {
      const customer = await createCustomer({ name: name.trim(), kana: '', tel: '', address: '', email: '', googleMapUrl: '', notes: '' })
      onChange(customer.id)
      setOpen(false)
      showToast('顧客を追加しました', 'success')
    } catch {
      showToast('顧客の追加に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Select value={value} onChange={handleSelectChange}>
        <option value="">選択してください</option>
        <option value={NEW_CUSTOMER_VALUE}>＋ 新規顧客を追加</option>
        {sorted.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>

      <Modal open={open} onClose={() => setOpen(false)} title="新規顧客を追加">
        <FormGroup label="顧客名" required>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例: 〇〇株式会社"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
        </FormGroup>
        <p className="text-xs text-ink-muted mb-3">
          電話番号・住所などの詳細は後から「顧客管理」画面で編集できます。
        </p>
        <div className="flex gap-2.5 mt-2">
          <Button variant="ghost" size="lg" onClick={() => setOpen(false)} className="flex-1">キャンセル</Button>
          <Button variant="primary" size="lg" onClick={handleCreate} disabled={saving} className="flex-1">
            {saving ? '保存中…' : '追加'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
