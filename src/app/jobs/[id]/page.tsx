import type { Metadata } from 'next'
import JobDetailClient from './JobDetailClient'

export const metadata: Metadata = { title: '案件詳細 | 見積書作成' }

export default function JobDetailPage({ params }: { params: { id: string } }) {
  return <JobDetailClient jobId={params.id} />
}
