import type { Metadata } from 'next'
import NewQuoteClient from './NewQuoteClient'

export const metadata: Metadata = { title: '見積書作成 | 見積書作成' }

export default function NewQuotePage({ params }: { params: { id: string } }) {
  return <NewQuoteClient jobId={params.id} />
}
