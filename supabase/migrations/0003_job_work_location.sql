-- mitsumori-app: 案件の作業箇所Googleマップリンクを追加

alter table jobs add column work_google_map_url text not null default '';
