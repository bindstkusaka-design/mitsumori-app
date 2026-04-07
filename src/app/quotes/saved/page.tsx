import type { Metadata } from 'next'
import SavedPdfClient from './SavedPdfClient'

export const metadata: Metadata = { title: '保存済みPDF | 見積書作成' }

export default function SavedPdfPage() {
  return <SavedPdfClient />
}
