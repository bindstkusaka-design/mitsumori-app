# 見積書作成アプリ

スマートフォン向けの見積書作成 Web アプリです。

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

`.env.local` に Supabase の URL / Anon Key が必要です（`.env.local.example` 参照）。

## 技術スタック

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (カスタムカラートークン)
- **Zustand** (状態管理)
- **Supabase** (Postgres + Storage)
- **Lucide React** (アイコン)

## 機能

| 機能 | 説明 |
|---|---|
| 顧客管理 | 顧客の作成・編集・削除 |
| 案件管理 | 案件の作成・編集・削除、顧客の選択 |
| 明細編集 | 品名・単価・数量・単位・備考 |
| 商品マスタ | よく使う商品を登録、明細入力時にサジェスト |
| 見積書作成 | 件名・発行番号（Supabase RPCで自動採番）・有効期限・消費税率・備考 |
| 見積書確定 | draft → finalized へ遷移（確定後は変更不可） |
| 帳票プレビュー | 見積書の印刷プレビュー（ブラウザ印刷 → PDF保存） |
| PDF保存 | html2pdf.js で生成した実PDFを Supabase Storage (pdf-assets) に保存 |
| PDF一覧 | 保存済み PDF 一覧・欠損時の再作成導線 |
| 設定 | 発行者情報・件名テンプレート・備考テンプレート・角印画像（Supabase Storage） |

## データ保存

すべてのデータ（顧客・案件・明細・書類・商品・設定）は Supabase の Postgres テーブルに保存されます。角印画像と保存済みPDFは Supabase Storage（`company-assets` / `pdf-assets` バケット）に保存されます。

スキーマは `supabase/migrations/` 配下の SQL で管理しています。

## pdf-asset-service について

**PDF の保存・取得・存在確認の境界** を `src/lib/pdf-asset-service.ts` に集約しています。

- `pdfPath` を唯一の参照キー（`bucket/objectPath` 形式）として扱う
- UI は `pdfPath` の存在のみを見る
- 実ファイルの取得・アップロード方法はサービス側に隠蔽

## 既存データのインポート

`data/sync.json`（移行前のローカルバックアップ）から Supabase へ一括インポートするスクリプトが `scripts/import-to-supabase.mjs` にあります。空の Supabase プロジェクトに対して一度だけ実行する想定です。

```bash
node scripts/import-to-supabase.mjs
```
