-- mitsumori-app: localStorage -> Supabase migration
-- 初期スキーマ作成

create extension if not exists pgcrypto;

-- updated_at を自動更新する共通トリガー関数
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- 1. customers（顧客マスタ）
-- ---------------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tel text not null default '',
  address text not null default '',
  email text not null default '',
  google_map_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customers_set_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. outsourcers（外注先マスタ）
-- jobs.outsourcer が「選択」項目のため、customers と同様にマスタ化しました。
-- ---------------------------------------------------------------------------
create table outsourcers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger outsourcers_set_updated_at
  before update on outsourcers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. jobs（案件）
-- status: 既存の active/archived（アーカイブ状態）をそのまま踏襲
-- deal_status: 新規の商談進捗（商談中・受注済み・完了など）。値の追加余地を残すため CHECK 制約は付けていません
-- ---------------------------------------------------------------------------
create table jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  name text not null,
  contact_person text not null default '',
  status text not null default 'active' check (status in ('active', 'archived')),
  deal_status text,
  discount numeric,
  paid_at date,
  work_address text not null default '',
  work_area text not null default '',
  request_date date not null default current_date,
  completion_date date,
  outsourcer_id uuid references outsourcers(id),
  outsourcer_payment numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_customer_id_idx on jobs(customer_id);
create index jobs_outsourcer_id_idx on jobs(outsourcer_id);

create trigger jobs_set_updated_at
  before update on jobs
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. job_items（案件明細）
-- ---------------------------------------------------------------------------
create table job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  sort_order int not null default 0,
  name text not null default '',
  price numeric not null default 0,
  qty numeric not null default 0,
  unit text not null default '',
  note text not null default ''
);

create index job_items_job_id_idx on job_items(job_id);

-- ---------------------------------------------------------------------------
-- 5. products（商品マスタ）
-- ---------------------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  unit text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. documents（見積書・請求書・領収書）
-- ---------------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id),
  doc_type text not null check (doc_type in ('quote', 'invoice', 'receipt')),
  doc_number text not null unique,
  source_document_id uuid references documents(id),
  subject text not null default '',
  issue_date date not null,
  expire_date date,
  tax_rate numeric not null check (tax_rate in (0, 0.08, 0.10)),
  honorific text not null default '様' check (honorific in ('様', '御中')),
  note text not null default '',
  taxi_remark text not null default '',
  discount numeric,
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  pdf_path text,
  pdf_saved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_job_id_idx on documents(job_id);
create index documents_doc_type_idx on documents(doc_type);
create index documents_source_document_id_idx on documents(source_document_id);

create trigger documents_set_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. document_items（帳票明細スナップショット）
-- ---------------------------------------------------------------------------
create table document_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  sort_order int not null default 0,
  name text not null default '',
  price numeric not null default 0,
  qty numeric not null default 0,
  unit text not null default '',
  note text not null default ''
);

create index document_items_document_id_idx on document_items(document_id);

-- ---------------------------------------------------------------------------
-- 8. doc_number_counters（採番カウンター）
-- doc_type × year ごとに連番を管理し、年またぎリセット漏れ・欠番問題を解消
-- ---------------------------------------------------------------------------
create table doc_number_counters (
  doc_type text not null check (doc_type in ('quote', 'invoice', 'receipt')),
  year int not null,
  last_number int not null default 0,
  primary key (doc_type, year)
);

-- ---------------------------------------------------------------------------
-- 9. company_settings（会社情報・設定。運用上は1行のみ使用するシングルトン）
-- ---------------------------------------------------------------------------
create table company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default '',
  postal_code text not null default '',
  address text not null default '',
  tel text not null default '',
  email text not null default '',
  invoice_number text not null default '',
  bank_name text not null default '',
  bank_branch text not null default '',
  bank_account_type text not null default '',
  bank_account_number text not null default '',
  bank_account_holder text not null default '',
  seal_image_path text,
  title_templates jsonb not null default '[]'::jsonb,
  note_templates jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger company_settings_set_updated_at
  before update on company_settings
  for each row execute function set_updated_at();

-- シングルトン行を固定IDで1件だけ作成（アプリからは常にこのIDを参照）
insert into company_settings (id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- 現状ログイン機能なし・単一テナント運用のため、anon キーからの全操作を許可します。
-- 将来的にログイン機能を追加する場合は、各ポリシーを認証ユーザー単位に絞り込んでください。
-- ---------------------------------------------------------------------------
alter table customers enable row level security;
alter table outsourcers enable row level security;
alter table jobs enable row level security;
alter table job_items enable row level security;
alter table products enable row level security;
alter table documents enable row level security;
alter table document_items enable row level security;
alter table doc_number_counters enable row level security;
alter table company_settings enable row level security;

create policy "public access" on customers for all using (true) with check (true);
create policy "public access" on outsourcers for all using (true) with check (true);
create policy "public access" on jobs for all using (true) with check (true);
create policy "public access" on job_items for all using (true) with check (true);
create policy "public access" on products for all using (true) with check (true);
create policy "public access" on documents for all using (true) with check (true);
create policy "public access" on document_items for all using (true) with check (true);
create policy "public access" on doc_number_counters for all using (true) with check (true);
create policy "public access" on company_settings for all using (true) with check (true);
