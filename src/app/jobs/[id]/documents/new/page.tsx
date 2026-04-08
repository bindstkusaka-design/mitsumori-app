import type { Metadata } from 'next'
import NewDocumentClient from './NewDocumentClient'

export const metadata: Metadata = { title: '書類新規作成 | 見積書作成' }

export default function NewDocumentPage({ params }: { params: { id: string } }) {
  return <NewDocumentClient jobId={params.id} />
}
