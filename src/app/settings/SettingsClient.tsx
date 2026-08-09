'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Save, Plus, Trash2, AlertTriangle, Upload, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { loadSeal, saveSeal, deleteSeal } from '@/lib/seal-storage'
import {
  Button, Card, FormGroup, Input, Textarea, Divider,
  SectionHeader, ToastProvider, showToast,
} from '@/components/ui'
import TopNav from '@/components/layout/TopNav'
import BottomTab from '@/components/layout/BottomTab'

export default function SettingsClient() {
  const { settings, updateSettings, jobs, jobItems, documents, documentItems, products } = useStore()
  const p = settings.profile

  // 発行者フォーム
  const [company, setCompany] = useState(p.companyName)
  const [postal, setPostal] = useState(p.postalCode)
  const [address, setAddress] = useState(p.address)
  const [tel, setTel] = useState(p.tel)
  const [email, setEmail] = useState(p.email)
  const [bankInfo, setBankInfo] = useState(p.bankInfo)
  const [invoiceNo, setInvoiceNo] = useState(p.invoiceNumber)
  // 振込先（構造化）
  const [bankName, setBankName] = useState(p.bankName ?? 'ゆうちょ銀行')
  const [bankBranch, setBankBranch] = useState(p.bankBranch ?? '628')
  const [bankAccountType, setBankAccountType] = useState(p.bankAccountType ?? '普通預金')
  const [bankAccountNumber, setBankAccountNumber] = useState(p.bankAccountNumber ?? '1798772')
  const [bankAccountHolder, setBankAccountHolder] = useState(p.bankAccountHolder ?? 'クサカ\u3000トモアキ')

  // テンプレート
  const [titleTemplates, setTitleTemplates] = useState<string[]>(settings.titleTemplates)
  const [noteTemplates, setNoteTemplates] = useState<string[]>(settings.noteTemplates)

  // 角印
  const [sealDataUrl, setSealDataUrl] = useState<string | null>(null)
  const sealInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCompany(p.companyName); setPostal(p.postalCode); setAddress(p.address)
    setTel(p.tel); setEmail(p.email); setBankInfo(p.bankInfo); setInvoiceNo(p.invoiceNumber)
    setBankName(p.bankName ?? 'ゆうちょ銀行')
    setBankBranch(p.bankBranch ?? '628')
    setBankAccountType(p.bankAccountType ?? '普通預金')
    setBankAccountNumber(p.bankAccountNumber ?? '1798772')
    setBankAccountHolder(p.bankAccountHolder ?? 'クサカ\u3000トモアキ')
    setTitleTemplates(settings.titleTemplates)
    setNoteTemplates(settings.noteTemplates)
    setSealDataUrl(loadSeal())
  }, []) // eslint-disable-line

  function handleSealFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('画像ファイルを選択してください', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      saveSeal(dataUrl)
      setSealDataUrl(dataUrl)
      showToast('角印を保存しました', 'success')
    }
    reader.readAsDataURL(file)
    // 同じファイルを再選択できるようにリセット
    e.target.value = ''
  }

  function handleSealDelete() {
    if (!confirm('角印画像を削除しますか？')) return
    deleteSeal()
    setSealDataUrl(null)
    showToast('角印を削除しました')
  }

  function saveProfile() {
    updateSettings({
      profile: {
        companyName: company.trim(),
        postalCode: postal.trim(),
        address: address.trim(),
        tel: tel.trim(),
        email: email.trim(),
        bankInfo: bankInfo.trim(),
        invoiceNumber: invoiceNo.trim(),
        bankName: bankName.trim(),
        bankBranch: bankBranch.trim(),
        bankAccountType: bankAccountType.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountHolder: bankAccountHolder.trim(),
      },
      titleTemplates,
      noteTemplates,
    })
    showToast('設定を保存しました', 'success')
  }

  function resetAll() {
    if (!confirm('すべてのデータを削除しますか？\nこの操作は元に戻せません。')) return
    localStorage.clear()
    window.location.reload()
  }

  function createBackupData() {
    const data = {
      meta: {
        generatedAt: new Date().toISOString(),
        app: 'mitsumori-app',
        version: '1.0',
      },
      settings,
      jobs,
      jobItems,
      documents,
      documentItems,
      products,
    }
    return data
  }

  function downloadBackup() {
    const data = createBackupData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const today = new Date()
    const filename = `mitsumori-backup-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.json`
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('バックアップファイルをダウンロードしました', 'success')
  }

  return (
    <>
      <TopNav />
      <main className="max-w-xl mx-auto px-4 pt-4 pb-tab">
        <SectionHeader title="設定" sub="発行者情報・テンプレート管理" />

        {/* 発行者情報 */}
        <Card className="p-4 mb-4">
          <p className="font-bold text-sm mb-4">発行者情報</p>
          <FormGroup label="会社名 / 屋号 / 氏名">
            <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="例: 株式会社〇〇" />
          </FormGroup>
          <div className="grid grid-cols-2 gap-2.5">
            <FormGroup label="郵便番号">
              <Input value={postal} onChange={e => setPostal(e.target.value)} placeholder="000-0000" />
            </FormGroup>
            <FormGroup label="TEL">
              <Input value={tel} onChange={e => setTel(e.target.value)} placeholder="03-xxxx-xxxx" />
            </FormGroup>
          </div>
          <FormGroup label="住所">
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="東京都渋谷区…" />
          </FormGroup>
          <FormGroup label="メールアドレス">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="info@example.com" />
          </FormGroup>
          <FormGroup label="インボイス登録番号">
            <Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="T1234567890123" />
          </FormGroup>
        </Card>

        {/* 振込先情報（構造化） */}
        <Card className="p-4 mb-4">
          <p className="font-bold text-sm mb-4">振込先情報（請求書に自動表示）</p>
          <div className="grid grid-cols-2 gap-2.5">
            <FormGroup label="銀行名">
              <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="ゆうちょ銀行" />
            </FormGroup>
            <FormGroup label="店番">
              <Input value={bankBranch} onChange={e => setBankBranch(e.target.value)} placeholder="628" />
            </FormGroup>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <FormGroup label="口座種別">
              <Input value={bankAccountType} onChange={e => setBankAccountType(e.target.value)} placeholder="普通預金" />
            </FormGroup>
            <FormGroup label="口座番号">
              <Input value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} placeholder="1798772" />
            </FormGroup>
          </div>
          <FormGroup label="口座名義">
            <Input value={bankAccountHolder} onChange={e => setBankAccountHolder(e.target.value)} placeholder="クサカ　トモアキ" />
          </FormGroup>
          {(bankName || bankAccountNumber) && (
            <div className="mt-3 p-3 bg-surface-2 rounded text-xs text-ink-muted leading-relaxed">
              <p className="font-semibold text-ink-sub mb-1">プレビュー（請求書PDF）</p>
              {bankName && <p>{bankName}{bankBranch ? `\u3000\u3000店番：${bankBranch}` : ''}</p>}
              {bankAccountType && <p>{bankAccountType}{bankAccountNumber ? `\u3000\u3000口座番号：${bankAccountNumber}` : ''}</p>}
              {bankAccountHolder && <p>口座名義：{bankAccountHolder}</p>}
            </div>
          )}
        </Card>

        {/* 件名テンプレート */}
        <Card className="p-4 mb-4">
          <p className="font-bold text-sm mb-3">件名テンプレート</p>
          <div className="space-y-2">
            {titleTemplates.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={t}
                  onChange={e => {
                    const next = [...titleTemplates]; next[i] = e.target.value; setTitleTemplates(next)
                  }}
                  className="flex-1"
                />
                <button
                  onClick={() => setTitleTemplates(prev => prev.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 flex-shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost" size="sm"
            className="mt-3"
            onClick={() => setTitleTemplates(prev => [...prev, ''])}
          >
            <Plus size={13} /> テンプレートを追加
          </Button>
        </Card>

        {/* 備考テンプレート */}
        <Card className="p-4 mb-4">
          <p className="font-bold text-sm mb-3">備考テンプレート</p>
          <div className="space-y-2">
            {noteTemplates.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <Textarea
                  value={t}
                  rows={2}
                  onChange={e => {
                    const next = [...noteTemplates]; next[i] = e.target.value; setNoteTemplates(next)
                  }}
                  className="flex-1 min-h-[64px]"
                />
                <button
                  onClick={() => setNoteTemplates(prev => prev.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 flex-shrink-0 mt-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost" size="sm"
            className="mt-3"
            onClick={() => setNoteTemplates(prev => [...prev, ''])}
          >
            <Plus size={13} /> テンプレートを追加
          </Button>
        </Card>

        {/* 角印 */}
        <Card className="p-4 mb-4">
          <p className="font-bold text-sm mb-3">角印</p>
          <p className="text-xs text-ink-muted mb-3">
            帳票の右下に表示されます。PNG推奨（背景透過対応）
          </p>
          {sealDataUrl ? (
            <div className="flex items-center gap-4">
              <img
                src={sealDataUrl}
                alt="角印プレビュー"
                style={{ width: 80, height: 80, objectFit: 'contain', border: '1px solid #ddd9d0', borderRadius: 6 }}
              />
              <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm" onClick={() => sealInputRef.current?.click()}>
                  <Upload size={13} /> 変更
                </Button>
                <Button variant="danger" size="sm" onClick={handleSealDelete}>
                  <X size={13} /> 削除
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="md" onClick={() => sealInputRef.current?.click()}>
              <Upload size={14} /> 角印画像をアップロード
            </Button>
          )}
          <input
            ref={sealInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSealFile}
          />
        </Card>

        {/* 保存ボタン */}
        <Button variant="primary" size="lg" onClick={saveProfile} className="mb-6">
          <Save size={16} /> 設定を保存
        </Button>

        <Divider />

        {/* バックアップ */}
        <Card className="p-4 bg-slate-50 border-slate-200 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Save size={16} className="text-slate-700" />
            <p className="font-bold text-sm text-slate-900">データを書き出す</p>
          </div>
          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            localStorage に保存されている全データ（会社情報、案件、明細、書類、商品など）を JSON ファイルとしてダウンロードします。
          </p>
          <Button variant="primary" size="sm" onClick={downloadBackup}>
            JSON ファイルをダウンロード
          </Button>
          <p className="text-xs text-ink-muted mt-3">
            ダウンロードしたファイルは Google Drive などに保存してください。
          </p>
        </Card>

        {/* 危険ゾーン */}
        <Card className="p-4 bg-amber-50 border-amber-200 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <p className="font-bold text-sm text-amber-800">データ管理</p>
          </div>
          <p className="text-xs text-amber-700 mb-3">
            すべてのデータ（案件・商品・設定）を削除します。この操作は元に戻せません。
          </p>
          <Button variant="danger" size="sm" onClick={resetAll}>
            すべてのデータを削除
          </Button>
        </Card>
      </main>

      <ToastProvider />
      <BottomTab />
    </>
  )
}
