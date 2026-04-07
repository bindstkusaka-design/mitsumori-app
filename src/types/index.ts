// ================================================================
// Domain Types
// ================================================================

export type JobStatus = 'active' | 'archived'
export type DocumentStatus = 'draft' | 'finalized'
export type TaxRate = 0 | 0.08 | 0.10
export type Honorific = '様' | '御中'

// ----------------------------------------------------------------
// Job (案件)
// ----------------------------------------------------------------
export interface Job {
  id: string
  name: string
  client: string
  contactPerson: string
  status: JobStatus
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------------
// JobItem (明細)
// ----------------------------------------------------------------
export interface JobItem {
  id: string
  jobId: string
  sortOrder: number
  name: string
  price: number
  qty: number
  unit: string
  note: string
}

// ----------------------------------------------------------------
// Product (商品マスタ)
// ----------------------------------------------------------------
export interface Product {
  id: string
  name: string
  price: number
  unit: string
  note: string
  createdAt: string
}

// ----------------------------------------------------------------
// Document (見積書)
// ----------------------------------------------------------------
export interface Document {
  id: string
  jobId: string
  quoteNumber: string
  subject: string
  issueDate: string
  expireDate: string
  taxRate: TaxRate
  honorific: Honorific
  note: string
  status: DocumentStatus
  createdAt: string
  updatedAt: string
  /** pdf-asset-service の唯一参照キー。"bucket/objectPath" 形式 */
  pdfPath: string | null
  pdfSavedAt: string | null
}

// ----------------------------------------------------------------
// DocumentItem (見積明細スナップショット)
// ----------------------------------------------------------------
export interface DocumentItem {
  id: string
  documentId: string
  sortOrder: number
  name: string
  price: number
  qty: number
  unit: string
  note: string
}

// ----------------------------------------------------------------
// Settings (発行者情報 + テンプレート)
// ----------------------------------------------------------------
export interface SettingsProfile {
  companyName: string
  postalCode: string
  address: string
  tel: string
  email: string
  bankInfo: string
  invoiceNumber: string  // インボイス登録番号
}

export interface Settings {
  profile: SettingsProfile
  titleTemplates: string[]
  noteTemplates: string[]
}

// ----------------------------------------------------------------
// Computed helpers
// ----------------------------------------------------------------
export interface QuoteTotals {
  subtotal: number
  tax: number
  total: number
}
