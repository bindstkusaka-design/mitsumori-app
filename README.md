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

## 受付フォーム（/reception）

電話受付スタッフが顧客情報（氏名・ふりがな・電話番号・住所・メール・GoogleマップURL・備考）
だけを登録・編集できる専用ページです。共通パスワード1つでCookie認証し（`middleware.ts`）、
`src/lib/store.ts`（jobs/documents等も扱う本体のストア）は一切importせず、
`src/lib/reception-customers.ts` 経由で `customers` テーブルにしか触れません。
ナビゲーションにリンクは出していないため、URLを知っている人だけがアクセスできます。

登録・更新のたびに、設定されていればGoogleスプレッドシートへの反映（`src/lib/google-sheets.ts`）と
管理者へのメール通知（`src/lib/reception-notify.ts`、Resend）を行います。どちらも未設定の場合は
警告を返すだけでスキップされ、顧客情報自体の保存は失敗しません。

必要な環境変数（`.env.local.example` 参照）:

| 変数 | 必須 | 用途 |
|---|---|---|
| `RECEPTION_PASSWORD` | 必須 | `/reception` の認証パスワード。未設定時は配下を全拒否 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | 任意 | Googleスプレッドシート連携用サービスアカウント |
| `GOOGLE_SHEET_ID` / `GOOGLE_SHEET_NAME` | 任意 | 反映先スプレッドシートとシート名 |
| `RESEND_API_KEY` / `NOTIFY_EMAIL_TO` / `NOTIFY_EMAIL_FROM` | 任意 | 登録完了メール通知（Resend） |

## 既存データのインポート

`data/sync.json`（移行前のローカルバックアップ）から Supabase へ一括インポートするスクリプトが `scripts/import-to-supabase.mjs` にあります。空の Supabase プロジェクトに対して一度だけ実行する想定です。

```bash
node scripts/import-to-supabase.mjs
```
