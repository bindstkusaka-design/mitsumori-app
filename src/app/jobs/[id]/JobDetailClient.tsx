'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { fmtDate, fmtMoney, calcTotals } from '@/lib/utils'
import {
  Button, Badge, Card, Modal, FormGroup, Input, Select,
  SectionHeader, EmptyState, AmountSummary, ToastProvider, showToast, Divider,
} from '@/components/ui'
import TopNav from '@/components/layout/TopNav'
import BackButton from '@/components/layout/BackButton'
import BottomTab from '@/components/layout/BottomTab'
import type { JobItem } from '@/types'

interface Props { jobId: string }

export default function JobDetailClient({ jobId }: Props) {
  const router = useRouter()
  const {
    getJob, getJobItems, addJobItem, removeJobItem, deleteJob,
    getDocumentsByJob, getDocumentItems, products,
  } = useStore()

  const job = getJob(jobId)
  const items = getJobItems(jobId)
  const docs = getDocumentsByJob(jobId)

  // ── Add item modal ──
  const [addOpen, setAddOpen] = useState(false)
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemQty, setItemQty] = useState('1')
  const [itemUnit, setItemUnit] = useState('式')
  const [itemNote, setItemNote] = useState('')
  const [suggestions, setSuggestions] = useState<typeof products>([])

  function openAdd() {
    setItemName(''); setItemPrice(''); setItemQty('1'); setItemUnit('式'); setItemNote('')
    setSuggestions([])
    setAddOpen(true)
  }

  function onNameChange(v: string) {
    setItemName(v)
    setSuggestions(v ? products.filter(p => p.name.includes(v)).slice(0, 5) : [])
  }

  function applySuggestion(p: typeof products[number]) {
    setItemName(p.name)
    setItemPrice(String(p.price))
    setItemUnit(p.unit || '式')
    setSuggestions([])
  }

  function handleAddItem() {
    if (!itemName.trim()) { showToast('品名を入力してください', 'error'); return }
    addJobItem(jobId, {
      name: itemName.trim(),
      price: parseFloat(itemPrice) || 0,
      qty: parseFloat(itemQty) || 1,
      unit: itemUnit || '式',
      note: itemNote.trim(),
    })
    setAddOpen(false)
    showToast('明細を追加しました', 'success')
  }

  function handleDeleteJob() {
    if (!confirm('この案件を削除しますか？')) return
    deleteJob(jobId)
    router.push('/')
    showToast('案件を削除しました')
  }

  if (!job) {
    return (
      <>
        <TopNav left={<BackButton href="/" />} title={<span className="text-sm font-semibold">案件が見つかりません</span>} />
        <main className="max-w-xl mx-auto px-4 pt-6 pb-tab">
          <EmptyState icon="🔍" title="案件が見つかりません" description="URLを確認してください" />
        </main>
        <BottomTab />
      </>
    )
  }

  const { subtotal, tax, total } = calcTotals(items, 0.1)

  return (
    <>
      <TopNav
        left={<BackButton href="/" />}
        title={<span className="text-sm font-semibold truncate max-w-[180px]">{job.name}</span>}
      />
      <main className="max-w-xl mx-auto px-4 pt-4 pb-tab">

        {/* 案件ヘッダー */}
        <Card accent className="p-4 mb-5">
          <h1 className="text-lg font-bold text-ink mb-1">{job.name}</h1>
          {job.client && (
            <p className="text-sm text-ink-muted">
              👤 {job.client}{job.contactPerson ? ` / ${job.contactPerson}` : ''}
            </p>
          )}
          <p className="text-xs text-ink-muted mt-1">作成: {fmtDate(job.createdAt)}</p>
        </Card>

        {/* 明細 */}
        <SectionHeader
          title="明細"
          sub={`${items.length}件`}
          action={
            <Button variant="primary" size="sm" onClick={openAdd}>
              <Plus size={14} /> 追加
            </Button>
          }
        />

        {items.length === 0 ? (
          <Card className="p-5 text-center text-ink-muted text-sm mb-5">
            明細がありません。追加してください。
          </Card>
        ) : (
          <Card className="mb-5 overflow-hidden p-0">
            <div className="divide-y divide-border">
              {items.map((item, i) => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-ink leading-snug">{item.name}</p>
                    {item.note && <p className="text-xs text-ink-muted mt-0.5">{item.note}</p>}
                    <p className="text-xs text-ink-muted mt-0.5">
                      {fmtMoney(item.price)} / {item.unit} × {item.qty}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm">{fmtMoney(item.price * item.qty)}</p>
                    <button
                      onClick={() => { removeJobItem(item.id); showToast('削除しました') }}
                      className="mt-1 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 pb-3">
              <AmountSummary subtotal={subtotal} tax={tax} total={total} taxRate={0.1} />
            </div>
          </Card>
        )}

        {/* 見積書 */}
        <SectionHeader
          title="見積書"
          sub={`${docs.length}件`}
          action={
            <Link href={`/jobs/${jobId}/quotes/new`}>
              <Button variant="primary" size="sm">
                <Plus size={14} /> 作成
              </Button>
            </Link>
          }
        />

        {docs.length === 0 ? (
          <Card className="p-5 text-center text-ink-muted text-sm mb-5">
            見積書がありません。
          </Card>
        ) : (
          <div className="space-y-3 mb-5">
            {[...docs].reverse().map(doc => {
              const { total: docTotal } = calcTotals(
                getDocumentItems(doc.id),
                doc.taxRate,
              )
              return (
                <Link key={doc.id} href={`/quotes/${doc.id}`}>
                  <Card clickable className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <span className="font-semibold text-sm">No. {doc.quoteNumber || '-'}</span>
                        {doc.pdfPath && (
                          <Badge variant="pdf" className="ml-2">📄 PDF</Badge>
                        )}
                      </div>
                      <Badge variant={doc.status === 'finalized' ? 'final' : 'draft'}>
                        {doc.status === 'finalized' ? '確定済' : '下書き'}
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-muted mb-1.5">{doc.subject || '件名未設定'}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-ink-muted">{fmtDate(doc.createdAt)}</span>
                      <span className="font-bold text-accent">{fmtMoney(docTotal)}</span>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        <Divider />
        <Button variant="danger" size="sm" onClick={handleDeleteJob}>
          <Trash2 size={14} /> この案件を削除
        </Button>
      </main>

      {/* 明細追加モーダル */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="明細を追加">
        <FormGroup label="品名" required>
          <Input
            value={itemName}
            onChange={e => onNameChange(e.target.value)}
            placeholder="品名を入力またはマスタから選択"
          />
          {suggestions.length > 0 && (
            <div className="mt-1 border border-border rounded-btn overflow-hidden shadow-card">
              {suggestions.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applySuggestion(p)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent-light transition-colors border-b border-border last:border-b-0"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-ink-muted ml-2">{fmtMoney(p.price)} / {p.unit}</span>
                </button>
              ))}
            </div>
          )}
        </FormGroup>
        <div className="grid grid-cols-2 gap-2.5">
          <FormGroup label="単価">
            <Input
              type="number" value={itemPrice}
              onChange={e => setItemPrice(e.target.value)}
              placeholder="0" className="text-right"
            />
          </FormGroup>
          <FormGroup label="数量">
            <Input
              type="number" value={itemQty}
              onChange={e => setItemQty(e.target.value)}
              placeholder="1" className="text-right"
            />
          </FormGroup>
        </div>
        <FormGroup label="単位">
          <Input value={itemUnit} onChange={e => setItemUnit(e.target.value)} placeholder="式" />
        </FormGroup>
        <FormGroup label="備考">
          <Input value={itemNote} onChange={e => setItemNote(e.target.value)} placeholder="任意" />
        </FormGroup>
        <div className="flex gap-2.5 mt-2">
          <Button variant="ghost" size="lg" onClick={() => setAddOpen(false)} className="flex-1">キャンセル</Button>
          <Button variant="primary" size="lg" onClick={handleAddItem} className="flex-1">追加</Button>
        </div>
      </Modal>

      <ToastProvider />
      <BottomTab />
    </>
  )
}
