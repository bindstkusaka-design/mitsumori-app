import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  Job, JobItem, Document, DocumentItem,
  Product, Settings, TaxRate, Honorific,
} from '@/types'
import { genId, todayISO, expireISO, autoQuoteNo } from '@/lib/utils'
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

// ── Store interface ────────────────────────────────────────────
interface AppStore extends PersistedState {
  // ── Jobs ──
  createJob(params: Pick<Job, 'name' | 'client' | 'contactPerson'>): Job
  updateJob(id: string, params: Partial<Pick<Job, 'name' | 'client' | 'contactPerson'>>): void
  deleteJob(id: string): void
  getJob(id: string): Job | undefined
  getJobItems(jobId: string): JobItem[]

  // ── Job Items ──
  addJobItem(jobId: string, params: Omit<JobItem, 'id' | 'jobId' | 'sortOrder'>): JobItem
  updateJobItem(id: string, params: Partial<Omit<JobItem, 'id' | 'jobId'>>): void
  removeJobItem(id: string): void

  // ── Documents ──
  createDocument(jobId: string, params: {
    quoteNumber: string
    subject: string
    expireDate: string
    taxRate: TaxRate
    honorific: Honorific
    note: string
  }): Document
  finalizeDocument(id: string): void
  deleteDocument(id: string): void
  getDocument(id: string): Document | undefined
  getDocumentsByJob(jobId: string): Document[]
  getDocumentItems(documentId: string): DocumentItem[]

  // ── PDF ──
  savePdf(documentId: string): Promise<{ ok: boolean; error?: string }>

  // ── Products ──
  addProduct(params: Omit<Product, 'id' | 'createdAt'>): Product
  updateProduct(id: string, params: Partial<Omit<Product, 'id' | 'createdAt'>>): void
  deleteProduct(id: string): void

  // ── Settings ──
  updateSettings(settings: Partial<Settings>): void

  // ── Persist ──
  _persist(): void
  _hydrate(): void
}

// ── Store implementation ───────────────────────────────────────
export const useStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    ...loadStorage<PersistedState>(DEFAULT_PERSISTED),

    // ── Jobs ─────────────────────────────────────────────────
    createJob({ name, client, contactPerson }) {
      const job: Job = {
        id: genId(),
        name,
        client,
        contactPerson,
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
        documentItems: s.documentItems.filter(
          di => !docIds.includes(di.documentId),
        ),
      }))
      get()._persist()
    },

    getJob(id) {
      return get().jobs.find(j => j.id === id)
    },

    getJobItems(jobId) {
      return get().jobItems
        .filter(i => i.jobId === jobId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    },

    // ── Job Items ─────────────────────────────────────────────
    addJobItem(jobId, params) {
      const existing = get().jobItems.filter(i => i.jobId === jobId)
      const item: JobItem = {
        id: genId(),
        jobId,
        sortOrder: existing.length,
        ...params,
      }
      set(s => ({ jobItems: [...s.jobItems, item] }))
      get()._persist()
      return item
    },

    updateJobItem(id, params) {
      set(s => ({
        jobItems: s.jobItems.map(i => (i.id === id ? { ...i, ...params } : i)),
      }))
      get()._persist()
    },

    removeJobItem(id) {
      set(s => ({ jobItems: s.jobItems.filter(i => i.id !== id) }))
      get()._persist()
    },

    // ── Documents ─────────────────────────────────────────────
    createDocument(jobId, params) {
      const jobItems = get().getJobItems(jobId)
      const doc: Document = {
        id: genId(),
        jobId,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pdfPath: null,
        pdfSavedAt: null,
        issueDate: todayISO(),
        ...params,
      }
      // スナップショットとして document_items に複製
      const docItems: DocumentItem[] = jobItems.map((ji, idx) => ({
        id: genId(),
        documentId: doc.id,
        sortOrder: idx,
        name: ji.name,
        price: ji.price,
        qty: ji.qty,
        unit: ji.unit,
        note: ji.note,
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
          d.id === id
            ? { ...d, status: 'finalized', updatedAt: new Date().toISOString() }
            : d,
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

    getDocument(id) {
      return get().documents.find(d => d.id === id)
    },

    getDocumentsByJob(jobId) {
      return get().documents.filter(d => d.jobId === jobId)
    },

    getDocumentItems(documentId) {
      return get()
        .documentItems.filter(di => di.documentId === documentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    },

    // ── PDF ───────────────────────────────────────────────────
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

    // ── Products ──────────────────────────────────────────────
    addProduct(params) {
      const product: Product = {
        id: genId(),
        createdAt: new Date().toISOString(),
        ...params,
      }
      set(s => ({ products: [...s.products, product] }))
      get()._persist()
      return product
    },

    updateProduct(id, params) {
      set(s => ({
        products: s.products.map(p => (p.id === id ? { ...p, ...params } : p)),
      }))
      get()._persist()
    },

    deleteProduct(id) {
      set(s => ({ products: s.products.filter(p => p.id !== id) }))
      get()._persist()
    },

    // ── Settings ──────────────────────────────────────────────
    updateSettings(settings) {
      set(s => ({ settings: { ...s.settings, ...settings } }))
      get()._persist()
    },

    // ── Persistence ───────────────────────────────────────────
    _persist() {
      const { jobs, jobItems, documents, documentItems, products, settings } = get()
      saveStorage({ jobs, jobItems, documents, documentItems, products, settings })
    },

    _hydrate() {
      const data = loadStorage<PersistedState>(DEFAULT_PERSISTED)
      set(data)
    },
  })),
)

// 自動見積番号生成用ヘルパー（ストア外から使う）
export function getNextQuoteNo(): string {
  return autoQuoteNo(useStore.getState().documents.length)
}

