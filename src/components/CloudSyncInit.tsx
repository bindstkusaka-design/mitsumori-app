'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'

/**
 * アプリ起動時に Supabase からデータを読み込み、ストアに反映する。
 * 読み込み中はローディング画面、失敗時はエラー表示＋再試行ボタンを出す。
 *
 * /reception 配下は顧客情報以外に触れさせない受付専用ページのため、
 * ここで全テーブルを一括取得する hydrate() を意図的にスキップする。
 */
export default function CloudSyncInit({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isReception = pathname?.startsWith('/reception') ?? false
  const hydrate = useStore(s => s.hydrate)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (isReception) return
    setStatus('loading')
    hydrate()
      .then(() => setStatus('ready'))
      .catch(() => setStatus('error'))
  }, [hydrate, isReception])

  if (isReception) return <>{children}</>

  if (status === 'error') {
    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100dvh', gap: 12, backgroundColor: '#f8fafc', padding: 24, textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 14, color: '#e53935', margin: 0 }}>データの読み込みに失敗しました</p>
        <button
          onClick={() => {
            setStatus('loading')
            hydrate().then(() => setStatus('ready')).catch(() => setStatus('error'))
          }}
          style={{ padding: '10px 24px', background: '#1a6bb5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
        >
          再試行
        </button>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100dvh',
          gap: 12,
          backgroundColor: '#f8fafc',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid #e2e8f0',
            borderTopColor: '#1a6bb5',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>データを読み込み中…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return <>{children}</>
}
