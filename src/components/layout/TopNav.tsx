import React from 'react'
import { cn } from '@/lib/utils'

interface TopNavProps {
  title?: React.ReactNode
  left?: React.ReactNode
  right?: React.ReactNode
  className?: string
}

export default function TopNav({ title, left, right, className }: TopNavProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-white border-b border-border flex items-center h-14 px-4 gap-3',
        className,
      )}
    >
      {left && <div className="flex-shrink-0">{left}</div>}
      <div className="flex-1 min-w-0">
        {title ?? (
          <span className="font-serif text-base font-semibold text-accent tracking-widest">
            見積<span className="text-gold">書</span>
          </span>
        )}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </header>
  )
}
