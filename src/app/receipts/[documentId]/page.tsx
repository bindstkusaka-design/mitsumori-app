import type { Metadata } from 'next'
import ReceiptDetailClient from './ReceiptDetailClient'

export const metadata: Metadata = { title: '領収書 | 見積書作成' }

export default function ReceiptDetailPage({ params }: { params: { documentId: string } }) {
  return <ReceiptDetailClient documentId={params.documentId} />
}
