-- mitsumori-app: 顧客の備考欄を追加

alter table customers add column notes text not null default '';
