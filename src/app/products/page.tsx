import type { Metadata } from 'next'
import ProductsClient from './ProductsClient'

export const metadata: Metadata = { title: '商品マスタ | 見積書作成' }

export default function ProductsPage() {
  return <ProductsClient />
}
