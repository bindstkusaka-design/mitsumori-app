-- mitsumori-app: 顧客のふりがな欄を追加（あいうえお順ソート用）

alter table customers add column kana text not null default '';
