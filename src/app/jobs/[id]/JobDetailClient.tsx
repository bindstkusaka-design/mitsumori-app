'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, FileEdit, Pencil, ChevronUp, ChevronDown, Check, X } from 'lucide-react'
import { useStore, docDetailPath } from '@/lib/store'
import { fmtDate, fmtMoney, calcTotals } from '@/lib/utils'
import type { DocumentType } from '@/types'
import {
  Button, Modal, FormGroup, Input,
  ToastProvider, showToast,
} from '@/components/ui'
import TopNav from '@/components/layout/TopNav'
import BackButton from '@/components/layout/BackButton'
import BottomTab from '@/components/layout/BottomTab'
import type { JobItem } from '@/types'

interface Props { jobId: string }

const STAMP_CONFIG: { type: DocumentType; label: string; color: string }[] = [
  { type: 'quote',   label: '見', color: '#1a6bb5' },
  { type: 'invoice', label: '請', color: '#c0392b' },
  { type: 'receipt', label: '領', color: '#7b3fa0' },
]

export default function JobDetailClient({ jobId }: Props) {
  const router = useRouter()
  const {
    getJob, getJobItems, addJobItem, updateJobItem, removeJobItem, deleteJob, updateJob,
    getDocumentsByJob, getDocumentItems, deleteDocument, products, markJobPaid,
  } = useStore()

  const job = getJob(jobId)
  const items = getJobItems(jobId)
  const docs = getDocumentsByJob(jobId)

  // ── 追加モーダル state ─────────────────────────────────
  const [addOpen, setAddOpen] = useState(false)
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemQty, setItemQty] = useState('1')
  const [itemUnit, setItemUnit] = useState('式')
  const [itemNote, setItemNote] = useState('')
  const [suggestions, setSuggestions] = useState<typeof products>([])

  // ── 編集モーダル state ─────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editQty, setEditQty] = useState('1')
  const [editUnit, setEditUnit] = useState('式')
  const [editNote, setEditNote] = useState('')

  // ── アクションモーダル state ───────────────────────────
  const [actionOpen, setActionOpen] = useState(false)

  // ── インライン顧客名編集 state ─────────────────────────
  const [editingClient, setEditingClient] = useState(false)
  const [clientDraft, setClientDraft] = useState('')
  const clientInputRef = useRef<HTMLInputElement>(null)

  // ── 値引き state ───────────────────────────────────────
  const [discountDraft, setDiscountDraft] = useState('')
  const [editingDiscount, setEditingDiscount] = useState(false)

  // ── 追加モーダル ───────────────────────────────────────
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
    setItemName(p.name); setItemPrice(String(p.price)); setItemUnit(p.unit || '式'); setSuggestions([])
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

  // ── 編集モーダル ───────────────────────────────────────
  function openEdit(item: JobItem) {
    setEditId(item.id)
    setEditName(item.name)
    setEditPrice(String(item.price))
    setEditQty(String(item.qty))
    setEditUnit(item.unit)
    setEditNote(item.note ?? '')
    setEditOpen(true)
  }

  function handleEditItem() {
    if (!editId) return
    if (!editName.trim()) { showToast('品名を入力してください', 'error'); return }
    updateJobItem(editId, {
      name: editName.trim(),
      price: parseFloat(editPrice) || 0,
      qty: parseFloat(editQty) || 1,
      unit: editUnit || '式',
      note: editNote.trim(),
    })
    setEditOpen(false)
    showToast('更新しました', 'success')
  }

  // ── 並び替え ───────────────────────────────────────────
  function moveItem(id: string, direction: 'up' | 'down') {
    const idx = items.findIndex(i => i.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === items.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const currentOrder = items[idx].sortOrder
    const swapOrder = items[swapIdx].sortOrder
    updateJobItem(items[idx].id, { sortOrder: swapOrder })
    updateJobItem(items[swapIdx].id, { sortOrder: currentOrder })
  }

  function startEditClient() {
    setClientDraft(job?.client ?? '')
    setEditingClient(true)
    setTimeout(() => clientInputRef.current?.focus(), 50)
  }

  function saveClient() {
    updateJob(jobId, { client: clientDraft.trim() })
    setEditingClient(false)
    showToast('顧客名を更新しました', 'success')
  }

  function cancelEditClient() {
    setEditingClient(false)
  }

  function saveDiscount() {
    updateJob(jobId, { discount: parseFloat(discountDraft) || 0 })
    setEditingDiscount(false)
  }

  function handleDeleteJob() {
    if (!confirm('この案件を削除しますか？')) return
    deleteJob(jobId)
    router.push('/')
    showToast('案件を削除しました')
  }

  function handleFinishJob() {
    if (!job) return
    if (job.status === 'archived') {
      showToast('この案件はすでに終了しています', 'default')
      return
    }
    if (!confirm('この案件を終了（入金済み）にしますか？')) return
    markJobPaid(jobId)
    showToast('案件を終了しました', 'success')
    router.push('/')
  }

  function handleMarkPaid() {
    if (!job) return
    if (job.status === 'archived') {
      showToast('この案件はすでに入金済みです', 'default')
      return
    }
    if (!confirm('入金処理をしますか？この案件は終了欄に移動します。')) return
    markJobPaid(jobId)
    showToast('入金処理をしました', 'success')
  }

  if (!job) {
    return (
      <>
        <TopNav left={<BackButton href="/" />} />
        <main className="max-w-xl mx-auto px-4 pt-6 pb-tab text-center text-ink-muted">
          案件が見つかりません
        </main>
        <BottomTab />
      </>
    )
  }

  const { subtotal, tax, total } = calcTotals(items, 0.1)
  const discountAmt = job.discount ?? 0
  const discountedSubtotal = Math.max(0, subtotal - discountAmt)
  const discountedTax = Math.round(discountedSubtotal * 0.1)
  const discountedTotal = discountedSubtotal + discountedTax

  const docByType: Partial<Record<DocumentType, (typeof docs)[0]>> = {}
  for (const doc of docs) {
    const t: DocumentType = doc.docType ?? 'quote'
    if (!docByType[t]) docByType[t] = doc
  }

  return (
    <>
      <TopNav
        left={<BackButton href="/" />}
        title={<span className="text-sm font-semibold">仕事詳細</span>}
      />
      <main className="max-w-xl mx-auto pb-32" style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>

        {/* 案件ヘッダーカード */}
        <div style={{ backgroundColor: '#fff', padding: '16px 16px 12px', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: '#1a6bb5', marginBottom: 2 }}>{job.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 11, color: '#fff', backgroundColor: job.status === 'archived' ? '#2e7d32' : '#1a6bb5' }}>
                  {job.status === 'archived' ? '入金済み' : '作業中'}
                </span>
              </div>
              {editingClient ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <input
                    ref={clientInputRef}
                    value={clientDraft}
                    onChange={e => setClientDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveClient(); if (e.key === 'Escape') cancelEditClient() }}
                    style={{ flex: 1, fontSize: 13, border: '1px solid #1a6bb5', borderRadius: 4, padding: '2px 6px', outline: 'none' }}
                  />
                  <button onClick={saveClient} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2e7d32', padding: 2 }}><Check size={14} /></button>
                  <button onClick={cancelEditClient} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53935', padding: 2 }}><X size={14} /></button>
                </div>
              ) : (
                <p
                  style={{ fontSize: 13, color: '#444', marginBottom: 2, cursor: 'pointer' }}
                  onClick={startEditClient}
                >
                  {job.client || <span style={{ color: '#aaa' }}>顧客名をタップして入力</span>}{job.contactPerson ? `　${job.contactPerson}` : ''}
                </p>
              )}
              <p style={{ fontSize: 12, color: '#888' }}>更新：{fmtDate(job.updatedAt)}</p>
            </div>

            {/* 書類スタンプグリッド */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 40px)', gap: 4, flexShrink: 0, marginLeft: 12 }}>
              {STAMP_CONFIG.map(({ type, label, color }) => {
                const existingDoc = docByType[type]
                return existingDoc ? (
                  <Link key={type} href={docDetailPath(existingDoc)}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 6,
                      border: `2px solid ${color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color,
                      backgroundColor: color + '15',
                    }}>
                      {label}
                    </div>
                  </Link>
                ) : (
                  <div key={type} style={{
                    width: 40, height: 40, borderRadius: 6,
                    border: '1.5px solid #ccc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#ccc',
                    backgroundColor: '#f9f9f9',
                  }}>
                    {label}
                  </div>
                )
              })}
              <div style={{
                width: 40, height: 40, borderRadius: 6,
                border: '1.5px solid #ccc',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#ccc',
                backgroundColor: '#f9f9f9',
              }}>
                納
              </div>
            </div>
          </div>
        </div>

        {/* 合計バー */}
        <div style={{
          backgroundColor: '#2bb8c8',
          padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>合計（税込）</span>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
            {discountedTotal.toLocaleString('ja-JP')}円
          </span>
        </div>

        {/* 明細リスト */}
        <div style={{ backgroundColor: '#fff', marginBottom: 8 }}>
          {items.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#999', fontSize: 14 }}>
              明細がありません
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  padding: '10px 12px 10px 8px',
                  borderBottom: '1px solid #eee',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {/* 並び替えボタン */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button
                    onClick={() => moveItem(item.id, 'up')}
                    disabled={idx === 0}
                    style={{
                      padding: '2px 4px', background: 'none', border: 'none',
                      cursor: idx === 0 ? 'default' : 'pointer',
                      color: idx === 0 ? '#ddd' : '#aaa', lineHeight: 1,
                    }}
                    aria-label="上へ移動"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveItem(item.id, 'down')}
                    disabled={idx === items.length - 1}
                    style={{
                      padding: '2px 4px', background: 'none', border: 'none',
                      cursor: idx === items.length - 1 ? 'default' : 'pointer',
                      color: idx === items.length - 1 ? '#ddd' : '#aaa', lineHeight: 1,
                    }}
                    aria-label="下へ移動"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* 項目情報（タップで編集） */}
                <div
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => openEdit(item)}
                >
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 2 }}>{item.name}</p>
                  {item.note && <p style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{item.note}</p>}
                  <p style={{ fontSize: 13, color: '#555' }}>
                    {item.price.toLocaleString('ja-JP')}円 × {item.qty}{item.unit}
                  </p>
                </div>

                {/* 金額・操作ボタン */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111', minWidth: 60, textAlign: 'right' }}>
                    {(item.price * item.qty).toLocaleString('ja-JP')}円
                  </p>
                  <button
                    onClick={() => openEdit(item)}
                    style={{
                      padding: 6, background: 'none', border: 'none', cursor: 'pointer',
                      color: '#1a6bb5',
                    }}
                    aria-label="編集"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => { removeJobItem(item.id); showToast('削除しました') }}
                    style={{
                      padding: 6, background: 'none', border: 'none', cursor: 'pointer',
                      color: '#e57373',
                    }}
                    aria-label="削除"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 明細追加ボタン */}
        <div style={{ padding: '0 16px 8px' }}>
          <button
            onClick={openAdd}
            style={{
              width: '100%', padding: '12px', borderRadius: 8,
              border: '2px dashed #2bb8c8', backgroundColor: 'transparent',
              color: '#2bb8c8', fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} /> 明細を追加
          </button>
        </div>

        {/* 値引き入力 */}
        <div style={{ padding: '0 16px 16px' }}>
          {editingDiscount ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px' }}>
              <span style={{ fontSize: 13, color: '#555', flexShrink: 0 }}>値引き</span>
              <input
                type="number"
                value={discountDraft}
                onChange={e => setDiscountDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveDiscount(); if (e.key === 'Escape') setEditingDiscount(false) }}
                style={{ flex: 1, fontSize: 13, border: '1px solid #1a6bb5', borderRadius: 4, padding: '2px 6px', textAlign: 'right', outline: 'none' }}
                placeholder="0"
              />
              <span style={{ fontSize: 13, color: '#555' }}>円</span>
              <button onClick={saveDiscount} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2e7d32' }}><Check size={14} /></button>
              <button onClick={() => setEditingDiscount(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53935' }}><X size={14} /></button>
            </div>
          ) : (
            <button
              onClick={() => { setDiscountDraft(String(job.discount ?? 0)); setEditingDiscount(true) }}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid #eee', backgroundColor: '#fff',
                color: (job.discount ?? 0) > 0 ? '#e53935' : '#aaa', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <span>値引き</span>
              <span style={{ fontWeight: (job.discount ?? 0) > 0 ? 600 : 400 }}>
                {(job.discount ?? 0) > 0 ? `-${(job.discount ?? 0).toLocaleString('ja-JP')}円` : '設定なし'}
              </span>
            </button>
          )}
        </div>

        {/* 書類一覧 */}
        {docs.length > 0 && (
          <div style={{ backgroundColor: '#fff', marginBottom: 8 }}>
            <div style={{ padding: '10px 16px 6px', borderBottom: '1px solid #eee' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>作成済み書類</p>
            </div>
            {[...docs].reverse().map(doc => {
              const { total: docTotal } = calcTotals(getDocumentItems(doc.id), doc.taxRate)
              const t: DocumentType = doc.docType ?? 'quote'
              const typeLabel: Record<DocumentType, string> = { quote: '見積書', invoice: '請求書', receipt: '領収書' }
              const typeColor: Record<DocumentType, string> = { quote: '#1a6bb5', invoice: '#c0392b', receipt: '#7b3fa0' }
              return (
                <div key={doc.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 16px', borderBottom: '1px solid #eee', backgroundColor: '#fff',
                }}>
                  <Link href={docDetailPath(doc)} className="flex-1">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        padding: '2px 7px', borderRadius: 4,
                        backgroundColor: typeColor[t] + '18',
                        color: typeColor[t], border: `1px solid ${typeColor[t]}40`,
                      }}>
                        {typeLabel[t]}
                      </span>
                      <span style={{ fontSize: 13, color: '#333' }}>No. {doc.quoteNumber || '-'}</span>
                    </div>
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
                      {docTotal.toLocaleString('ja-JP')}円
                    </span>
                    <span style={{
                      fontSize: 11, padding: '2px 6px', borderRadius: 4,
                      backgroundColor: doc.status === 'finalized' ? '#e8f5e9' : '#fff8e1',
                      color: doc.status === 'finalized' ? '#2e7d32' : '#f57f17',
                    }}>
                      {doc.status === 'finalized' ? '確定済' : '下書き'}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        if (!confirm('この書類を削除しますか？')) return
                        deleteDocument(doc.id)
                        showToast('書類を削除しました', 'success')
                      }}
                      style={{
                        background: 'none', border: 'none', color: '#e53935', cursor: 'pointer', padding: 4,
                      }}
                      aria-label="書類を削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 案件削除 */}
        <div style={{ padding: '8px 16px 16px' }}>
          <button
            onClick={handleDeleteJob}
            style={{
              width: '100%', padding: '10px', borderRadius: 8,
              border: '1px solid #ffcdd2', backgroundColor: '#fff8f8',
              color: '#e53935', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} /> この案件を削除
          </button>
        </div>
      </main>

      {/* 下部合計バー + アクションタブ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        maxWidth: 576, margin: '0 auto',
      }}>
        <div style={{ backgroundColor: '#1a9baa', padding: '10px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: '#fff', fontSize: 13 }}>合計（税込）</span>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{discountedTotal.toLocaleString('ja-JP')}円</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>小計</span>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>{subtotal.toLocaleString('ja-JP')}円</span>
          </div>
          {discountAmt > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>値引き</span>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>-{discountAmt.toLocaleString('ja-JP')}円</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>消費税（10%）</span>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>{discountedTax.toLocaleString('ja-JP')}円</span>
          </div>
        </div>
        <div style={{
          backgroundColor: '#1a4a80',
          display: 'flex', justifyContent: 'space-around',
          padding: '10px 0 14px',
        }}>
          <button
            onClick={handleFinishJob}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 22 }}>✓</span>
            <span style={{ color: '#fff', fontSize: 11 }}>終了</span>
          </button>
          <button
            onClick={() => {}}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 20 }}>👁</span>
            <span style={{ color: '#fff', fontSize: 11 }}>プレビュー</span>
          </button>
          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={job.status === 'archived'}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: job.status === 'archived' ? 'not-allowed' : 'pointer',
              opacity: job.status === 'archived' ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: 20 }}>{job.status === 'archived' ? '✅' : '💰'}</span>
            <span style={{ color: '#fff', fontSize: 11 }}>{job.status === 'archived' ? '入金済み' : '入金'}</span>
          </button>
          <Link href={`/jobs/${jobId}/documents/new`}>
            <button
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <FileEdit size={22} color="#fff" />
              <span style={{ color: '#fff', fontSize: 11 }}>作成/編集</span>
            </button>
          </Link>
        </div>
      </div>

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
            <Input type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value)} placeholder="0" className="text-right" />
          </FormGroup>
          <FormGroup label="数量">
            <Input type="number" value={itemQty} onChange={e => setItemQty(e.target.value)} placeholder="1" className="text-right" />
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

      {/* 明細編集モーダル */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="明細を編集">
        <FormGroup label="品名" required>
          <Input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="品名を入力"
          />
        </FormGroup>
        <div className="grid grid-cols-2 gap-2.5">
          <FormGroup label="単価">
            <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="0" className="text-right" />
          </FormGroup>
          <FormGroup label="数量">
            <Input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} placeholder="1" className="text-right" />
          </FormGroup>
        </div>
        <FormGroup label="単位">
          <Input value={editUnit} onChange={e => setEditUnit(e.target.value)} placeholder="式" />
        </FormGroup>
        <FormGroup label="備考">
          <Input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="任意" />
        </FormGroup>
        <div className="flex gap-2.5 mt-2">
          <Button variant="ghost" size="lg" onClick={() => setEditOpen(false)} className="flex-1">キャンセル</Button>
          <Button variant="primary" size="lg" onClick={handleEditItem} className="flex-1">保存</Button>
        </div>
      </Modal>

      <ToastProvider />
    </>
  )
}
