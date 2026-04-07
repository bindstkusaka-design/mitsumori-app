'use client'

import React, { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { fmtMoney } from '@/lib/utils'
import {
  Button, Card, Modal, FormGroup, Input, Textarea,
  SectionHeader, EmptyState, ToastProvider, showToast,
} from '@/components/ui'
import TopNav from '@/components/layout/TopNav'
import BottomTab from '@/components/layout/BottomTab'
import type { Product } from '@/types'

export default function ProductsClient() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('式')
  const [note, setNote] = useState('')

  function openNew() {
    setEditing(null); setName(''); setPrice(''); setUnit('式'); setNote('')
    setOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p); setName(p.name); setPrice(String(p.price)); setUnit(p.unit || '式'); setNote(p.note || '')
    setOpen(true)
  }

  function handleSave() {
    if (!name.trim()) { showToast('商品名を入力してください', 'error'); return }
    if (editing) {
      updateProduct(editing.id, { name: name.trim(), price: parseFloat(price) || 0, unit: unit || '式', note: note.trim() })
      showToast('更新しました', 'success')
    } else {
      addProduct({ name: name.trim(), price: parseFloat(price) || 0, unit: unit || '式', note: note.trim() })
      showToast('商品を追加しました', 'success')
    }
    setOpen(false)
  }

  function handleDelete(id: string) {
    if (!confirm('この商品を削除しますか？')) return
    deleteProduct(id)
    showToast('削除しました')
  }

  const sorted = [...products].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  return (
    <>
      <TopNav />
      <main className="max-w-xl mx-auto px-4 pt-4 pb-tab">
        <SectionHeader
          title="商品マスタ"
          sub="見積明細の入力時に呼び出せます"
          action={
            <Button variant="primary" size="sm" onClick={openNew}>
              <Plus size={14} /> 追加
            </Button>
          }
        />

        {sorted.length === 0 ? (
          <EmptyState
            icon="🗂️"
            title="商品がありません"
            description={'よく使う品目を登録しておくと\n見積明細の入力が素早くなります'}
            action={
              <Button variant="primary" size="md" onClick={openNew}>
                <Plus size={14} /> 商品を追加
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {sorted.map(p => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{p.name}</p>
                    {p.note && <p className="text-xs text-ink-muted mt-0.5">{p.note}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-accent">{fmtMoney(p.price)}</p>
                      <p className="text-xs text-ink-muted">/ {p.unit || '式'}</p>
                    </div>
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 text-ink-muted hover:text-accent transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? '商品を編集' : '商品を追加'}>
        <FormGroup label="商品名" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="例: Webサイト制作（LP）" />
        </FormGroup>
        <div className="grid grid-cols-2 gap-2.5">
          <FormGroup label="標準単価">
            <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className="text-right" />
          </FormGroup>
          <FormGroup label="単位">
            <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="式" />
          </FormGroup>
        </div>
        <FormGroup label="備考">
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="任意" />
        </FormGroup>
        <div className="flex gap-2.5 mt-2">
          <Button variant="ghost" size="lg" onClick={() => setOpen(false)} className="flex-1">キャンセル</Button>
          <Button variant="primary" size="lg" onClick={handleSave} className="flex-1">保存</Button>
        </div>
      </Modal>

      <ToastProvider />
      <BottomTab />
    </>
  )
}
