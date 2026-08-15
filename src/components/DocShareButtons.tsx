'use client'

import React, { useState } from 'react'
import { Download, Mail, Share2 } from 'lucide-react'
import { Button, showToast } from '@/components/ui'
import { generatePdfBlob } from '@/lib/generate-pdf'

interface DocShareButtonsProps {
  printRef: React.RefObject<HTMLDivElement>
  fileName: string   // 例: 御見積書_山口様_2026-04-08
  subject: string    // メール件名
  bodyText?: string  // メール本文
}

export default function DocShareButtons({ printRef, fileName, subject, bodyText }: DocShareButtonsProps) {
  const [generating, setGenerating] = useState(false)

  async function buildPdfBlob(): Promise<Blob> {
    if (!printRef.current) throw new Error('printRef未設定')
    return generatePdfBlob(printRef.current, fileName)
  }

  // ① ダウンロード
  async function handleDownload() {
    setGenerating(true)
    try {
      const blob = await buildPdfBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileName}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast('PDFをダウンロードしました', 'success')
    } catch (e) {
      showToast('PDF生成に失敗しました', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // ② LINE / その他（Web Share API → フォールバック）
  async function handleShare() {
    setGenerating(true)
    try {
      const blob = await buildPdfBlob()
      const file = new File([blob], `${fileName}.pdf`, { type: 'application/pdf' })

      // Web Share API でファイル共有（iOS/Android対応）
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: subject,
          text: bodyText ?? subject,
          files: [file],
        })
      } else if (navigator.share) {
        // ファイル非対応ブラウザ: URL共有にフォールバック
        await navigator.share({ title: subject, text: bodyText ?? subject })
      } else {
        // デスクトップ: LINEシェアURLを開く
        const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(subject)}`
        window.open(lineUrl, '_blank')
      }
    } catch (e: any) {
      // ユーザーがキャンセルした場合は無視
      if (e?.name !== 'AbortError') showToast('共有に失敗しました', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // ③ メール
  async function handleEmail() {
    setGenerating(true)
    try {
      const blob = await buildPdfBlob()
      // PDFをBlobURLでダウンロードしつつ、mailtoを開く
      // (ブラウザのセキュリティ制限でmailto添付は不可のため、先にDLしてもらう)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileName}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      const body = encodeURIComponent(
        (bodyText ?? subject) + '\n\n※ダウンロードしたPDFファイルをメールに添付してください。'
      )
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`
    } catch (e) {
      showToast('PDF生成に失敗しました', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const label = generating ? '生成中…' : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {/* ダウンロード */}
        <button
          onClick={handleDownload}
          disabled={generating}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '10px 4px', borderRadius: 10,
            border: '1.5px solid #1a6bb5', backgroundColor: generating ? '#e8eef8' : '#eef3fb',
            color: '#1a6bb5', fontSize: 11, fontWeight: 600, cursor: generating ? 'default' : 'pointer',
            minHeight: 60,
          }}
        >
          <Download size={18} />
          <span>{label ?? 'PDFを保存'}</span>
        </button>

        {/* LINE / シェア */}
        <button
          onClick={handleShare}
          disabled={generating}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '10px 4px', borderRadius: 10,
            border: '1.5px solid #06c755', backgroundColor: generating ? '#e8f5ee' : '#eefaf2',
            color: '#06a544', fontSize: 11, fontWeight: 600, cursor: generating ? 'default' : 'pointer',
            minHeight: 60,
          }}
        >
          {/* LINE ロゴ風アイコン */}
          <span style={{ fontSize: 20, lineHeight: 1 }}>💬</span>
          <span>{label ?? 'LINEで送る'}</span>
        </button>

        {/* メール */}
        <button
          onClick={handleEmail}
          disabled={generating}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '10px 4px', borderRadius: 10,
            border: '1.5px solid #ea4335', backgroundColor: generating ? '#fce8e6' : '#fef3f2',
            color: '#d33426', fontSize: 11, fontWeight: 600, cursor: generating ? 'default' : 'pointer',
            minHeight: 60,
          }}
        >
          <Mail size={18} />
          <span>{label ?? 'メールで送る'}</span>
        </button>
      </div>
      {generating && (
        <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 2 }}>
          PDFを生成しています…少々お待ちください
        </p>
      )}
    </div>
  )
}
