'use client'

import React, { useState } from 'react'
import { useStore } from '@/lib/store'
import { Select, Modal, FormGroup, Input, Button, showToast } from '@/components/ui'

const NEW_OUTSOURCER_VALUE = '__new__'

interface OutsourcerPickerProps {
  value: string
  onChange: (outsourcerId: string) => void
}

export default function OutsourcerPicker({ value, onChange }: OutsourcerPickerProps) {
  const { outsourcers, createOutsourcer } = useStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const sorted = [...outsourcers].sort((a, b) => a.name.localeCompare(b.name, 'ja'))

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === NEW_OUTSOURCER_VALUE) {
      setName('')
      setOpen(true)
      return
    }
    onChange(e.target.value)
  }

  async function handleCreate() {
    if (!name.trim()) { showToast('外注先名を入力してください', 'error'); return }
    setSaving(true)
    try {
      const outsourcer = await createOutsourcer({ name: name.trim() })
      onChange(outsourcer.id)
      setOpen(false)
      showToast('外注先を追加しました', 'success')
    } catch {
      showToast('外注先の追加に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Select value={value} onChange={handleSelectChange}>
        <option value="">選択してください</option>
        {sorted.map(o => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
        <option value={NEW_OUTSOURCER_VALUE}>＋ 新規外注先を追加</option>
      </Select>

      <Modal open={open} onClose={() => setOpen(false)} title="新規外注先を追加">
        <FormGroup label="外注先名" required>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例: 〇〇工業"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
        </FormGroup>
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
