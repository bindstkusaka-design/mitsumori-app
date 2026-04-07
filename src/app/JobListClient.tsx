'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { fmtDate, fmtMoney, calcTotals } from '@/lib/utils'
import {
  Button, Badge, Card, Modal, FormGroup, Input,
  SectionHeader, EmptyState, ToastProvider, showToast,
} from '@/components/ui'
import TopNav from '@/components/layout/TopNav'
import BottomTab from '@/components/layout/BottomTab'

export default function JobListClient() {
  const { jobs, jobItems, documents, createJob } = useStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [contactPerson, setContactPerson] = useState('')

  function handleCreate() {
    if (!name.trim()) { showToast('案件名を入力してください', 'error'); return }
    createJob({ name: name.trim(), client: client.trim(), contactPerson: contactPerson.trim() })
    setOpen(false); setName(''); setClient(''); setContactPerson('')
    showToast('案件を作成しました', 'success')
  }

  const sorted = [...jobs].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <>
      <TopNav
        right={
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} /> 新規案件
          </Button>
        }
      />
      <main className="max-w-xl mx-auto px-4 pt-4 pb-tab">
        <SectionHeader
          title="案件一覧"
          sub={`${jobs.length}件`}
        />

        {sorted.length === 0 ? (
          <EmptyState
            icon="📋"
            title="案件がありません"
            description={'「新規案件」ボタンから\n最初の案件を作成しましょう'}
            action={
              <Button variant="primary" size="md" onClick={() => setOpen(true)}>
                <Plus size={14} /> 案件を作成
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {sorted.map(job => {
              const items = jobItems.filter(i => i.jobId === job.id)
              const { subtotal } = calcTotals(items, 0)
              const docs = documents.filter(d => d.jobId === job.id)
              const latestDoc = docs[docs.length - 1]
              return (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <Card clickable className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-semibold text-[15px] text-ink leading-snug flex-1">{job.name}</span>
                      {latestDoc ? (
                        <Badge variant={latestDoc.status === 'finalized' ? 'final' : 'draft'}>
                          {latestDoc.status === 'finalized' ? '確定済' : '下書き'}
                        </Badge>
                      ) : (
                        <Badge variant="draft">未作成</Badge>
                      )}
                    </div>
                    {job.client && (
                      <p className="text-xs text-ink-muted mb-2">👤 {job.client}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted">{fmtDate(job.createdAt)}</span>
                      <span className="font-bold text-accent">{fmtMoney(subtotal)}</span>
                    </div>
                    {docs.length > 0 && (
                      <p className="text-xs text-ink-muted mt-1.5">見積書 {docs.length}件</p>
                    )}
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <Modal open={open} onClose={() => setOpen(false)} title="新規案件を作成">
        <FormGroup label="案件名" required>
          <Input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="例: 〇〇株式会社 Webサイト制作"
            maxLength={80}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
        </FormGroup>
        <FormGroup label="顧客名">
          <Input value={client} onChange={e => setClient(e.target.value)} placeholder="例: 〇〇株式会社" />
        </FormGroup>
        <FormGroup label="担当者名">
          <Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="例: 山田 太郎 様" />
        </FormGroup>
        <div className="flex gap-2.5 mt-2">
          <Button variant="ghost" size="lg" onClick={() => setOpen(false)} className="flex-1">キャンセル</Button>
          <Button variant="primary" size="lg" onClick={handleCreate} className="flex-1">作成</Button>
        </div>
      </Modal>

      <ToastProvider />
      <BottomTab />
    </>
  )
}
