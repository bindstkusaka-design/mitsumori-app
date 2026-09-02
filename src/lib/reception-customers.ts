// 受付フォーム（/reception）専用のデータアクセス層。
// customers テーブルにしか触れない ── src/lib/store.ts（jobs/documents等も扱う）は
// 意図的にimportしない。これにより「受付フォームは顧客情報以外にアクセスできない」
// ことを依存関係のレベルでも保証する。

import { supabase, unwrap } from '@/lib/supabase'
import { mapCustomer } from '@/lib/mappers'
import type { Customer } from '@/types'

export type ReceptionCustomerInput = Pick<
  Customer,
  'name' | 'kana' | 'tel' | 'address' | 'email' | 'googleMapUrl' | 'notes'
>

export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from('customers').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapCustomer)
}

export async function createCustomer(params: ReceptionCustomerInput): Promise<Customer> {
  const row = unwrap(await supabase.from('customers').insert({
    name: params.name,
    kana: params.kana,
    tel: params.tel,
    address: params.address,
    email: params.email,
    google_map_url: params.googleMapUrl,
    notes: params.notes,
  }).select().single())
  return mapCustomer(row)
}

export async function updateCustomer(id: string, params: Partial<ReceptionCustomerInput>): Promise<Customer> {
  const payload: Record<string, unknown> = {}
  if (params.name !== undefined) payload.name = params.name
  if (params.kana !== undefined) payload.kana = params.kana
  if (params.tel !== undefined) payload.tel = params.tel
  if (params.address !== undefined) payload.address = params.address
  if (params.email !== undefined) payload.email = params.email
  if (params.googleMapUrl !== undefined) payload.google_map_url = params.googleMapUrl
  if (params.notes !== undefined) payload.notes = params.notes
  const row = unwrap(await supabase.from('customers').update(payload).eq('id', id).select().single())
  return mapCustomer(row)
}
