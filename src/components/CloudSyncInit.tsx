'use client'

import React, { useEffect, useState } from 'react'
import { useStore, mergeWithDefaults } from '@/lib/store'
import { loadFromCloud, loadStorage } from '@/lib/storage'

interface PersistedState {
  jobs: unknown[]
  jobItems: unknown[]
  documents: unknown[]
  documentItems: unknown[]
  products: unknown[]
  settings: unknown
}

/**
 * アプリ起動時にクラウドからデータを読み込み、ストアに反映する。
 * 読み込み中はローディング画面を表示する。
 */
export default function CloudSyncInit({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // localStorage の既存データを fallback として渡す
    const localFallback = loadStorage<PersistedState | null>(null)

    loadFromCloud<PersistedState | null>(localFallback).then(data => {
      if (data) {
        // DEFAULT_SETTINGS とディープマージして欠損フィールドを補完してからストアに反映
        const merged = mergeWithDefaults(data as any)
        useStore.setState(merged)
      }
      setReady(true)
    })
  }, [])

  if (!ready) {
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
