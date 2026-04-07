import type { Metadata } from 'next'
import SettingsClient from './SettingsClient'

export const metadata: Metadata = { title: '設定 | 見積書作成' }

export default function SettingsPage() {
  return <SettingsClient />
}
