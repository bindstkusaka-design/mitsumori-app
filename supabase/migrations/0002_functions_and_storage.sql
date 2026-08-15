-- mitsumori-app: 採番RPC関数 + Storageバケット/ポリシー

-- ---------------------------------------------------------------------------
-- 発行番号の原子的採番関数
-- doc_number_counters (doc_type, year) の last_number をアトミックに +1 して返す
-- ---------------------------------------------------------------------------
create or replace function next_doc_number(p_doc_type text, p_year int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number int;
begin
  insert into doc_number_counters (doc_type, year, last_number)
  values (p_doc_type, p_year, 1)
  on conflict (doc_type, year)
  do update set last_number = doc_number_counters.last_number + 1
  returning last_number into v_number;
  return v_number;
end;
$$;

grant execute on function next_doc_number(text, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage バケット
-- company-assets: 角印画像（公開読み取り可）
-- pdf-assets: PDF実体（将来実装用。現状は未使用）
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('pdf-assets', 'pdf-assets', true)
on conflict (id) do nothing;

-- 認証なし・単一テナント運用のため、anon キーからの全操作を許可
create policy "public read company-assets" on storage.objects
  for select using (bucket_id = 'company-assets');
create policy "public write company-assets" on storage.objects
  for insert with check (bucket_id = 'company-assets');
create policy "public update company-assets" on storage.objects
  for update using (bucket_id = 'company-assets');
create policy "public delete company-assets" on storage.objects
  for delete using (bucket_id = 'company-assets');

create policy "public read pdf-assets" on storage.objects
  for select using (bucket_id = 'pdf-assets');
create policy "public write pdf-assets" on storage.objects
  for insert with check (bucket_id = 'pdf-assets');
create policy "public update pdf-assets" on storage.objects
  for update using (bucket_id = 'pdf-assets');
create policy "public delete pdf-assets" on storage.objects
  for delete using (bucket_id = 'pdf-assets');
