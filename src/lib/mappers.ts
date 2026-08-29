// Supabase の snake_case な行データを、アプリ内で使う camelCase の型に変換する。

import type { Customer, Job, JobItem, Document, DocumentItem, Product, Settings, Outsourcer } from '@/types'

export function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    kana: row.kana ?? '',
    tel: row.tel ?? '',
    address: row.address ?? '',
    email: row.email ?? '',
    googleMapUrl: row.google_map_url ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapOutsourcer(row: any): Outsourcer {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapJob(row: any): Job {
  return {
    id: row.id,
    name: row.name,
    customerId: row.customer_id,
    contactPerson: row.contact_person ?? '',
    status: row.status,
    discount: row.discount ?? undefined,
    paidAt: row.paid_at ?? undefined,
    requestDate: row.request_date,
    completionDate: row.completion_date ?? null,
    workAddress: row.work_address ?? '',
    workArea: row.work_area ?? '',
    dealStatus: row.deal_status ?? null,
    workGoogleMapUrl: row.work_google_map_url ?? '',
    outsourcerId: row.outsourcer_id ?? null,
    outsourcerPayment: row.outsourcer_payment ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapJobItem(row: any): JobItem {
  return {
    id: row.id,
    jobId: row.job_id,
    sortOrder: row.sort_order,
    name: row.name,
    price: Number(row.price),
    qty: Number(row.qty),
    unit: row.unit ?? '',
    note: row.note ?? '',
  }
}

export function mapProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    unit: row.unit ?? '',
    note: row.note ?? '',
    createdAt: row.created_at,
  }
}

export function mapDocument(row: any): Document {
  return {
    id: row.id,
    jobId: row.job_id,
    docType: row.doc_type,
    docNumber: row.doc_number,
    sourceDocumentId: row.source_document_id ?? null,
    subject: row.subject ?? '',
    issueDate: row.issue_date,
    expireDate: row.expire_date ?? '',
    taxRate: row.tax_rate,
    honorific: row.honorific,
    note: row.note ?? '',
    taxiRemark: row.taxi_remark ?? '',
    discount: row.discount ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pdfPath: row.pdf_path ?? null,
    pdfSavedAt: row.pdf_saved_at ?? null,
  }
}

export function mapDocumentItem(row: any): DocumentItem {
  return {
    id: row.id,
    documentId: row.document_id,
    sortOrder: row.sort_order,
    name: row.name,
    price: Number(row.price),
    qty: Number(row.qty),
    unit: row.unit ?? '',
    note: row.note ?? '',
  }
}

export function mapSettings(row: any): Settings {
  return {
    profile: {
      companyName: row.company_name ?? '',
      postalCode: row.postal_code ?? '',
      address: row.address ?? '',
      tel: row.tel ?? '',
      email: row.email ?? '',
      invoiceNumber: row.invoice_number ?? '',
      bankName: row.bank_name ?? '',
      bankBranch: row.bank_branch ?? '',
      bankAccountType: row.bank_account_type ?? '',
      bankAccountNumber: row.bank_account_number ?? '',
      bankAccountHolder: row.bank_account_holder ?? '',
      sealImagePath: row.seal_image_path ?? null,
    },
    titleTemplates: row.title_templates ?? [],
    noteTemplates: row.note_templates ?? [],
  }
}

export const COMPANY_SETTINGS_ID = '00000000-0000-0000-0000-000000000001'
