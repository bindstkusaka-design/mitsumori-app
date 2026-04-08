import type { Metadata } from 'next'
import InvoiceDetailClient from './InvoiceDetailClient'

export const metadata: Metadata = { title: '請求書 | 見積書作成' }

export default function InvoiceDetailPage({ params }: { params: { documentId: string } }) {
  return <InvoiceDetailClient documentId={params.documentId} />
}
