'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Download, Printer, Trash2, RefreshCw } from 'lucide-react'
import { useStore, getNextDocNo } from '@/lib/store'
import { calcTotals, fmtDate } from '@/lib/utils'
import { getSealUrl } from '@/lib/seal-storage'
import { getPdfUrl } from '@/lib/pdf-asset-service'
import { generatePdfBlob } from '@/lib/generate-pdf'
import {
  Button, Badge, Card, EmptyState, ToastProvider, showToast, Divider,
} from '@/components/ui'
import TopNav from '@/components/layout/TopNav'
import BackButton from '@/components/layout/BackButton'
import BottomTab from '@/components/layout/BottomTab'
import DocShareButtons from '@/components/DocShareButtons'

export default function InvoiceDetailClient({ documentId }: { documentId: string }) {
  const router = useRouter()
  const { getDocument, getDocumentItems, getJob, getCustomer, finalizeDocument, deleteDocument, savePdf, createDocument, markJobPaid, settings } = useStore()
  const [saving, setSaving] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const sealDataUrl = getSealUrl(settings.profile.sealImagePath)

  const doc = getDocument(documentId)
  const items = getDocumentItems(documentId)
  const job = doc ? getJob(doc.jobId) : undefined
  const customer = job ? getCustomer(job.customerId) : undefined

  async function handleFinalize() {
    if (!confirm('請求書を確定しますか？\n確定後は内容を変更できません。')) return
    try {
      await finalizeDocument(documentId)
      showToast('請求書を確定しました', 'success')
    } catch {
      showToast('確定に失敗しました', 'error')
    }
  }

  async function handleMarkPaid() {
    if (!doc || !job) return
    if (!confirm('入金処理を完了し、この案件を終了リストへ移動しますか？')) return
    try {
      await markJobPaid(job.id)
      showToast('案件を終了リストに移動しました', 'success')
      router.push(`/jobs/${job.id}`)
    } catch {
      showToast('処理に失敗しました', 'error')
    }
  }

  async function handleSavePdf() {
    if (!printRef.current || !doc) return
    setSaving(true)
    try {
      const blob = await generatePdfBlob(printRef.current, `御請求書_${customer?.name ?? ''}_${doc.issueDate}`)
      const result = await savePdf(documentId, blob)
      if (result.ok) showToast('PDFを保存しました', 'success')
      else showToast(result.error ?? 'PDF保存に失敗しました', 'error')
    } catch {
      showToast('PDF保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handlePrint() {
    if (!printRef.current) return
    const html = printRef.current.innerHTML
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html lang="ja"><head>
      <meta charset="UTF-8">
      <title>請求書 - ${doc?.docNumber ?? ''}</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Noto Sans JP', sans-serif; color: #111; padding: 0; max-width: 170mm; margin: 0 auto; font-size: 12px; }
        @media print {
          button { display: none !important; }
          @page { size: A4 portrait; margin: 22mm 20mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .page { page-break-after: always; border-top: none !important; margin-top: 0 !important; }
          .page:last-child { page-break-after: avoid; }
          tr { page-break-inside: avoid; }
        }
      </style>
    </head><body>${html}
      <br><button onclick="window.print()" style="padding:10px 24px;background:#1a6bb5;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">印刷する</button>
    </body></html>`)
    w.document.close()
  }

  async function handleDelete() {
    if (!confirm('この請求書を削除しますか？')) return
    const jobId = doc?.jobId
    try {
      await deleteDocument(documentId)
      showToast('削除しました')
      if (jobId) router.push(`/jobs/${jobId}`)
      else router.push('/')
    } catch {
      showToast('削除に失敗しました', 'error')
    }
  }

  async function handleCopy() {
    if (!doc) return
    const sourceItems = items.map((item, idx) => ({
      sortOrder: idx, name: item.name, price: item.price,
      qty: item.qty, unit: item.unit, note: item.note,
    }))
    try {
      const docNumber = await getNextDocNo('invoice')
      const newDoc = await createDocument(doc.jobId, {
        docType: 'invoice',
        docNumber,
        sourceDocumentId: doc.id,
        subject: doc.subject,
        expireDate: doc.expireDate,
        taxRate: doc.taxRate,
        honorific: doc.honorific ?? '御中',
        note: doc.note,
        discount: doc.discount,
        sourceItems,
      })
      showToast('請求書をコピーしました', 'success')
      router.push(`/invoices/${newDoc.id}`)
    } catch {
      showToast('作成に失敗しました', 'error')
    }
  }

  if (!doc) {
    return (
      <>
        <TopNav left={<BackButton />} />
        <main className="max-w-xl mx-auto px-4 pt-6 pb-tab">
          <EmptyState icon="🔍" title="請求書が見つかりません" description="URLを確認してください" />
        </main>
        <BottomTab />
      </>
    )
  }

  const { subtotal, tax, total } = calcTotals(items, doc.taxRate)
  const discountAmt = doc.discount ?? 0
  const discountedSubtotal = Math.max(0, subtotal - discountAmt)
  const discountedTax = Math.round(discountedSubtotal * doc.taxRate)
  const discountedTotal = discountedSubtotal + discountedTax
  const isFinalized = doc.status === 'finalized'
  const isInvoice = doc.docType === 'invoice'
  const isJobArchived = job?.status === 'archived'
  const p = settings.profile
  const ROWS_PAGE1 = 15
  const ROWS_PER_PAGE = 25
  const fmtYen = (n: number) => n.toLocaleString('ja-JP') + '円'

  // bank info
  const bankLine1 = [p.bankName, p.bankBranch ? `店番：${p.bankBranch}` : ''].filter(Boolean).join('\u3000\u3000')
  const bankLine2 = [p.bankAccountType, p.bankAccountNumber ? `口座番号：${p.bankAccountNumber}` : ''].filter(Boolean).join('\u3000\u3000')
  const bankLine3 = p.bankAccountHolder ? `口座名義：${p.bankAccountHolder}` : ''

  // ページ分割
  const pages: { rows: typeof items; fillCount: number; isFirst: boolean; isLast: boolean }[] = []
  if (items.length <= ROWS_PAGE1) {
    pages.push({ rows: items, fillCount: ROWS_PAGE1 - items.length, isFirst: true, isLast: true })
  } else {
    pages.push({ rows: items.slice(0, ROWS_PAGE1), fillCount: 0, isFirst: true, isLast: false })
    let off = ROWS_PAGE1
    while (off < items.length) {
      const chunk = items.slice(off, off + ROWS_PER_PAGE)
      const isLast = off + chunk.length >= items.length
      pages.push({ rows: chunk, fillCount: Math.max(0, ROWS_PER_PAGE - chunk.length), isFirst: false, isLast })
      off += ROWS_PER_PAGE
    }
  }
  const totalPages = pages.length

  return (
    <>
      <TopNav
        left={<BackButton href={job ? `/jobs/${doc.jobId}` : '/'} />}
        title={<span className="text-sm font-semibold">請求書 No.{doc.docNumber}</span>}
      />
      <main className="max-w-xl mx-auto px-4 pt-4 pb-tab">

        <Card className={`p-3 mb-4 ${isFinalized ? 'bg-accent-light border-green-200' : 'bg-surface-2'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">No. {doc.docNumber || '-'}</p>
              <p className="text-xs text-ink-muted mt-0.5">{doc.subject || '件名未設定'}</p>
            </div>
            <div className="flex items-center gap-2">
              {doc.pdfPath && <Badge variant="pdf">📄 PDF</Badge>}
              <Badge variant={isFinalized ? 'final' : 'draft'}>
                {isFinalized ? '✓ 確定済' : '下書き'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* 帳票プレビュー */}
        <Card className="p-0 mb-4 overflow-hidden">
          <div ref={printRef}>
          <div style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 12, color: '#111', lineHeight: 1.5, width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>

            {pages.map((page, pageIndex) => (
              <div
                key={pageIndex}
                className="page"
                style={{
                  padding: '16px 18px 20px',
                  ...(pageIndex > 0 ? { borderTop: '3px dashed #bbb', marginTop: 20 } : {}),
                }}
              >
                {page.isFirst && (
                  <>
                    {/* タイトル + ページ番号 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                      <div style={{ backgroundColor: '#1a6bb5', color: '#fff', padding: '6px 20px', fontWeight: 700, fontSize: 18, borderRadius: 3, letterSpacing: '0.1em', flexShrink: 0, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                        御請求書
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 10, color: '#888' }}>
                        {1}/{totalPages} ページ
                      </div>
                    </div>

                    {/* 顧客名(左58%) + No.(右) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ width: '58%', textAlign: 'right', fontSize: 14, borderBottom: '1px solid #ccc', paddingBottom: 4, marginBottom: 4 }}>
                        {customer?.name}<span style={{ marginLeft: 6 }}>{doc.honorific ?? '御中'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#555' }}>No.&nbsp;{doc.docNumber || '-'}</div>
                    </div>

                    {/* 発行情報(左55%) + 会社情報+角印(右45%) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div style={{ width: '55%' }}>
                        {[
                          { label: '件名', value: doc.subject },
                          { label: '発行日', value: fmtDate(doc.issueDate) },
                          { label: 'お支払期限', value: fmtDate(doc.expireDate) },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'baseline', borderBottom: '1px solid #ccc', padding: '3px 0', fontSize: 11 }}>
                            <span style={{ width: 88, flexShrink: 0, color: '#555' }}>{label}</span>
                            <span style={{ flex: 1, wordBreak: 'break-word' }}>{value}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'baseline', borderBottom: '1px solid #ccc', padding: '5px 0 3px', fontSize: 11 }}>
                          <span style={{ width: 88, flexShrink: 0, color: '#555' }}>御請求金額（税込）</span>
                          <span style={{ flex: 1, textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{fmtYen(discountedTotal)}</span>
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-start', gap: 8, overflow: 'hidden' }}>
                        <div style={{ fontSize: 10, lineHeight: 1.6, color: '#555', minWidth: 0, wordBreak: 'break-word' }}>
                          {p.companyName
                            ? <div style={{ fontWeight: 600, color: '#111' }}>{p.companyName}</div>
                            : <div style={{ color: '#aaa' }}>（発行者未設定）</div>}
                          {p.postalCode && <div>〒{p.postalCode}</div>}
                          {p.address && <div>{p.address}</div>}
                          {p.tel && <div>TEL: {p.tel}</div>}
                          {p.email && <div>{p.email}</div>}
                          {p.invoiceNumber && <div>登録番号: {p.invoiceNumber}</div>}
                        </div>
                        {sealDataUrl && (
                          <img src={sealDataUrl} alt="角印" style={{ width: 58, height: 58, objectFit: 'contain', flexShrink: 0 }} />
                        )}
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #999', margin: '0 0 77px' }} />
                  </>
                )}

                {/* 明細テーブル */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed', margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ color: '#333', padding: '5px 8px', textAlign: 'left', fontWeight: 600, width: '40%', background: 'transparent', borderBottom: '1px solid #999' }}>名称</th>
                      <th style={{ color: '#333', padding: '5px 6px', textAlign: 'right', fontWeight: 600, width: '18%', background: 'transparent', borderBottom: '1px solid #999' }}>単価</th>
                      <th style={{ color: '#333', padding: '5px 6px', textAlign: 'center', fontWeight: 600, width: '10%', background: 'transparent', borderBottom: '1px solid #999' }}>数量</th>
                      <th style={{ color: '#333', padding: '5px 6px', textAlign: 'center', fontWeight: 600, width: '12%', background: 'transparent', borderBottom: '1px solid #999' }}>単位</th>
                      <th style={{ color: '#333', padding: '5px 6px', textAlign: 'right', fontWeight: 600, width: '20%', background: 'transparent', borderBottom: '1px solid #999' }}>金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows.map(item => (
                      <tr key={item.id}>
                        <td style={{ border: '1px solid #ddd', padding: '5px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                          {item.name}
                          {item.note && <span style={{ display: 'block', fontSize: 10, color: '#888', marginTop: 1 }}>{item.note}</span>}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '5px 6px', textAlign: 'right', verticalAlign: 'middle' }}>{fmtYen(item.price)}</td>
                        <td style={{ border: '1px solid #ddd', padding: '5px 6px', textAlign: 'center', verticalAlign: 'middle' }}>{item.qty}</td>
                        <td style={{ border: '1px solid #ddd', padding: '5px 6px', textAlign: 'center', verticalAlign: 'middle' }}>{item.unit}</td>
                        <td style={{ border: '1px solid #ddd', padding: '5px 6px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 500 }}>{fmtYen(item.price * item.qty)}</td>
                      </tr>
                    ))}
                    {Array.from({ length: page.fillCount }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td style={{ border: '1px solid #ddd', height: 22 }}>&nbsp;</td>
                        <td style={{ border: '1px solid #ddd', height: 22 }}>&nbsp;</td>
                        <td style={{ border: '1px solid #ddd', height: 22 }}>&nbsp;</td>
                        <td style={{ border: '1px solid #ddd', height: 22 }}>&nbsp;</td>
                        <td style={{ border: '1px solid #ddd', height: 22 }}>&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* フッター（最終ページのみ） */}
                {page.isLast && (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed', margin: 0 }}>
                      <colgroup>
                        <col style={{ width: '60%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '20%' }} />
                      </colgroup>
                      <tbody>
                        <tr>
                          <td rowSpan={discountAmt > 0 ? 5 : 3} style={{ border: '1px solid #ddd', padding: '6px 8px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 11 }}>備考</div>
                            <div style={{ whiteSpace: 'pre-wrap', color: '#333', minHeight: 52, fontSize: 11 }}>{doc.note}</div>
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '5px 8px', color: '#555' }}>小計</td>
                          <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'right' }}>{fmtYen(subtotal)}</td>
                        </tr>
                        {discountAmt > 0 && (
                          <>
                            <tr>
                              <td style={{ border: '1px solid #ddd', padding: '5px 8px', color: '#e53935' }}>値引き</td>
                              <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'right', color: '#e53935' }}>-{fmtYen(discountAmt)}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #ddd', padding: '5px 8px', color: '#555' }}>小計（値引後）</td>
                              <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'right' }}>{fmtYen(discountedSubtotal)}</td>
                            </tr>
                          </>
                        )}
                        <tr>
                          <td style={{ border: '1px solid #ddd', padding: '5px 6px', color: '#555', fontSize: 10 }}>消費税（{doc.taxRate === 0 ? '0' : doc.taxRate === 0.08 ? '8' : '10'}%）</td>
                          <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'right' }}>{fmtYen(discountedTax)}</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #ddd', padding: '5px 8px', color: '#111', fontWeight: 700 }}>合計（税込）</td>
                          <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>{fmtYen(discountedTotal)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* 振込先（備考テーブル外・独立セクション） */}
                    {(p.bankName || p.bankAccountNumber) && (
                      <div style={{ borderTop: '1px solid #ccc', padding: '8px 0', fontSize: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 12 }}>お振込先</div>
                        {bankLine1 && <div style={{ color: '#333' }}>{bankLine1}</div>}
                        {bankLine2 && <div style={{ color: '#333' }}>{bankLine2}</div>}
                        {bankLine3 && <div style={{ color: '#333' }}>{bankLine3}</div>}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

          </div>
          </div>
        </Card>

        {/* アクション */}
        <div className="space-y-2.5 mb-4">
          {!isFinalized && (
            <Button variant="primary" size="lg" onClick={handleFinalize}>
              <CheckCircle size={17} /> この請求書を確定する
            </Button>
          )}
          {isFinalized && isInvoice && !isJobArchived && (
            <Button variant="secondary" size="lg" onClick={handleMarkPaid}>
              <CheckCircle size={17} /> 入金済みにする
            </Button>
          )}
          {isFinalized && !doc.pdfPath && (
            <Button variant="outline" size="lg" onClick={handleSavePdf} disabled={saving}>
              <Download size={17} /> {saving ? '保存中…' : 'PDFとして保存'}
            </Button>
          )}
          {doc.pdfPath && (
            <Card className="p-3 bg-blue-50 border-blue-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-blue-800">📄 PDF保存済み</p>
                  {doc.pdfSavedAt && <p className="text-xs text-blue-600 mt-0.5">{fmtDate(doc.pdfSavedAt)}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleSavePdf} disabled={saving}>
                    <RefreshCw size={13} /> 再生成
                  </Button>
                </div>
              </div>
            </Card>
          )}
          <Button variant="ghost" size="lg" onClick={handlePrint}>
            <Printer size={17} /> 印刷 / PDF出力
          </Button>
          <DocShareButtons
            printRef={printRef}
            fileName={`御請求書_${customer?.name ?? ''}_${doc.issueDate}`}
            subject={`御請求書 No.${doc.docNumber} - ${doc.subject}`}
            bodyText={`${customer?.name ?? ''}様\n\n御請求書をお送りします。\n件名: ${doc.subject}\nNo: ${doc.docNumber}`}
          />
          <Divider />
          <Button variant="outline" size="md" onClick={handleCopy}>
            📋 コピーして新規作成（請求書）
          </Button>
          {!isFinalized && (
            <>
              <Divider />
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 size={14} /> この請求書を削除
              </Button>
            </>
          )}
        </div>
      </main>
      <ToastProvider />
      <BottomTab />
    </>
  )
}
