// 受付フォームで登録・編集した顧客情報をGoogleスプレッドシートにも反映する。
// サービスアカウント関連の環境変数が未設定の場合は例外を投げず、警告ログのみ出して
// スキップする（Supabaseへの保存自体は失敗させないため）。

import { google } from 'googleapis'
import type { Customer } from '@/types'

// 列構成: A=id  B=name  C=kana  D=tel  E=address  F=email  G=googleMapUrl  H=notes  I=createdAt  J=updatedAt
// ヘッダー行の有無を仮定しない（見つからなければ単に一致しないだけなので、あってもなくても安全）
const ID_COLUMN_RANGE = 'A:A'
const ROW_RANGE_WIDTH = 'J'

function customerToRow(customer: Customer): string[] {
  return [
    customer.id,
    customer.name,
    customer.kana,
    customer.tel,
    customer.address,
    customer.email,
    customer.googleMapUrl,
    customer.notes,
    customer.createdAt,
    customer.updatedAt,
  ]
}

function getConfig() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  const sheetId = process.env.GOOGLE_SHEET_ID
  const sheetName = process.env.GOOGLE_SHEET_NAME
  if (!email || !privateKeyRaw || !sheetId || !sheetName) return null
  // Vercel/.env では改行が `\n` というリテラル文字列として渡ってくるため実改行に戻す
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n')
  return { email, privateKey, sheetId, sheetName }
}

async function getSheetsClient(email: string, privateKey: string) {
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

export async function syncCustomerToSheet(customer: Customer): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig()
  if (!config) {
    console.warn('[google-sheets] 環境変数が未設定のためスキップしました')
    return { ok: false, error: 'Googleスプレッドシート連携が未設定です' }
  }

  try {
    const { email, privateKey, sheetId, sheetName } = config
    const sheets = await getSheetsClient(email, privateKey)

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!${ID_COLUMN_RANGE}`,
    })
    const ids = (existing.data.values ?? []).map(row => row[0])
    const rowIndex = ids.indexOf(customer.id)

    if (rowIndex === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [customerToRow(customer)] },
      })
    } else {
      const rowNumber = rowIndex + 1 // 0始まりインデックス → 1始まりの行番号への補正
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetName}!A${rowNumber}:${ROW_RANGE_WIDTH}${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [customerToRow(customer)] },
      })
    }
    return { ok: true }
  } catch (err) {
    console.error('[google-sheets] 反映に失敗しました', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Googleスプレッドシートへの反映に失敗しました' }
  }
}
