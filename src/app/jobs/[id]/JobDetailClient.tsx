'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, FileEdit, Pencil, ChevronUp, ChevronDown, Check, X, Copy, ExternalLink } from 'lucide-react'
import { useStore, docDetailPath } from '@/lib/store'
import { fmtDate, fmtMoney, calcTotals } from '@/lib/utils'
import type { DocumentType, DealStatus } from '@/types'
import {
  Button, Modal, ConfirmModal, FormGroup, Input, Select, Textarea,
  ToastProvider, showToast,
} from '@/components/ui'
import TopNav from '@/components/layout/TopNav'
import BackButton from '@/components/layout/BackButton'
import BottomTab from '@/components/layout/BottomTab'
import CustomerPicker from '@/components/CustomerPicker'
import OutsourcerPicker from '@/components/OutsourcerPicker'
import type { JobItem } from '@/types'

const DEAL_STATUS_COLOR: Record<DealStatus, string> = {
  '商談中': '#f57f17',
  '受注済み': '#1a6bb5',
  '完了': '#2e7d32',
}

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
    getDocumentsByJob, getDocumentItems, deleteDocument, products, markJobPaid, getCustomer, getOutsourcer,
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

  // ── インライン顧客選択 state ─────────────────────────
  const [editingClient, setEditingClient] = useState(false)

  // ── 値引き state ───────────────────────────────────────
  const [discountDraft, setDiscountDraft] = useState('')
  const [editingDiscount, setEditingDiscount] = useState(false)

  // ── 詳細情報編集 state ─────────────────────────────────
  const [detailEditOpen, setDetailEditOpen] = useState(false)
  const [detailSaving, setDetailSaving] = useState(false)
  const [dealStatusDraft, setDealStatusDraft] = useState('')
  const [completionDateDraft, setCompletionDateDraft] = useState('')
  const [workAddressDraft, setWorkAddressDraft] = useState('')
  const [workAreaDraft, setWorkAreaDraft] = useState('')
  const [workGoogleMapUrlDraft, setWorkGoogleMapUrlDraft] = useState('')
  const [outsourcerIdDraft, setOutsourcerIdDraft] = useState('')
  const [outsourcerPaymentDraft, setOutsourcerPaymentDraft] = useState('')

  // ── 外注先LINE共有 state ───────────────────────────────
  const [lineShareOpen, setLineShareOpen] = useState(false)
  const [lineMessage, setLineMessage] = useState('')

  // ── 削除確認 state ─────────────────────────────────────
  const [deleteJobOpen, setDeleteJobOpen] = useState(false)
  const [deletingJob, setDeletingJob] = useState(false)

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

  async function handleAddItem() {
    if (!itemName.trim()) { showToast('品名を入力してください', 'error'); return }
    try {
      await addJobItem(jobId, {
        name: itemName.trim(),
        price: parseFloat(itemPrice) || 0,
        qty: parseFloat(itemQty) || 1,
        unit: itemUnit || '式',
        note: itemNote.trim(),
      })
      setAddOpen(false)
      showToast('明細を追加しました', 'success')
    } catch {
      showToast('追加に失敗しました', 'error')
    }
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

  async function handleEditItem() {
    if (!editId) return
    if (!editName.trim()) { showToast('品名を入力してください', 'error'); return }
    try {
      await updateJobItem(editId, {
        name: editName.trim(),
        price: parseFloat(editPrice) || 0,
        qty: parseFloat(editQty) || 1,
        unit: editUnit || '式',
        note: editNote.trim(),
      })
      setEditOpen(false)
      showToast('更新しました', 'success')
    } catch {
      showToast('更新に失敗しました', 'error')
    }
  }

  // ── 並び替え ───────────────────────────────────────────
  async function moveItem(id: string, direction: 'up' | 'down') {
    const idx = items.findIndex(i => i.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === items.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const currentOrder = items[idx].sortOrder
    const swapOrder = items[swapIdx].sortOrder
    await Promise.all([
      updateJobItem(items[idx].id, { sortOrder: swapOrder }),
      updateJobItem(items[swapIdx].id, { sortOrder: currentOrder }),
    ])
  }

  async function handleChangeCustomer(customerId: string) {
    try {
      await updateJob(jobId, { customerId })
      setEditingClient(false)
      showToast('顧客を更新しました', 'success')
    } catch {
      showToast('更新に失敗しました', 'error')
    }
  }

  async function saveDiscount() {
    try {
      await updateJob(jobId, { discount: parseFloat(discountDraft) || 0 })
    } catch {
      showToast('更新に失敗しました', 'error')
    }
    setEditingDiscount(false)
  }

  function openDetailEdit() {
    if (!job) return
    setDealStatusDraft(job.dealStatus ?? '')
    setCompletionDateDraft(job.completionDate ?? '')
    setWorkAddressDraft(job.workAddress ?? '')
    setWorkAreaDraft(job.workArea ?? '')
    setWorkGoogleMapUrlDraft(job.workGoogleMapUrl ?? '')
    setOutsourcerIdDraft(job.outsourcerId ?? '')
    setOutsourcerPaymentDraft(job.outsourcerPayment !== undefined ? String(job.outsourcerPayment) : '')
    setDetailEditOpen(true)
  }

  async function saveDetailEdit() {
    setDetailSaving(true)
    try {
      await updateJob(jobId, {
        dealStatus: (dealStatusDraft || null) as DealStatus | null,
        completionDate: completionDateDraft || null,
        workAddress: workAddressDraft.trim(),
        workArea: workAreaDraft.trim(),
        workGoogleMapUrl: workGoogleMapUrlDraft.trim(),
        outsourcerId: outsourcerIdDraft || null,
        outsourcerPayment: outsourcerPaymentDraft ? parseFloat(outsourcerPaymentDraft) : null,
      })
      setDetailEditOpen(false)
      showToast('詳細情報を更新しました', 'success')
    } catch {
      showToast('更新に失敗しました', 'error')
    } finally {
      setDetailSaving(false)
    }
  }

  function buildLineMessage(): string {
    if (!job) return ''
    const customer = getCustomer(job.customerId)
    const address = job.workAddress || customer?.address || ''
    const parts: string[] = [`【${job.name}】`]
    if (address) parts.push(`作業場所: ${address}`)
    if (job.workGoogleMapUrl) parts.push(job.workGoogleMapUrl)
    if (job.workArea) parts.push(`広さ: ${job.workArea}`)
    if (items.length > 0) {
      parts.push('')
      parts.push('作業内容:')
      for (const item of items) parts.push(`・${item.name}`)
    }
    return parts.join('\n')
  }

  function openLineShare() {
    setLineMessage(buildLineMessage())
    setLineShareOpen(true)
  }

  async function handleCopyLineMessage() {
    try {
      await navigator.clipboard.writeText(lineMessage)
      showToast('コピーしました', 'success')
    } catch {
      showToast('コピーに失敗しました', 'error')
    }
  }

  async function handleSendLine() {
    if (navigator.share) {
      try {
        await navigator.share({ text: lineMessage })
        return
      } catch (e: any) {
        if (e?.name === 'AbortError') return
      }
    }
    const lineUrl = `https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(lineMessage)}`
    window.open(lineUrl, '_blank')
  }

  async function confirmDeleteJob() {
    setDeletingJob(true)
    try {
      await deleteJob(jobId)
      showToast('案件を削除しました')
      router.push('/')
    } catch {
      showToast('削除に失敗しました', 'error')
      setDeletingJob(false)
    }
  }

  async function handleFinishJob() {
    if (!job) return
    if (job.status === 'archived') {
      showToast('この案件はすでに終了しています', 'default')
      return
    }
    if (!confirm('この案件を終了（入金済み）にしますか？')) return
    try {
      await markJobPaid(jobId)
      showToast('案件を終了しました', 'success')
      router.push('/')
    } catch {
      showToast('更新に失敗しました', 'error')
    }
  }

  async function handleMarkPaid() {
    if (!job) return
    if (job.status === 'archived') {
      showToast('この案件はすでに入金済みです', 'default')
      return
    }
    if (!confirm('入金処理をしますか？この案件は終了欄に移動します。')) return
    try {
      await markJobPaid(jobId)
      showToast('入金処理をしました', 'success')
    } catch {
      showToast('更新に失敗しました', 'error')
    }
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
                  <div style={{ flex: 1 }}>
                    <CustomerPicker value={job.customerId} onChange={handleChangeCustomer} />
                  </div>
                  <button onClick={() => setEditingClient(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53935', padding: 2 }}><X size={14} /></button>
                </div>
              ) : (
                <p
                  style={{ fontSize: 13, color: '#444', marginBottom: 2, cursor: 'pointer' }}
                  onClick={() => setEditingClient(true)}
                >
                  {getCustomer(job.customerId)?.name || <span style={{ color: '#aaa' }}>顧客名をタップして選択</span>}{job.contactPerson ? `　${job.contactPerson}` : ''}
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
                    onClick={async () => {
                      try {
                        await removeJobItem(item.id)
                        showToast('削除しました')
                      } catch {
                        showToast('削除に失敗しました', 'error')
                      }
                    }}
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

        {/* 詳細情報 */}
        <div style={{ backgroundColor: '#fff', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px 6px', borderBottom: '1px solid #eee' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>詳細情報</p>
            <button
              onClick={openDetailEdit}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a6bb5', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
            >
              <Pencil size={13} /> 編集
            </button>
          </div>
          <div style={{ padding: '4px 16px 10px' }}>
            {[
              {
                label: '状態',
                value: job.dealStatus ? (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    color: '#fff', backgroundColor: DEAL_STATUS_COLOR[job.dealStatus],
                  }}>
                    {job.dealStatus}
                  </span>
                ) : '未設定',
              },
              { label: '依頼日', value: fmtDate(job.requestDate) || '-' },
              { label: '作業完了日', value: job.completionDate ? fmtDate(job.completionDate) : '未設定' },
              { label: '作業箇所住所', value: job.workAddress || '（顧客住所を使用）' },
              { label: '作業場所の広さ', value: job.workArea || '-' },
              {
                label: 'Googleマップ',
                value: job.workGoogleMapUrl ? (
                  <a
                    href={job.workGoogleMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1a6bb5', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                  >
                    地図を開く <ExternalLink size={11} />
                  </a>
                ) : '-',
              },
              { label: '外注先', value: job.outsourcerId ? (getOutsourcer(job.outsourcerId)?.name ?? '-') : '未設定' },
              { label: '外注先への支払い', value: job.outsourcerPayment ? fmtMoney(job.outsourcerPayment) : '-' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                <span style={{ width: 108, flexShrink: 0, color: '#888', fontSize: 12 }}>{row.label}</span>
                <span style={{ color: '#333' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 外注先へ共有 */}
        {job.outsourcerId && (
          <div style={{ backgroundColor: '#fff', marginBottom: 8, padding: '12px 16px' }}>
            <button
              onClick={openLineShare}
              style={{
                width: '100%', padding: '10px', borderRadius: 8,
                border: '1.5px solid #06c755', backgroundColor: '#eefaf2',
                color: '#06a544', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
              }}
            >
              💬 外注先へLINEで共有
            </button>
          </div>
        )}

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
                      <span style={{ fontSize: 13, color: '#333' }}>No. {doc.docNumber || '-'}</span>
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
                      onClick={async (event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        if (!confirm('この書類を削除しますか？')) return
                        try {
                          await deleteDocument(doc.id)
                          showToast('書類を削除しました', 'success')
                        } catch {
                          showToast('削除に失敗しました', 'error')
                        }
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
            onClick={() => setDeleteJobOpen(true)}
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

      {/* 詳細情報編集モーダル */}
      <Modal open={detailEditOpen} onClose={() => setDetailEditOpen(false)} title="詳細情報を編集">
        <FormGroup label="状態">
          <Select value={dealStatusDraft} onChange={e => setDealStatusDraft(e.target.value)}>
            <option value="">未設定</option>
            <option value="商談中">商談中</option>
            <option value="受注済み">受注済み</option>
            <option value="完了">完了</option>
          </Select>
        </FormGroup>
        <FormGroup label="作業完了日">
          <Input type="date" value={completionDateDraft} onChange={e => setCompletionDateDraft(e.target.value)} />
        </FormGroup>
        <FormGroup label="作業箇所住所">
          <Input
            value={workAddressDraft}
            onChange={e => setWorkAddressDraft(e.target.value)}
            placeholder="顧客住所と異なる場合のみ入力"
          />
        </FormGroup>
        <FormGroup label="作業場所の広さ">
          <Input value={workAreaDraft} onChange={e => setWorkAreaDraft(e.target.value)} placeholder="例: 30㎡" />
        </FormGroup>
        <FormGroup label="Googleマップリンク（作業箇所）">
          <Input value={workGoogleMapUrlDraft} onChange={e => setWorkGoogleMapUrlDraft(e.target.value)} placeholder="https://maps.google.com/..." />
        </FormGroup>
        <FormGroup label="外注先">
          <OutsourcerPicker value={outsourcerIdDraft} onChange={setOutsourcerIdDraft} />
        </FormGroup>
        <FormGroup label="外注先への支払い金額">
          <Input
            type="number" value={outsourcerPaymentDraft}
            onChange={e => setOutsourcerPaymentDraft(e.target.value)}
            placeholder="0" className="text-right"
          />
        </FormGroup>
        <div className="flex gap-2.5 mt-2">
          <Button variant="ghost" size="lg" onClick={() => setDetailEditOpen(false)} className="flex-1">キャンセル</Button>
          <Button variant="primary" size="lg" onClick={saveDetailEdit} disabled={detailSaving} className="flex-1">
            {detailSaving ? '保存中…' : '保存'}
          </Button>
        </div>
      </Modal>

      {/* 外注先へのLINE共有モーダル */}
      <Modal open={lineShareOpen} onClose={() => setLineShareOpen(false)} title="外注先へ共有">
        <FormGroup label="送信メッセージ（編集できます）">
          <Textarea value={lineMessage} onChange={e => setLineMessage(e.target.value)} rows={9} />
        </FormGroup>
        <div className="flex gap-2.5 mt-2">
          <Button variant="ghost" size="lg" onClick={handleCopyLineMessage} className="flex-1">
            <Copy size={14} /> コピー
          </Button>
          <Button variant="primary" size="lg" onClick={handleSendLine} className="flex-1" style={{ backgroundColor: '#06c755' }}>
            💬 LINEで送る
          </Button>
        </div>
      </Modal>

      {/* 案件削除の確認モーダル */}
      <ConfirmModal
        open={deleteJobOpen}
        onClose={() => setDeleteJobOpen(false)}
        onConfirm={confirmDeleteJob}
        confirming={deletingJob}
        message={
          <>
            「{job.name}」を削除します。<br />
            明細{items.length}件・書類{docs.length}件も同時に削除されます。<br />
            この操作は元に戻せません。
          </>
        }
      />

      <ToastProvider />
    </>
  )
}
