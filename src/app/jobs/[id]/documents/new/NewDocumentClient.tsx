'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, FileText } from 'lucide-react'
import { useStore, getNextDocNo } from '@/lib/store'
import { expireISO, calcTotals, fmtMoney } from '@/lib/utils'
import {
  Button, Card, FormGroup, Input, Select, Textarea,
  AmountSummary, ToastProvider, showToast, Chip,
} from '@/components/ui'
import TopNav from '@/components/layout/TopNav'
import BackButton from '@/components/layout/BackButton'
import BottomTab from '@/components/layout/BottomTab'
import type { TaxRate, Honorific, DocumentType } from '@/types'

type Step = 'select' | 'form'

const DOC_CONFIG = {
  quote:   { label: '見積書', color: '#1a6bb5' },
  invoice: { label: '請求書', color: '#e03a3a' },
  receipt: { label: '領収書', color: '#9b4fc8' },
} as const

export default function NewDocumentClient({ jobId }: { jobId: string }) {
  const router = useRouter()
  const { getJob, getJobItems, createDocument, settings, getCustomer } = useStore()
  const job = getJob(jobId)
  const items = getJobItems(jobId)

  const [step, setStep] = useState<Step>('select')
  const [docType, setDocType] = useState<DocumentType>('quote')

  const [subject, setSubject] = useState(job?.name ?? '')
  const [docNumber, setDocNumber] = useState('')
  const [expireDate, setExpireDate] = useState(expireISO())
  const [taxRate, setTaxRate] = useState<TaxRate>(0.10)
  const [honorific, setHonorific] = useState<Honorific>('様')
  const [note, setNote] = useState('')
  const [taxiRemark, setTaxiRemark] = useState('')
  const [discount, setDiscount] = useState(String(job?.discount ?? 0))
  const [saving, setSaving] = useState(false)

  const { subtotal, tax, total } = calcTotals(items, taxRate)

  async function handleSelectType(type: DocumentType) {
    setDocType(type)
    setStep('form')
    try {
      setDocNumber(await getNextDocNo(type))
    } catch {
      showToast('採番の取得に失敗しました', 'error')
    }
  }

  async function handleCreate() {
    if (!subject.trim()) { showToast('件名を入力してください', 'error'); return }
    if (items.length === 0) { showToast('明細が0件です。案件に明細を追加してください', 'error'); return }
    setSaving(true)
    try {
      const doc = await createDocument(jobId, {
        docType,
        docNumber: docNumber.trim(),
        subject: subject.trim(),
        expireDate,
        taxRate,
        honorific,
        note: note.trim(),
        taxiRemark: taxiRemark.trim(),
        discount: parseFloat(discount) || 0,
      })
      const labels: Record<DocumentType, string> = { quote: '見積書', invoice: '請求書', receipt: '領収書' }
      showToast(`${labels[docType]}を作成しました`, 'success')
      const paths: Record<DocumentType, string> = {
        quote: `/quotes/${doc.id}`,
        invoice: `/invoices/${doc.id}`,
        receipt: `/receipts/${doc.id}`,
      }
      router.push(paths[docType])
    } catch {
      showToast('作成に失敗しました（発行番号が重複している可能性があります）', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!job) {
    return <div className="p-8 text-center text-ink-muted">案件が見つかりません</div>
  }

  // ── Step 1: 書類種別選択 ───────────────────────────────
  if (step === 'select') {
    return (
      <>
        <TopNav
          left={<BackButton href={`/jobs/${jobId}`} />}
          title={<span className="text-sm font-semibold">書類新規作成</span>}
        />
        <main
          className="max-w-xl mx-auto pb-tab"
          style={{ minHeight: '100vh', backgroundColor: '#e8f4fb' }}
        >
          {/* アイコン＋サブタイトル */}
          <div className="flex flex-col items-center pt-8 pb-6">
            <div style={{ position: 'relative', width: 72, height: 72, marginBottom: 16 }}>
              <FileText size={64} color="#2a6bb5" strokeWidth={1.5} />
              <div style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 28, height: 28, borderRadius: '50%',
                backgroundColor: '#2a6bb5', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontSize: 20, lineHeight: 1, fontWeight: 700 }}>+</span>
              </div>
            </div>
            <p style={{ fontSize: 16, color: '#1a4a80', fontWeight: 500 }}>作成する書類を選んでください</p>
          </div>

          {/* 書類選択ボタン */}
          <div className="px-5 space-y-3">
            {(Object.entries(DOC_CONFIG) as [DocumentType, { label: string; color: string }][]).map(([type, cfg]) => (
              <button
                key={type}
                onClick={() => handleSelectType(type)}
                className="w-full text-left"
              >
                <div style={{
                  background: '#fff',
                  borderRadius: 10,
                  border: '1px solid #dde8f0',
                  overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 20px',
                  }}>
                    <span style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 700, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <ChevronRight size={20} color={cfg.color} />
                  </div>
                  <div style={{ height: 5, backgroundColor: cfg.color }} />
                </div>
              </button>
            ))}
          </div>

          {/* キャンセルボタン */}
          <div className="flex justify-center mt-8 pb-8">
            <button
              onClick={() => router.push(`/jobs/${jobId}`)}
              style={{
                width: 56, height: 56, borderRadius: '50%',
                backgroundColor: '#1a4a80',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
              }}
            >
              <span style={{ color: '#fff', fontSize: 24, lineHeight: 1 }}>✕</span>
            </button>
          </div>
        </main>
        <ToastProvider />
      </>
    )
  }

  // ── Step 2: 書類作成フォーム ──────────────────────────
  const cfg = DOC_CONFIG[docType]
  const numLabel: Record<DocumentType, string> = { quote: '見積番号', invoice: '請求番号', receipt: '領収番号' }
  const expireLabel: Record<DocumentType, string> = { quote: '有効期限', invoice: 'お支払期限', receipt: '領収日' }

  return (
    <>
      <TopNav
        left={<Button variant="ghost" size="sm" onClick={() => setStep('select')}>← 戻る</Button>}
        title={<span className="text-sm font-semibold">{cfg.label}を作成</span>}
      />
      <main className="max-w-xl mx-auto px-4 pt-4 pb-tab">
        {/* 種別インジケーター */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          padding: '8px 12px', borderRadius: 8, backgroundColor: cfg.color + '18',
          borderLeft: `4px solid ${cfg.color}`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
        </div>

        <Card className="p-3 mb-4 bg-surface-2 border-border">
          <p className="text-xs text-ink-muted">案件</p>
          <p className="font-semibold text-sm">{job.name}</p>
          {getCustomer(job.customerId)?.name && (
            <p className="text-xs text-ink-muted mt-0.5">👤 {getCustomer(job.customerId)?.name}</p>
          )}
        </Card>

        <Card className="p-4 mb-4">
          <FormGroup label="件名" required>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="例: 残存物撤去作業" />
            {settings.titleTemplates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {settings.titleTemplates.map((t, i) => (
                  <Chip key={i} onClick={() => setSubject(t)} selected={subject === t}>{t}</Chip>
                ))}
              </div>
            )}
          </FormGroup>

          <div className="grid grid-cols-2 gap-2.5">
            <FormGroup label={numLabel[docType]}>
              <Input value={docNumber} onChange={e => setDocNumber(e.target.value)} />
            </FormGroup>
            {docType !== 'receipt' && (
              <FormGroup label={expireLabel[docType]}>
                <Input type="date" value={expireDate} onChange={e => setExpireDate(e.target.value)} />
              </FormGroup>
            )}
          </div>

          <FormGroup label="消費税率">
            <Select value={String(taxRate)} onChange={e => setTaxRate(parseFloat(e.target.value) as TaxRate)}>
              <option value="0.10">10%</option>
              <option value="0.08">8%（軽減税率）</option>
              <option value="0">非課税 / 0%</option>
            </Select>
          </FormGroup>

          <FormGroup label="顧客敬称">
            <div className="flex gap-2">
              {(['様', '御中'] as Honorific[]).map(h => (
                <Chip key={h} onClick={() => setHonorific(h)} selected={honorific === h}>{h}</Chip>
              ))}
            </div>
          </FormGroup>

          {docType === 'receipt' && (
            <FormGroup label="但し書き">
              <div className="flex items-center gap-2">
                <Input value={taxiRemark} onChange={e => setTaxiRemark(e.target.value)} placeholder="例: 残存物撤去作業代として" />
                <span className="text-sm text-ink-muted whitespace-nowrap">として</span>
              </div>
            </FormGroup>
          )}

          <FormGroup label="備考">
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="お支払い条件、納期など" />
            {settings.noteTemplates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {settings.noteTemplates.map((t, i) => (
                  <Chip key={i} onClick={() => setNote(prev => prev ? `${prev}\n${t}` : t)}>
                    {t.length > 18 ? t.slice(0, 18) + '…' : t}
                  </Chip>
                ))}
              </div>
            )}
          </FormGroup>

          <FormGroup label="値引き（円）">
            <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" className="text-right" />
          </FormGroup>
        </Card>

        <Card className="p-4 mb-4">
          <p className="text-xs font-semibold text-ink-sub mb-2">明細プレビュー（{items.length}件）</p>
          {items.length === 0 ? (
            <p className="text-sm text-ink-muted py-2">明細がありません。案件ページで追加してください。</p>
          ) : (
            <>
              <div className="divide-y divide-border text-sm">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between py-2">
                    <span className="text-ink">{item.name}</span>
                    <span className="font-medium">{fmtMoney(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
              <AmountSummary subtotal={subtotal} tax={tax} total={total} taxRate={taxRate} />
            </>
          )}
        </Card>

        <Button variant="primary" size="lg" onClick={handleCreate} disabled={saving} style={{ backgroundColor: cfg.color }}>
          {saving ? '作成中…' : `${cfg.label}を作成する`}
        </Button>
      </main>
      <ToastProvider />
      <BottomTab />
    </>
  )
}
