# 見積書作成アプリ

スマートフォン向けの見積書作成 Web アプリです。

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## 技術スタック

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (カスタムカラートークン)
- **Zustand** (状態管理 + LocalStorage永続化)
- **Lucide React** (アイコン)

## 機能

| 機能 | 説明 |
|---|---|
| 案件管理 | 案件の作成・編集・削除 |
| 明細編集 | 品名・単価・数量・単位・備考 |
| 商品マスタ | よく使う商品を登録、明細入力時にサジェスト |
| 見積書作成 | 件名・見積番号・有効期限・消費税率・備考 |
| 見積書確定 | draft → finalized へ遷移（確定後は変更不可） |
| 帳票プレビュー | 見積書の印刷プレビュー（ブラウザ印刷 → PDF保存） |
| PDF保存 | pdf-asset-service 経由で保存（模擬 / Supabase差し替え対応） |
| PDF一覧 | 保存済み PDF 一覧・欠損時の再生成導線 |
| 設定 | 発行者情報・件名テンプレート・備考テンプレート |

## データ保存

- フロントのみ動作モード: **LocalStorage** に保存
- Supabase 連携: `src/lib/pdf-asset-service.ts` と `src/app/api/pdf-assets/[...pdfPath]/route.ts` を修正

## pdf-asset-service について

引き継ぎ書の設計方針に従い、**PDF の保存・取得・存在確認の境界** を `src/lib/pdf-asset-service.ts` に集約しています。

- `pdfPath` を唯一の参照キーとして扱う
- UI は `pdfPath` の存在のみを見る
- 実ファイル取得方法はサービス側に隠蔽
- Supabase Storage への切り替えはこのファイルだけ修正

## Supabase 連携（将来）

1. `src/lib/pdf-asset-service.ts` の TODO を実装
2. `src/app/api/pdf-assets/[...pdfPath]/route.ts` の TODO を実装
3. `.env.local` に Supabase URL / Anon Key を設定

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```
