import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  Job, JobItem, Document, DocumentItem,
  Product, Settings, TaxRate, Honorific, DocumentType,
} from '@/types'
import { genId, todayISO, autoDocNo } from '@/lib/utils'
import { loadStorage, saveStorage } from '@/lib/storage'
import { savePdfAsset } from '@/lib/pdf-asset-service'

// ── Persisted state shape ──────────────────────────────────────
interface PersistedState {
  jobs: Job[]
  jobItems: JobItem[]
  documents: Document[]
  documentItems: DocumentItem[]
  products: Product[]
  settings: Settings
}

const DEFAULT_SETTINGS: Settings = {
  profile: {
    companyName: '',
    postalCode: '',
    address: '',
    tel: '',
    email: '',
    bankInfo: '',
    invoiceNumber: '',
    bankName: 'ゆうちょ銀行',
    bankBranch: '628',
    bankAccountType: '普通預金',
    bankAccountNumber: '1798772',
    bankAccountHolder: 'クサカ\u3000トモアキ',
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

const DEFAULT_PERSISTED: PersistedState = {
  jobs: [],
  jobItems: [],
  documents: [],
  documentItems: [],
  products: [],
  settings: DEFAULT_SETTINGS,
}

/**
 * 保存データを DEFAULT_SETTINGS とディープマージして返す。
 * 古いデータに銀行フィールドなどが存在しない場合でもデフォルト値が補完される。
 */
export function mergeWithDefaults(stored: Partial<PersistedState>): PersistedState {
  return {
    ...DEFAULT_PERSISTED,
    ...stored,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(stored.settings ?? {}),
      profile: {
        ...DEFAULT_SETTINGS.profile,
        ...(stored.settings?.profile ?? {}),
      },
    },
  }
}

// ── Store interface ────────────────────────────────────────────
interface AppStore extends PersistedState {
  createJob(params: Pick<Job, 'name' | 'client' | 'contactPerson'>): Job
  updateJob(id: string, params: Partial<Pick<Job, 'name' | 'client' | 'contactPerson' | 'discount'>>): void
  deleteJob(id: string): void
  getJob(id: string): Job | undefined
  getJobItems(jobId: string): JobItem[]
  addJobItem(jobId: string, params: Omit<JobItem, 'id' | 'jobId' | 'sortOrder'>): JobItem
  updateJobItem(id: string, params: Partial<Omit<JobItem, 'id' | 'jobId'>>): void
  removeJobItem(id: string): void
  createDocument(jobId: string, params: {
    docType: DocumentType
    quoteNumber: string
    subject: string
    expireDate: string
    taxRate: TaxRate
    honorific: Honorific
    note: string
    taxiRemark?: string
    discount?: number
    sourceItems?: Omit<DocumentItem, 'id' | 'documentId'>[]
  }): Document
  finalizeDocument(id: string): void
  deleteDocument(id: string): void
  duplicateJob(id: string): Job | undefined
  markJobPaid(id: string): void
  getDocument(id: string): Document | undefined
  getDocumentsByJob(jobId: string): Document[]
  getDocumentItems(documentId: string): DocumentItem[]
  savePdf(documentId: string): Promise<{ ok: boolean; error?: string }>
  addProduct(params: Omit<Product, 'id' | 'createdAt'>): Product
  updateProduct(id: string, params: Partial<Omit<Product, 'id' | 'createdAt'>>): void
  deleteProduct(id: string): void
  updateSettings(settings: Partial<Settings>): void
  _persist(): void
  _hydrate(): void
}

// ── Store implementation ───────────────────────────────────────
export const useStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    ...mergeWithDefaults(loadStorage<Partial<PersistedState>>({})),

    createJob({ name, client, contactPerson }) {
      const job: Job = {
        id: genId(), name, client, contactPerson,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      set(s => ({ jobs: [...s.jobs, job] }))
      get()._persist()
      return job
    },

    updateJob(id, params) {
      set(s => ({
        jobs: s.jobs.map(j =>
          j.id === id ? { ...j, ...params, updatedAt: new Date().toISOString() } : j,
        ),
      }))
      get()._persist()
    },

    deleteJob(id) {
      const docIds = get().documents.filter(d => d.jobId === id).map(d => d.id)
      set(s => ({
        jobs: s.jobs.filter(j => j.id !== id),
        jobItems: s.jobItems.filter(i => i.jobId !== id),
        documents: s.documents.filter(d => d.jobId !== id),
        documentItems: s.documentItems.filter(di => !docIds.includes(di.documentId)),
      }))
      get()._persist()
    },

    getJob(id) { return get().jobs.find(j => j.id === id) },

    getJobItems(jobId) {
      return get().jobItems
        .filter(i => i.jobId === jobId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    },

    addJobItem(jobId, params) {
      const existing = get().jobItems.filter(i => i.jobId === jobId)
      const item: JobItem = { id: genId(), jobId, sortOrder: existing.length, ...params }
      set(s => ({ jobItems: [...s.jobItems, item] }))
      get()._persist()
      return item
    },

    updateJobItem(id, params) {
      set(s => ({ jobItems: s.jobItems.map(i => (i.id === id ? { ...i, ...params } : i)) }))
      get()._persist()
    },

    removeJobItem(id) {
      set(s => ({ jobItems: s.jobItems.filter(i => i.id !== id) }))
      get()._persist()
    },

    createDocument(jobId, params) {
      const { docType, sourceItems, taxiRemark, discount, ...rest } = params
      const baseItems = sourceItems ?? get().getJobItems(jobId).map((ji, idx) => ({
        sortOrder: idx, name: ji.name, price: ji.price,
        qty: ji.qty, unit: ji.unit, note: ji.note,
      }))
      const doc: Document = {
        id: genId(), jobId, docType,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pdfPath: null, pdfSavedAt: null,
        issueDate: todayISO(),
        taxiRemark: taxiRemark ?? '',
        discount: discount ?? 0,
        ...rest,
      }
      const docItems: DocumentItem[] = baseItems.map((item, idx) => ({
        id: genId(), documentId: doc.id, sortOrder: idx,
        name: item.name, price: item.price, qty: item.qty,
        unit: item.unit, note: item.note,
      }))
      set(s => ({
        documents: [...s.documents, doc],
        documentItems: [...s.documentItems, ...docItems],
      }))
      get()._persist()
      return doc
    },

    finalizeDocument(id) {
      set(s => ({
        documents: s.documents.map(d =>
          d.id === id ? { ...d, status: 'finalized', updatedAt: new Date().toISOString() } : d,
        ),
      }))
      get()._persist()
    },

    duplicateJob(id) {
      const job = get().getJob(id)
      if (!job) return undefined
      const items = get().getJobItems(id)
      const newJob: Job = {
        id: genId(),
        name: job.name,
        client: job.client,
        contactPerson: job.contactPerson,
        status: 'active',
        discount: job.discount,
        paidAt: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const duplicatedItems = items.map(item => ({
        ...item,
        id: genId(),
        jobId: newJob.id,
      }))
      set(s => ({
        jobs: [...s.jobs, newJob],
        jobItems: [...s.jobItems, ...duplicatedItems],
      }))
      get()._persist()
      return newJob
    },

    markJobPaid(id) {
      set(s => ({
        jobs: s.jobs.map(j =>
          j.id === id ? { ...j, status: 'archived', paidAt: todayISO(), updatedAt: new Date().toISOString() } : j,
        ),
      }))
      get()._persist()
    },

    deleteDocument(id) {
      set(s => ({
        documents: s.documents.filter(d => d.id !== id),
        documentItems: s.documentItems.filter(di => di.documentId !== id),
      }))
      get()._persist()
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

    async savePdf(documentId) {
      const result = await savePdfAsset(documentId)
      if (!result.ok) return { ok: false, error: result.error }
      set(s => ({
        documents: s.documents.map(d =>
          d.id === documentId
            ? { ...d, pdfPath: result.pdfPath, pdfSavedAt: result.savedAt }
            : d,
        ),
      }))
      get()._persist()
      return { ok: true }
    },

    addProduct(params) {
      const product: Product = { id: genId(), createdAt: new Date().toISOString(), ...params }
      set(s => ({ products: [...s.products, product] }))
      get()._persist()
      return product
    },

    updateProduct(id, params) {
      set(s => ({ products: s.products.map(p => (p.id === id ? { ...p, ...params } : p)) }))
      get()._persist()
    },

    deleteProduct(id) {
      set(s => ({ products: s.products.filter(p => p.id !== id) }))
      get()._persist()
    },

    updateSettings(settings) {
      set(s => ({ settings: { ...s.settings, ...settings } }))
      get()._persist()
    },

    _persist() {
      const { jobs, jobItems, documents, documentItems, products, settings } = get()
      saveStorage({ jobs, jobItems, documents, documentItems, products, settings })
    },

    _hydrate() {
      const data = loadStorage<Partial<PersistedState>>({})
      set(mergeWithDefaults(data))
    },
  })),
)

// ── 発行番号生成ヘルパー ───────────────────────────────────────
export function getNextDocNo(type: DocumentType): string {
  const docs = useStore.getState().documents
  const count = docs.filter(d => (d.docType ?? 'quote') === type).length
  return autoDocNo(type, count)
}

/** 後方互換 */
export function getNextQuoteNo(): string {
  return getNextDocNo('quote')
}

/** docType に応じた詳細ページパスを返す */
export function docDetailPath(doc: { id: string; docType?: DocumentType }): string {
  const t = doc.docType ?? 'quote'
  if (t === 'invoice') return `/invoices/${doc.id}`
  if (t === 'receipt') return `/receipts/${doc.id}`
  return `/quotes/${doc.id}`
}
