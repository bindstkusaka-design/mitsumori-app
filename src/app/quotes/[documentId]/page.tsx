import type { Metadata } from 'next'
import QuoteDetailClient from './QuoteDetailClient'

export const metadata: Metadata = { title: '見積書 | 見積書作成' }

export default function QuoteDetailPage({ params }: { params: { documentId: string } }) {
  return <QuoteDetailClient documentId={params.documentId} />
}
