'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const { jobs, jobItems, documents, documentItems, createJob, duplicateJob } = useStore()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [contactPerson, setContactPerson] = useState('')

  function handleCreate() {
    if (!name.trim()) { showToast('案件名を入力してください', 'error'); return }
    createJob({ name: name.trim(), client: client.trim(), contactPerson: contactPerson.trim() })
    setOpen(false)
    setName('')
    setClient('')
    setContactPerson('')
    showToast('案件を作成しました', 'success')
  }

  const sorted = [...jobs].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const activeJobs = sorted.filter(job => job.status === 'active')
  const archivedJobs = sorted.filter(job => job.status === 'archived')

  const waitingPayments = activeJobs.filter(job =>
    documents.some(d => d.jobId === job.id && d.docType === 'invoice' && d.status === 'finalized')
  )

  const workingJobs = activeJobs.filter(job =>
    !documents.some(d => d.jobId === job.id && d.docType === 'invoice' && d.status === 'finalized')
  )

  function renderJobCard(job: typeof jobs[number]) {
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
  }

  function renderWaitingJobCard(job: typeof jobs[number]) {
    const invoice = documents
      .filter(d => d.jobId === job.id && d.docType === 'invoice' && d.status === 'finalized')
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
      .pop()

    const invoiceTotal = invoice
      ? calcTotals(documentItems.filter(item => item.documentId === invoice.id), invoice.taxRate).total
      : 0

    return (
      <Link key={job.id} href={`/jobs/${job.id}`}>
        <Card className="p-4" style={{ backgroundColor: '#ffe9ee', borderColor: '#f8c6cc' }}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-sm font-semibold text-red-700">入金待ち</p>
              <p className="font-semibold text-base text-ink mt-1">{job.name}</p>
            </div>
            <Badge variant="final">請求書発行済</Badge>
          </div>
          {job.client && (
            <p className="text-xs text-ink-muted mb-2">👤 {job.client}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">請求金額</span>
            <span className="text-sm font-semibold text-red-700">{fmtMoney(invoiceTotal)}</span>
          </div>
        </Card>
      </Link>
    )
  }

  function renderArchivedJobCard(job: typeof jobs[number]) {
    const invoice = documents
      .filter(d => d.jobId === job.id && d.docType === 'invoice' && d.status === 'finalized')
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
      .pop()

    const paidTotal = invoice
      ? calcTotals(documentItems.filter(item => item.documentId === invoice.id), invoice.taxRate).total
      : calcTotals(jobItems.filter(i => i.jobId === job.id), 0).subtotal

    return (
      <div key={job.id} className="space-y-2">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-semibold text-[15px] text-ink leading-snug">{job.name}</p>
              <p className="text-xs text-ink-muted mt-1">入金済み</p>
            </div>
            <Badge variant="final">終了</Badge>
          </div>
          {job.client && (
            <p className="text-xs text-ink-muted mb-2">👤 {job.client}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">{fmtDate(job.paidAt ?? job.updatedAt)}</span>
            <span className="font-bold text-accent">{fmtMoney(paidTotal)}</span>
          </div>
        </Card>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => handleCopyJob(job.id)}>
            📋 コピーして新規作成
          </Button>
        </div>
      </div>
    )
  }

  function handleCopyJob(jobId: string) {
    const newJob = duplicateJob(jobId)
    if (!newJob) return
    showToast('案件を複製しました', 'success')
    router.push(`/jobs/${newJob.id}`)
  }

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
          action={
            <div className="flex rounded-full border border-border overflow-hidden">
              <button
                type="button"
                className={`px-4 py-2 text-xs ${activeTab === 'active' ? 'bg-accent text-white' : 'bg-white text-ink-muted'}`}
                onClick={() => setActiveTab('active')}
              >
                進行中
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-xs ${activeTab === 'archived' ? 'bg-accent text-white' : 'bg-white text-ink-muted'}`}
                onClick={() => setActiveTab('archived')}
              >
                終了
              </button>
            </div>
          }
        />

        {jobs.length === 0 ? (
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
        ) : activeTab === 'active' ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-ink mb-3">入金待ち</p>
              {waitingPayments.length === 0 ? (
                <Card className="p-4 text-sm text-ink-muted">請求書を確定した案件はここに表示されます。</Card>
              ) : (
                <div className="space-y-3">
                  {waitingPayments.map(job => renderWaitingJobCard(job))}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink mb-3">作業中</p>
              {workingJobs.length === 0 ? (
                <Card className="p-4 text-sm text-ink-muted">請求書未発行の案件はこちらに表示されます。</Card>
              ) : (
                <div className="space-y-3">
                  {workingJobs.map(job => renderJobCard(job))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {archivedJobs.length === 0 ? (
              <Card className="p-4 text-sm text-ink-muted">終了した案件はここに表示されます。</Card>
            ) : (
              <div className="space-y-3">
                {archivedJobs.map(job => renderArchivedJobCard(job))}
              </div>
            )}
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
