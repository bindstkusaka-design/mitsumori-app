import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  Customer, Job, JobItem, Document, DocumentItem,
  Product, Settings, TaxRate, Honorific, DocumentType, Outsourcer, DealStatus,
} from '@/types'
import { todayISO, formatDocNo } from '@/lib/utils'
import { supabase, unwrap } from '@/lib/supabase'
import { savePdfAsset } from '@/lib/pdf-asset-service'
import {
  mapCustomer, mapJob, mapJobItem, mapDocument, mapDocumentItem, mapProduct, mapSettings, mapOutsourcer,
  COMPANY_SETTINGS_ID,
} from '@/lib/mappers'

const DEFAULT_SETTINGS: Settings = {
  profile: {
    companyName: '',
    postalCode: '',
    address: '',
    tel: '',
    email: '',
    invoiceNumber: '',
    bankName: 'ゆうちょ銀行',
    bankBranch: '628',
    bankAccountType: '普通預金',
    bankAccountNumber: '1798772',
    bankAccountHolder: 'クサカ　トモアキ',
    sealImagePath: null,
  },
  titleTemplates: [
    'Webサイト制作のご提案',
    'システム開発のご見積',
    '保守サポートのご提案',
  ],
  noteTemplates: [
    'お支払いは請求書発行後30日以内にお願いいたします。',
    '本見積書の有効期限は発行日より30日間です。',
    '消費税は別途申し受けます。',
  ],
}

// ── Store interface ────────────────────────────────────────────
interface AppState {
  customers: Customer[]
  outsourcers: Outsourcer[]
  jobs: Job[]
  jobItems: JobItem[]
  documents: Document[]
  documentItems: DocumentItem[]
  products: Product[]
  settings: Settings
}

interface AppStore extends AppState {
  hydrate(): Promise<void>

  createCustomer(params: Pick<Customer, 'name' | 'kana' | 'tel' | 'address' | 'email' | 'googleMapUrl' | 'notes'>): Promise<Customer>
  updateCustomer(id: string, params: Partial<Pick<Customer, 'name' | 'kana' | 'tel' | 'address' | 'email' | 'googleMapUrl' | 'notes'>>): Promise<void>
  deleteCustomer(id: string): Promise<{ ok: boolean; error?: string }>
  getCustomer(id: string): Customer | undefined

  createOutsourcer(params: { name: string }): Promise<Outsourcer>
  getOutsourcer(id: string): Outsourcer | undefined

  createJob(params: Pick<Job, 'name' | 'customerId' | 'contactPerson'> & { requestDate?: string }): Promise<Job>
  updateJob(id: string, params: Partial<Pick<Job,
    'name' | 'customerId' | 'contactPerson' | 'discount' |
    'completionDate' | 'workAddress' | 'workArea' | 'dealStatus' | 'workGoogleMapUrl' |
    'outsourcerId' | 'outsourcerPayment'
  >>): Promise<void>
  deleteJob(id: string): Promise<void>
  getJob(id: string): Job | undefined
  getJobItems(jobId: string): JobItem[]
  addJobItem(jobId: string, params: Omit<JobItem, 'id' | 'jobId' | 'sortOrder'>): Promise<JobItem>
  updateJobItem(id: string, params: Partial<Omit<JobItem, 'id' | 'jobId'>>): Promise<void>
  removeJobItem(id: string): Promise<void>

  createDocument(jobId: string, params: {
    docType: DocumentType
    docNumber: string
    subject: string
    expireDate: string
    taxRate: TaxRate
    honorific: Honorific
    note: string
    taxiRemark?: string
    discount?: number
    sourceDocumentId?: string
    sourceItems?: Omit<DocumentItem, 'id' | 'documentId'>[]
  }): Promise<Document>
  finalizeDocument(id: string): Promise<void>
  deleteDocument(id: string): Promise<void>
  duplicateJob(id: string): Promise<Job | undefined>
  markJobPaid(id: string): Promise<void>
  getDocument(id: string): Document | undefined
  getDocumentsByJob(jobId: string): Document[]
  getDocumentItems(documentId: string): DocumentItem[]
  savePdf(documentId: string, blob: Blob): Promise<{ ok: boolean; error?: string }>

  addProduct(params: Omit<Product, 'id' | 'createdAt'>): Promise<Product>
  updateProduct(id: string, params: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<void>
  deleteProduct(id: string): Promise<void>

  updateSettings(settings: Omit<Partial<Settings>, 'profile'> & { profile?: Partial<Settings['profile']> }): Promise<void>
  resetAllData(): Promise<void>
}

// ── Store implementation ───────────────────────────────────────
export const useStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    customers: [],
    outsourcers: [],
    jobs: [],
    jobItems: [],
    documents: [],
    documentItems: [],
    products: [],
    settings: DEFAULT_SETTINGS,

    async hydrate() {
      const [customersRes, outsourcersRes, jobsRes, jobItemsRes, documentsRes, documentItemsRes, productsRes, settingsRes] =
        await Promise.all([
          supabase.from('customers').select('*'),
          supabase.from('outsourcers').select('*'),
          supabase.from('jobs').select('*'),
          supabase.from('job_items').select('*'),
          supabase.from('documents').select('*'),
          supabase.from('document_items').select('*'),
          supabase.from('products').select('*'),
          supabase.from('company_settings').select('*').eq('id', COMPANY_SETTINGS_ID).maybeSingle(),
        ])
      for (const res of [customersRes, outsourcersRes, jobsRes, jobItemsRes, documentsRes, documentItemsRes, productsRes, settingsRes]) {
        if (res.error) throw new Error(res.error.message)
      }
      set({
        customers: (customersRes.data ?? []).map(mapCustomer),
        outsourcers: (outsourcersRes.data ?? []).map(mapOutsourcer),
        jobs: (jobsRes.data ?? []).map(mapJob),
        jobItems: (jobItemsRes.data ?? []).map(mapJobItem),
        documents: (documentsRes.data ?? []).map(mapDocument),
        documentItems: (documentItemsRes.data ?? []).map(mapDocumentItem),
        products: (productsRes.data ?? []).map(mapProduct),
        settings: settingsRes.data ? mapSettings(settingsRes.data) : DEFAULT_SETTINGS,
      })
    },

    // ── Customers ──────────────────────────────────────────
    async createCustomer(params) {
      const row = unwrap(await supabase.from('customers').insert({
        name: params.name,
        kana: params.kana,
        tel: params.tel,
        address: params.address,
        email: params.email,
        google_map_url: params.googleMapUrl,
        notes: params.notes,
      }).select().single())
      const customer = mapCustomer(row)
      set(s => ({ customers: [...s.customers, customer] }))
      return customer
    },

    async updateCustomer(id, params) {
      const payload: Record<string, unknown> = {}
      if (params.name !== undefined) payload.name = params.name
      if (params.kana !== undefined) payload.kana = params.kana
      if (params.tel !== undefined) payload.tel = params.tel
      if (params.address !== undefined) payload.address = params.address
      if (params.email !== undefined) payload.email = params.email
      if (params.googleMapUrl !== undefined) payload.google_map_url = params.googleMapUrl
      if (params.notes !== undefined) payload.notes = params.notes
      const row = unwrap(await supabase.from('customers').update(payload).eq('id', id).select().single())
      const customer = mapCustomer(row)
      set(s => ({ customers: s.customers.map(c => (c.id === id ? customer : c)) }))
    },

    async deleteCustomer(id) {
      const { error } = await supabase.from('customers').delete().eq('id', id)
      if (error) {
        if (error.code === '23503') {
          return { ok: false, error: 'この顧客は案件で使用されているため削除できません' }
        }
        return { ok: false, error: error.message }
      }
      set(s => ({ customers: s.customers.filter(c => c.id !== id) }))
      return { ok: true }
    },

    getCustomer(id) { return get().customers.find(c => c.id === id) },

    // ── Outsourcers ────────────────────────────────────────
    async createOutsourcer({ name }) {
      const row = unwrap(await supabase.from('outsourcers').insert({ name }).select().single())
      const outsourcer = mapOutsourcer(row)
      set(s => ({ outsourcers: [...s.outsourcers, outsourcer] }))
      return outsourcer
    },

    getOutsourcer(id) { return get().outsourcers.find(o => o.id === id) },

    // ── Jobs ───────────────────────────────────────────────
    async createJob({ name, customerId, contactPerson, requestDate }) {
      const row = unwrap(await supabase.from('jobs').insert({
        name, customer_id: customerId, contact_person: contactPerson, status: 'active',
        request_date: requestDate || todayISO(),
      }).select().single())
      const job = mapJob(row)
      set(s => ({ jobs: [...s.jobs, job] }))
      return job
    },

    async updateJob(id, params) {
      const payload: Record<string, unknown> = {}
      if (params.name !== undefined) payload.name = params.name
      if (params.customerId !== undefined) payload.customer_id = params.customerId
      if (params.contactPerson !== undefined) payload.contact_person = params.contactPerson
      if (params.discount !== undefined) payload.discount = params.discount
      if (params.completionDate !== undefined) payload.completion_date = params.completionDate
      if (params.workAddress !== undefined) payload.work_address = params.workAddress
      if (params.workArea !== undefined) payload.work_area = params.workArea
      if (params.dealStatus !== undefined) payload.deal_status = params.dealStatus
      if (params.workGoogleMapUrl !== undefined) payload.work_google_map_url = params.workGoogleMapUrl
      if (params.outsourcerId !== undefined) payload.outsourcer_id = params.outsourcerId
      if (params.outsourcerPayment !== undefined) payload.outsourcer_payment = params.outsourcerPayment
      const row = unwrap(await supabase.from('jobs').update(payload).eq('id', id).select().single())
      const job = mapJob(row)
      set(s => ({ jobs: s.jobs.map(j => (j.id === id ? job : j)) }))
    },

    async deleteJob(id) {
      const docIds = get().documents.filter(d => d.jobId === id).map(d => d.id)
      const { error: docErr } = await supabase.from('documents').delete().eq('job_id', id)
      if (docErr) throw new Error(docErr.message)
      const { error: jobErr } = await supabase.from('jobs').delete().eq('id', id)
      if (jobErr) throw new Error(jobErr.message)
      set(s => ({
        jobs: s.jobs.filter(j => j.id !== id),
        jobItems: s.jobItems.filter(i => i.jobId !== id),
        documents: s.documents.filter(d => d.jobId !== id),
        documentItems: s.documentItems.filter(di => !docIds.includes(di.documentId)),
      }))
    },

    getJob(id) { return get().jobs.find(j => j.id === id) },

    getJobItems(jobId) {
      return get().jobItems
        .filter(i => i.jobId === jobId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    },

    async addJobItem(jobId, params) {
      const existing = get().jobItems.filter(i => i.jobId === jobId)
      const row = unwrap(await supabase.from('job_items').insert({
        job_id: jobId, sort_order: existing.length,
        name: params.name, price: params.price, qty: params.qty, unit: params.unit, note: params.note,
      }).select().single())
      const item = mapJobItem(row)
      set(s => ({ jobItems: [...s.jobItems, item] }))
      return item
    },

    async updateJobItem(id, params) {
      const payload: Record<string, unknown> = {}
      if (params.sortOrder !== undefined) payload.sort_order = params.sortOrder
      if (params.name !== undefined) payload.name = params.name
      if (params.price !== undefined) payload.price = params.price
      if (params.qty !== undefined) payload.qty = params.qty
      if (params.unit !== undefined) payload.unit = params.unit
      if (params.note !== undefined) payload.note = params.note
      const row = unwrap(await supabase.from('job_items').update(payload).eq('id', id).select().single())
      const item = mapJobItem(row)
      set(s => ({ jobItems: s.jobItems.map(i => (i.id === id ? item : i)) }))
    },

    async removeJobItem(id) {
      const { error } = await supabase.from('job_items').delete().eq('id', id)
      if (error) throw new Error(error.message)
      set(s => ({ jobItems: s.jobItems.filter(i => i.id !== id) }))
    },

    // ── Documents ──────────────────────────────────────────
    async createDocument(jobId, params) {
      const { docType, docNumber, sourceDocumentId, sourceItems, taxiRemark, discount, expireDate, subject, taxRate, honorific, note } = params
      const baseItems = sourceItems ?? get().getJobItems(jobId).map((ji, idx) => ({
        sortOrder: idx, name: ji.name, price: ji.price,
        qty: ji.qty, unit: ji.unit, note: ji.note,
      }))
      const docRow = unwrap(await supabase.from('documents').insert({
        job_id: jobId,
        doc_type: docType,
        doc_number: docNumber,
        source_document_id: sourceDocumentId ?? null,
        status: 'draft',
        issue_date: todayISO(),
        expire_date: expireDate || null,
        subject,
        tax_rate: taxRate,
        honorific,
        note,
        taxi_remark: taxiRemark ?? '',
        discount: discount ?? 0,
      }).select().single())
      const doc = mapDocument(docRow)

      let docItems: DocumentItem[] = []
      if (baseItems.length > 0) {
        const { data: itemRows, error: itemErr } = await supabase.from('document_items').insert(
          baseItems.map((item, idx) => ({
            document_id: doc.id, sort_order: idx,
            name: item.name, price: item.price, qty: item.qty, unit: item.unit, note: item.note,
          })),
        ).select()
        if (itemErr) throw new Error(itemErr.message)
        docItems = (itemRows ?? []).map(mapDocumentItem)
      }

      set(s => ({
        documents: [...s.documents, doc],
        documentItems: [...s.documentItems, ...docItems],
      }))

      if (docType === 'invoice') {
        const job = get().getJob(jobId)
        if (job && !job.completionDate) {
          get().updateJob(jobId, { completionDate: todayISO() }).catch(() => {})
        }
      }

      return doc
    },

    async finalizeDocument(id) {
      const row = unwrap(await supabase.from('documents').update({ status: 'finalized' }).eq('id', id).select().single())
      const doc = mapDocument(row)
      set(s => ({ documents: s.documents.map(d => (d.id === id ? doc : d)) }))
    },

    async deleteDocument(id) {
      const { error } = await supabase.from('documents').delete().eq('id', id)
      if (error) throw new Error(error.message)
      set(s => ({
        documents: s.documents.filter(d => d.id !== id),
        documentItems: s.documentItems.filter(di => di.documentId !== id),
      }))
    },

    async duplicateJob(id) {
      const job = get().getJob(id)
      if (!job) return undefined
      const items = get().getJobItems(id)
      const jobRow = unwrap(await supabase.from('jobs').insert({
        name: job.name, customer_id: job.customerId, contact_person: job.contactPerson,
        status: 'active', discount: job.discount ?? null,
      }).select().single())
      const newJob = mapJob(jobRow)

      let duplicatedItems: JobItem[] = []
      if (items.length > 0) {
        const { data: itemRows, error: itemErr } = await supabase.from('job_items').insert(
          items.map(item => ({
            job_id: newJob.id, sort_order: item.sortOrder,
            name: item.name, price: item.price, qty: item.qty, unit: item.unit, note: item.note,
          })),
        ).select()
        if (itemErr) throw new Error(itemErr.message)
        duplicatedItems = (itemRows ?? []).map(mapJobItem)
      }

      set(s => ({
        jobs: [...s.jobs, newJob],
        jobItems: [...s.jobItems, ...duplicatedItems],
      }))
      return newJob
    },

    async markJobPaid(id) {
      const row = unwrap(await supabase.from('jobs').update({
        status: 'archived', paid_at: todayISO(),
      }).eq('id', id).select().single())
      const job = mapJob(row)
      set(s => ({ jobs: s.jobs.map(j => (j.id === id ? job : j)) }))
    },

    getDocument(id) { return get().documents.find(d => d.id === id) },

    getDocumentsByJob(jobId) {
      return get().documents.filter(d => d.jobId === jobId)
    },

    getDocumentItems(documentId) {
      return get().documentItems
        .filter(di => di.documentId === documentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    },

    async savePdf(documentId, blob) {
      const result = await savePdfAsset(documentId, blob)
      if (!result.ok) return { ok: false, error: result.error }
      const row = unwrap(await supabase.from('documents').update({
        pdf_path: result.pdfPath, pdf_saved_at: result.savedAt,
      }).eq('id', documentId).select().single())
      const doc = mapDocument(row)
      set(s => ({ documents: s.documents.map(d => (d.id === documentId ? doc : d)) }))
      return { ok: true }
    },

    // ── Products ───────────────────────────────────────────
    async addProduct(params) {
      const row = unwrap(await supabase.from('products').insert({
        name: params.name, price: params.price, unit: params.unit, note: params.note,
      }).select().single())
      const product = mapProduct(row)
      set(s => ({ products: [...s.products, product] }))
      return product
    },

    async updateProduct(id, params) {
      const payload: Record<string, unknown> = {}
      if (params.name !== undefined) payload.name = params.name
      if (params.price !== undefined) payload.price = params.price
      if (params.unit !== undefined) payload.unit = params.unit
      if (params.note !== undefined) payload.note = params.note
      const row = unwrap(await supabase.from('products').update(payload).eq('id', id).select().single())
      const product = mapProduct(row)
      set(s => ({ products: s.products.map(p => (p.id === id ? product : p)) }))
    },

    async deleteProduct(id) {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw new Error(error.message)
      set(s => ({ products: s.products.filter(p => p.id !== id) }))
    },

    // ── Settings ───────────────────────────────────────────
    async updateSettings(settings) {
      const current = get().settings
      const profile = { ...current.profile, ...(settings.profile ?? {}) }
      const payload = {
        company_name: profile.companyName,
        postal_code: profile.postalCode,
        address: profile.address,
        tel: profile.tel,
        email: profile.email,
        invoice_number: profile.invoiceNumber,
        bank_name: profile.bankName,
        bank_branch: profile.bankBranch,
        bank_account_type: profile.bankAccountType,
        bank_account_number: profile.bankAccountNumber,
        bank_account_holder: profile.bankAccountHolder,
        seal_image_path: profile.sealImagePath,
        title_templates: settings.titleTemplates ?? current.titleTemplates,
        note_templates: settings.noteTemplates ?? current.noteTemplates,
      }
      const row = unwrap(await supabase.from('company_settings').update(payload).eq('id', COMPANY_SETTINGS_ID).select().single())
      set({ settings: mapSettings(row) })
    },

    async resetAllData() {
      await supabase.from('documents').delete().not('id', 'is', null)
      await supabase.from('jobs').delete().not('id', 'is', null)
      await supabase.from('products').delete().not('id', 'is', null)
      await supabase.from('customers').delete().not('id', 'is', null)
      await supabase.from('outsourcers').delete().not('id', 'is', null)
      const row = unwrap(await supabase.from('company_settings').update({
        company_name: '', postal_code: '', address: '', tel: '', email: '', invoice_number: '',
        bank_name: '', bank_branch: '', bank_account_type: '', bank_account_number: '', bank_account_holder: '',
        seal_image_path: null,
        title_templates: [], note_templates: [],
      }).eq('id', COMPANY_SETTINGS_ID).select().single())
      set({
        customers: [], outsourcers: [], jobs: [], jobItems: [], documents: [], documentItems: [], products: [],
        settings: mapSettings(row),
      })
    },
  })),
)

// ── 発行番号生成ヘルパー ───────────────────────────────────────
export async function getNextDocNo(type: DocumentType): Promise<string> {
  const year = new Date().getFullYear()
  const { data, error } = await supabase.rpc('next_doc_number', { p_doc_type: type, p_year: year })
  if (error) throw new Error(error.message)
  return formatDocNo(type, year, data as number)
}

/** docType に応じた詳細ページパスを返す */
export function docDetailPath(doc: { id: string; docType?: DocumentType }): string {
  const t = doc.docType ?? 'quote'
  if (t === 'invoice') return `/invoices/${doc.id}`
  if (t === 'receipt') return `/receipts/${doc.id}`
  return `/quotes/${doc.id}`
}
