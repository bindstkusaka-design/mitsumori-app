import type { Metadata } from 'next'
import JobListClient from './JobListClient'

export const metadata: Metadata = { title: '案件一覧 | 見積書作成' }

export default function JobsPage() {
  return <JobListClient />
}
