'use client'

import React from 'react'
import Link from 'next/link'
import { Download, RefreshCw, FolderOpen } from 'lucide-react'
import { useStore } from '@/lib/store'
import { calcTotals, fmtDate, fmtMoney } from '@/lib/utils'
import {
  Button, Badge, Card, SectionHeader, EmptyState, ToastProvider, showToast,
} from '@/components/ui'
import TopNav from '@/components/layout/TopNav'
import BottomTab from '@/components/layout/BottomTab'

export default function SavedPdfClient() {
  const { documents, getJob, getDocumentItems, savePdf } = useStore()

  // pdfPath がある、または finalized の documents を対象
  const pdfDocs = documents
    .filter(d => d.pdfPath || d.status === 'finalized')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  async function handleRegenerate(id: string) {
    const result = await savePdf(id)
    if (result.ok) showToast('PDF を再生成しました', 'success')
    else showToast(result.error ?? '再生成に失敗しました', 'error')
  }

  return (
    <>
      <TopNav />
      <main className="max-w-xl mx-auto px-4 pt-4 pb-tab">
        <SectionHeader
          title="保存済みPDF"
          sub={`${pdfDocs.length}件`}
        />

        {pdfDocs.length === 0 ? (
          <EmptyState
            icon="📂"
            title="保存済みPDFがありません"
            description={'確定済みの見積書から\nPDFを保存できます'}
          />
        ) : (
          <div className="space-y-3">
            {pdfDocs.map(doc => {
              const job = getJob(doc.jobId)
              const items = getDocumentItems(doc.id)
              const { total } = calcTotals(items, doc.taxRate)
              const hasPdf = !!doc.pdfPath

              return (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm">No. {doc.quoteNumber || '-'}</span>
                    <Badge variant={hasPdf ? 'pdf' : 'missing'}>
                      {hasPdf ? '📄 保存済' : '⚠ 欠損'}
                    </Badge>
                  </div>

                  <p className="text-xs text-ink-muted mb-0.5">{job?.name ?? '不明な案件'}</p>
                  <p className="text-xs text-ink-muted mb-2">{doc.subject}</p>

                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-ink-muted">
                      {doc.pdfSavedAt ? fmtDate(doc.pdfSavedAt) : fmtDate(doc.createdAt)}
                    </span>
                    <span className="font-bold text-accent">{fmtMoney(total)}</span>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/quotes/${doc.id}`} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full">
                        <FolderOpen size={13} /> 開く
                      </Button>
                    </Link>
                    {hasPdf ? (
                      <Button variant="primary" size="sm" className="flex-1">
                        <Download size={13} /> ダウンロード
                      </Button>
                    ) : (
                      <Button
                        variant="outline" size="sm" className="flex-1"
                        onClick={() => handleRegenerate(doc.id)}
                      >
                        <RefreshCw size={13} /> 再生成
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <ToastProvider />
      <BottomTab />
    </>
  )
}
