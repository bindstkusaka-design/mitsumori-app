// data/sync.json の既存データを Supabase に一括インポートする一回限りのスクリプト。
// 実行方法: node scripts/import-to-supabase.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local')
  const raw = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
  return env
}

const env = loadEnvLocal()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('.env.local に NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が見つかりません')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const COMPANY_SETTINGS_ID = '00000000-0000-0000-0000-000000000001'
const DOC_PREFIX = { quote: 'Q', invoice: 'S', receipt: 'R' }

function must(result, label) {
  if (result.error) {
    console.error(`✗ ${label}:`, result.error.message)
    process.exit(1)
  }
  return result.data
}

async function main() {
  const dataPath = path.join(ROOT, 'data', 'sync.json')
  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  const { jobs = [], jobItems = [], documents = [], documentItems = [], products = [], settings } = raw

  // ── 安全策: 既にデータが投入されていないか確認 ──
  const { count, error: countError } = await supabase.from('customers').select('id', { count: 'exact', head: true })
  if (countError) { console.error('✗ 既存データ確認:', countError.message); process.exit(1) }
  if (count && count > 0) {
    console.error(`✗ customers テーブルに既に ${count} 件のデータがあります。二重インポートを避けるため中断します。`)
    process.exit(1)
  }

  // ── 1. 顧客マスタ ──
  const clientNames = [...new Set(jobs.map(j => (j.client ?? '').trim()))]
  const nameToCustomerId = new Map()
  for (const rawName of clientNames) {
    const name = rawName || '(顧客未設定)'
    if (nameToCustomerId.has(rawName)) continue
    const row = must(
      await supabase.from('customers').insert({ name, tel: '', address: '', email: '', google_map_url: '' }).select().single(),
      `顧客作成: ${name}`,
    )
    nameToCustomerId.set(rawName, row.id)
  }
  console.log(`✓ 顧客 ${nameToCustomerId.size}件`)

  // ── 2. 案件 ──
  const jobIdMap = new Map()
  for (const j of jobs) {
    const customerId = nameToCustomerId.get((j.client ?? '').trim())
    const row = must(
      await supabase.from('jobs').insert({
        customer_id: customerId,
        name: j.name,
        contact_person: j.contactPerson ?? '',
        status: j.status ?? 'active',
        discount: j.discount ?? null,
        paid_at: j.paidAt ?? null,
        created_at: j.createdAt,
        updated_at: j.updatedAt,
      }).select().single(),
      `案件作成: ${j.name}`,
    )
    jobIdMap.set(j.id, row.id)
  }
  console.log(`✓ 案件 ${jobIdMap.size}件`)

  // ── 3. 案件明細 ──
  let jobItemCount = 0
  for (const ji of jobItems) {
    const jobId = jobIdMap.get(ji.jobId)
    if (!jobId) continue
    must(
      await supabase.from('job_items').insert({
        job_id: jobId, sort_order: ji.sortOrder, name: ji.name,
        price: ji.price, qty: ji.qty, unit: ji.unit, note: ji.note,
      }).select().single(),
      `案件明細作成: ${ji.name}`,
    )
    jobItemCount++
  }
  console.log(`✓ 案件明細 ${jobItemCount}件`)

  // ── 4. 書類 ──
  const docIdMap = new Map()
  const docNumberStats = new Map() // "doc_type-year" -> max number
  for (const d of documents) {
    const jobId = jobIdMap.get(d.jobId)
    if (!jobId) continue
    const docType = d.docType ?? 'quote'
    const row = must(
      await supabase.from('documents').insert({
        job_id: jobId,
        doc_type: docType,
        doc_number: d.quoteNumber,
        subject: d.subject ?? '',
        issue_date: d.issueDate,
        expire_date: d.expireDate || null,
        tax_rate: d.taxRate,
        honorific: d.honorific ?? '様',
        note: d.note ?? '',
        taxi_remark: d.taxiRemark ?? '',
        discount: d.discount ?? null,
        status: d.status ?? 'draft',
        pdf_path: null,
        pdf_saved_at: null,
        created_at: d.createdAt,
        updated_at: d.updatedAt,
      }).select().single(),
      `書類作成: ${d.quoteNumber}`,
    )
    docIdMap.set(d.id, row.id)

    const match = /^[A-Z]+-(\d+)-(\d+)$/.exec(d.quoteNumber ?? '')
    if (match) {
      const year = parseInt(match[1], 10)
      const num = parseInt(match[2], 10)
      const key = `${docType}-${year}`
      docNumberStats.set(key, Math.max(docNumberStats.get(key) ?? 0, num))
    }
  }
  console.log(`✓ 書類 ${docIdMap.size}件`)

  // ── 5. 書類明細 ──
  let docItemCount = 0
  for (const di of documentItems) {
    const documentId = docIdMap.get(di.documentId)
    if (!documentId) continue
    must(
      await supabase.from('document_items').insert({
        document_id: documentId, sort_order: di.sortOrder, name: di.name,
        price: di.price, qty: di.qty, unit: di.unit, note: di.note,
      }).select().single(),
      `書類明細作成: ${di.name}`,
    )
    docItemCount++
  }
  console.log(`✓ 書類明細 ${docItemCount}件`)

  // ── 6. 商品マスタ ──
  for (const p of products) {
    must(
      await supabase.from('products').insert({
        name: p.name, price: p.price, unit: p.unit, note: p.note, created_at: p.createdAt,
      }).select().single(),
      `商品作成: ${p.name}`,
    )
  }
  console.log(`✓ 商品 ${products.length}件`)

  // ── 7. 会社設定 ──
  if (settings?.profile) {
    const p = settings.profile
    must(
      await supabase.from('company_settings').update({
        company_name: p.companyName ?? '',
        postal_code: p.postalCode ?? '',
        address: p.address ?? '',
        tel: p.tel ?? '',
        email: p.email ?? '',
        invoice_number: p.invoiceNumber ?? '',
        bank_name: p.bankName ?? '',
        bank_branch: p.bankBranch ?? '',
        bank_account_type: p.bankAccountType ?? '',
        bank_account_number: p.bankAccountNumber ?? '',
        bank_account_holder: p.bankAccountHolder ?? '',
        title_templates: settings.titleTemplates ?? [],
        note_templates: settings.noteTemplates ?? [],
      }).eq('id', COMPANY_SETTINGS_ID).select().single(),
      '会社設定更新',
    )
    console.log('✓ 会社設定')
  }

  // ── 8. 採番カウンターを既存データの最大値に合わせる ──
  for (const [key, maxNum] of docNumberStats) {
    const [docType, yearStr] = key.split('-')
    must(
      await supabase.from('doc_number_counters').upsert({
        doc_type: docType, year: parseInt(yearStr, 10), last_number: maxNum,
      }, { onConflict: 'doc_type,year' }),
      `採番カウンター更新: ${key}`,
    )
  }
  console.log(`✓ 採番カウンター ${docNumberStats.size}件`)

  console.log('\nインポート完了')
}

main()
