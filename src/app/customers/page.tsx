import type { Metadata } from 'next'
import CustomersClient from './CustomersClient'

export const metadata: Metadata = { title: '顧客管理 | 見積書作成' }

export default function CustomersPage() {
  return <CustomersClient />
}
