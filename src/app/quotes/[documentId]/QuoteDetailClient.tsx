'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Download, Printer, Trash2, RefreshCw } from 'lucide-react'
import { useStore, getNextDocNo } from '@/lib/store'
import { calcTotals, fmtDate, fmtMoney } from '@/lib/utils'
import { loadSeal } from '@/lib/seal-storage'
import {
  Button, Badge, Card, EmptyState, ToastProvider, showToast, Divider,
} from '@/components/ui'
import TopNav from '@/components/layout/TopNav'
import BackButton from '@/components/layout/BackButton'
import BottomTab from '@/components/layout/BottomTab'
import DocShareButtons from '@/components/DocShareButtons'

export default function QuoteDetailClient({ documentId }: { documentId: string }) {
  const router = useRouter()
  const { getDocument, getDocumentItems, getJob, finalizeDocument, deleteDocument, savePdf, createDocument, settings } = useStore()
  const [saving, setSaving] = useState(false)
  const [sealDataUrl, setSealDataUrl] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSealDataUrl(loadSeal())
  }, [])

  const doc = getDocument(documentId)
  const items = getDocumentItems(documentId)
  const job = doc ? getJob(doc.jobId) : undefined

  async function handleFinalize() {
    if (!confirm('見積書を確定しますか？\n確定後は内容を変更できません。')) return
    finalizeDocument(documentId)
    showToast('見積書を確定しました', 'success')
  }

  async function handleSavePdf() {
    setSaving(true)
    const result = await savePdf(documentId)
    setSaving(false)
    if (result.ok) showToast('PDFを保存しました', 'success')
    else showToast(result.error ?? 'PDF保存に失敗しました', 'error')
  }

  function handlePrint() {
    if (!printRef.current) return
    const html = printRef.current.innerHTML
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html lang="ja"><head>
      <meta charset="UTF-8">
      <title>見積書 - ${doc?.quoteNumber ?? ''}</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600;700&family=Noto+Sans+JP:wght@400;500&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Noto Sans JP', 'Noto Serif JP', sans-serif; color: #111; padding: 0; max-width: 170mm; margin: 0 auto; font-size: 12px; }
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
      <br><button onclick="window.print()" style="padding:10px 24px;background:#2d5a3d;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">印刷する</button>
    </body></html>`)
    w.document.close()
  }

  function handleCreateFrom(type: 'quote' | 'invoice' | 'receipt') {
    if (!doc) return
    const sourceItems = items.map((item, idx) => ({
      sortOrder: idx,
      name: item.name,
      price: item.price,
      qty: item.qty,
      unit: item.unit,
      note: item.note,
    }))
    const newDoc = createDocument(doc.jobId, {
      docType: type,
      quoteNumber: getNextDocNo(type),
      subject: doc.subject,
      expireDate: doc.expireDate,
      taxRate: doc.taxRate,
      honorific: doc.honorific ?? '御中',
      note: doc.note,
      discount: doc.discount,
      sourceItems,
    })
    const labels = { quote: '見積書', invoice: '請求書', receipt: '領収書' }
    const paths = { quote: `/quotes/${newDoc.id}`, invoice: `/invoices/${newDoc.id}`, receipt: `/receipts/${newDoc.id}` }
    showToast(`${labels[type]}を作成しました`, 'success')
    router.push(paths[type])
  }

  function handleDelete() {
    if (!confirm('この見積書を削除しますか？')) return
    const jobId = doc?.jobId
    deleteDocument(documentId)
    showToast('削除しました')
    if (jobId) router.push(`/jobs/${jobId}`)
    else router.push('/')
  }

  if (!doc) {
    return (
      <>
        <TopNav left={<BackButton />} />
        <main className="max-w-xl mx-auto px-4 pt-6 pb-tab">
          <EmptyState icon="🔍" title="見積書が見つかりません" description="URLを確認してください" />
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
  const p = settings.profile
  const ROWS_PAGE1 = 15    // 1ページ目の明細行数上限（ヘッダー分を差し引いた残り）
  const ROWS_PER_PAGE = 25 // 2ページ目以降の明細行数上限
  const fmtYen = (n: number) => n.toLocaleString('ja-JP') + '円'

  // 明細をページ単位に分割
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
        title={<span className="text-sm font-semibold">見積書 No.{doc.quoteNumber}</span>}
      />
      <main className="max-w-xl mx-auto px-4 pt-4 pb-tab">

        {/* ステータスバー */}
        <Card className={`p-3 mb-4 ${isFinalized ? 'bg-accent-light border-green-200' : 'bg-surface-2'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">No. {doc.quoteNumber || '-'}</p>
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
          {/* printRef は innerHTML 転写の起点。スタイルは内側の div に持たせることで PDF 出力時も同じ見た目になる */}
          <div ref={printRef}>
          <div style={{ fontFamily: "'Noto Sans JP', 'Noto Serif JP', sans-serif", fontSize: 12, color: '#111', lineHeight: 1.5, width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>

            {pages.map((page, pageIndex) => (
              <div
                key={pageIndex}
                className="page"
                style={{
                  padding: '16px 18px 20px',
                  ...(pageIndex > 0 ? { borderTop: '3px dashed #bbb', marginTop: 20 } : {}),
                }}
              >
                {/* 1ページ目のみ: タイトル・顧客名・会社情報・区切り線 */}
                {page.isFirst && (
                  <>
                    {/* ① タイトル行: 御見積書バッジ + ページ番号 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                      <div style={{ backgroundColor: '#1a6bb5', color: '#fff', padding: '6px 20px', fontWeight: 700, fontSize: 18, borderRadius: 3, letterSpacing: '0.1em', flexShrink: 0, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                        御見積書
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 10, color: '#888' }}>
                        {1}/{totalPages} ページ
                      </div>
                    </div>

                    {/* ② 顧客名(左58%) + No.(右) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ width: '58%', textAlign: 'right', fontSize: 14, borderBottom: '1px solid #ccc', paddingBottom: 4, marginBottom: 4 }}>
                        {job?.client}<span style={{ marginLeft: 6 }}>{doc.honorific ?? '御中'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#555' }}>No.&nbsp;{doc.quoteNumber || '-'}</div>
                    </div>

                    {/* ③ 発行情報(左55%) + 会社情報+角印(右45%) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div style={{ width: '55%' }}>
                        {[
                          { label: '件名', value: doc.subject },
                          { label: '納期日', value: '' },
                          { label: '御見積日', value: fmtDate(doc.issueDate) },
                          { label: '有効期限', value: fmtDate(doc.expireDate) },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'baseline', borderBottom: '1px solid #ccc', padding: '3px 0', fontSize: 11 }}>
                            <span style={{ width: 88, flexShrink: 0, color: '#555' }}>{label}</span>
                            <span style={{ flex: 1, wordBreak: 'break-word' }}>{value}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'baseline', borderBottom: '1px solid #ccc', padding: '5px 0 3px', fontSize: 11 }}>
                          <span style={{ width: 88, flexShrink: 0, color: '#555' }}>御見積金額（税込）</span>
                          <span style={{ flex: 1, textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{fmtYen(discountedTotal)}</span>
                        </div>
                      </div>
                      <div style={{ width: '43%', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 8, overflow: 'hidden', paddingLeft: 12 }}>
                        <div style={{ fontSize: 10, lineHeight: 1.6, color: '#555', flex: '1 1 auto', minWidth: 0, wordBreak: 'break-word' }}>
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

                    {/* 区切り線 */}
                    <hr style={{ border: 'none', borderTop: '1px solid #999', margin: '0 0 77px' }} />
                  </>
                )}

                {/* 明細テーブル（全ページ共通・2ページ目以降はヘッダー行を再表示） */}
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

                {/* フッター: 最終ページのみ表示 */}
                {page.isLast && (
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
              <CheckCircle size={17} /> この見積書を確定する
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
                  {doc.pdfSavedAt && (
                    <p className="text-xs text-blue-600 mt-0.5">{fmtDate(doc.pdfSavedAt)}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleSavePdf} disabled={saving}>
                    <RefreshCw size={13} /> 再生成
                  </Button>
                  <Button variant="primary" size="sm">
                    <Download size={13} /> DL
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
            fileName={`御見積書_${job?.client ?? ''}_${doc.issueDate}`}
            subject={`御見積書 No.${doc.quoteNumber} - ${doc.subject}`}
            bodyText={`${job?.client ?? ''}様\n\n御見積書をお送りします。\n件名: ${doc.subject}\nNo: ${doc.quoteNumber}`}
          />

          <Divider />
          <p className="text-xs text-ink-muted px-1">この見積書から作成</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="md" onClick={() => handleCreateFrom('invoice')}>
              📄 請求書を作成
            </Button>
            <Button variant="outline" size="md" onClick={() => handleCreateFrom('receipt')}>
              🧾 領収書を作成
            </Button>
          </div>
          <Button variant="outline" size="md" onClick={() => handleCreateFrom('quote')}>
            📋 コピーして新規作成（見積書）
          </Button>

          {!isFinalized && (
            <>
              <Divider />
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 size={14} /> この見積書を削除
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
