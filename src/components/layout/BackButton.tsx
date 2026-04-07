'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { ChevronLeft } from 'lucide-react'

export default function BackButton({ href, label = '戻る' }: { href?: string; label?: string }) {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => (href ? router.push(href) : router.back())}
    >
      <ChevronLeft size={14} />
      {label}
    </Button>
  )
}
