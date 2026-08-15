'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, getNextDocNo } from '@/lib/store'
import { expireISO } from '@/lib/utils'
import { calcTotals, fmtMoney, fmtDate } from '@/lib/utils'
import {
  Button, Card, FormGroup, Input, Select, Textarea,
  AmountSummary, ToastProvider, showToast, Chip,
} from '@/components/ui'
import TopNav from '@/components/layout/TopNav'
import BackButton from '@/components/layout/BackButton'
import BottomTab from '@/components/layout/BottomTab'
import type { TaxRate, Honorific } from '@/types'

export default function NewQuoteClient({ jobId }: { jobId: string }) {
  const router = useRouter()
  const { getJob, getJobItems, createDocument, settings, getCustomer } = useStore()
  const job = getJob(jobId)
  const items = getJobItems(jobId)

  const [subject, setSubject] = useState(job?.name ?? '')
  const [quoteNumber, setQuoteNumber] = useState('')
  const [expireDate, setExpireDate] = useState(expireISO())
  const [taxRate, setTaxRate] = useState<TaxRate>(0.10)
  const [honorific, setHonorific] = useState<Honorific>('様')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getNextDocNo('quote').then(setQuoteNumber).catch(() => showToast('採番の取得に失敗しました', 'error'))
  }, [])

  const { subtotal, tax, total } = calcTotals(items, taxRate)

  async function handleCreate() {
    if (!subject.trim()) { showToast('件名を入力してください', 'error'); return }
    if (items.length === 0) { showToast('明細が0件です。案件に明細を追加してください', 'error'); return }
    setSaving(true)
    try {
      const doc = await createDocument(jobId, {
        docType: 'quote',
        docNumber: quoteNumber.trim(),
        subject: subject.trim(),
        expireDate,
        taxRate,
        honorific,
        note: note.trim(),
      })
      showToast('見積書を作成しました', 'success')
      router.push(`/quotes/${doc.id}`)
    } catch {
      showToast('作成に失敗しました（発行番号が重複している可能性があります）', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!job) {
    return <div className="p-8 text-center text-ink-muted">案件が見つかりません</div>
  }

  return (
    <>
      <TopNav
        left={<BackButton href={`/jobs/${jobId}`} />}
        title={<span className="text-sm font-semibold">見積書を作成</span>}
      />
      <main className="max-w-xl mx-auto px-4 pt-4 pb-tab">

        {/* 案件情報 */}
        <Card className="p-3 mb-5 bg-surface-2 border-border">
          <p className="text-xs text-ink-muted">案件</p>
          <p className="font-semibold text-sm">{job.name}</p>
          {getCustomer(job.customerId)?.name && (
            <p className="text-xs text-ink-muted mt-0.5">👤 {getCustomer(job.customerId)?.name}</p>
          )}
        </Card>

        {/* フォーム */}
        <Card className="p-4 mb-4">
          <FormGroup label="件名" required>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="例: Webサイト制作のご提案" />
            {settings.titleTemplates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {settings.titleTemplates.map((t, i) => (
                  <Chip key={i} onClick={() => setSubject(t)} selected={subject === t}>
                    {t}
                  </Chip>
                ))}
              </div>
            )}
          </FormGroup>

          <div className="grid grid-cols-2 gap-2.5">
            <FormGroup label="見積番号">
              <Input value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} placeholder="Q-2025-001" />
            </FormGroup>
            <FormGroup label="有効期限">
              <Input type="date" value={expireDate} onChange={e => setExpireDate(e.target.value)} />
            </FormGroup>
          </div>

          <FormGroup label="消費税率">
            <Select
              value={String(taxRate)}
              onChange={e => setTaxRate(parseFloat(e.target.value) as TaxRate)}
            >
              <option value="0.10">10%</option>
              <option value="0.08">8%（軽減税率）</option>
              <option value="0">非課税 / 0%</option>
            </Select>
          </FormGroup>

          <FormGroup label="顧客敬称">
            <div className="flex gap-2">
              {(['様', '御中'] as Honorific[]).map(h => (
                <Chip key={h} onClick={() => setHonorific(h)} selected={honorific === h}>
                  {h}
                </Chip>
              ))}
            </div>
          </FormGroup>

          <FormGroup label="備考">
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="お支払い条件、納期など"
            />
            {settings.noteTemplates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {settings.noteTemplates.map((t, i) => (
                  <Chip
                    key={i}
                    onClick={() => setNote(prev => (prev ? `${prev}\n${t}` : t))}
                  >
                    {t.length > 18 ? t.slice(0, 18) + '…' : t}
                  </Chip>
                ))}
              </div>
            )}
          </FormGroup>
        </Card>

        {/* 明細サマリ */}
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

        <Button variant="primary" size="lg" onClick={handleCreate} disabled={saving}>
          {saving ? '作成中…' : '見積書を作成する'}
        </Button>
      </main>

      <ToastProvider />
      <BottomTab />
    </>
  )
}
