// 受付フォームで顧客情報が保存された際に管理者へメール通知する。
// Resend関連の環境変数が未設定の場合は例外を投げず、警告ログのみ出してスキップする。

import { Resend } from 'resend'
import type { Customer } from '@/types'

function getConfig() {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.NOTIFY_EMAIL_TO
  const from = process.env.NOTIFY_EMAIL_FROM
  if (!apiKey || !to || !from) return null
  return { apiKey, to, from }
}

export async function notifyReceptionCustomerSaved(
  customer: Customer,
  mode: 'created' | 'updated',
): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig()
  if (!config) {
    console.warn('[reception-notify] 環境変数が未設定のためスキップしました')
    return { ok: false, error: 'メール通知が未設定です' }
  }

  try {
    const resend = new Resend(config.apiKey)
    const title = mode === 'created' ? '新しい顧客情報が登録されました' : '顧客情報が更新されました'
    const registeredAt = new Date().toLocaleString('ja-JP')
    const { error } = await resend.emails.send({
      from: config.from,
      to: config.to,
      subject: `【みつもりアプリ】${title}`,
      text: [
        `氏名: ${customer.name}`,
        `電話番号: ${customer.tel || '(未入力)'}`,
        `住所: ${customer.address || '(未入力)'}`,
        `登録日時: ${registeredAt}`,
      ].join('\n'),
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  } catch (err) {
    console.error('[reception-notify] メール通知に失敗しました', err)
    return { ok: false, error: err instanceof Error ? err.message : 'メール通知に失敗しました' }
  }
}
