'use client'

import { useLayoutStore } from '@/lib/stores/layoutStore'
import { cn } from '@/lib/utils'

export function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useLayoutStore()

  return (
    <div
      className={cn(
        'flex flex-1 flex-col overflow-hidden transition-[margin] duration-300 ease-in-out',
        sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
      )}
    >
      {children}
    </div>
  )
}
