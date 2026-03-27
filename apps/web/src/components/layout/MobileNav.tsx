'use client' // Required for usePathname hook

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LayoutGrid, PlusCircle, Users, MoreHorizontal } from 'lucide-react'

/**
 * Mobile bottom navigation component following Thumb Zone pattern.
 *
 * Features:
 * - 4 critical icons: Catálogo, Publicar, Leads, Más
 * - Fixed position at bottom with 44x44px touch targets (Fitts's Law)
 * - Hidden on desktop (md:hidden)
 * - Active route highlighting
 * - Más opens drawer (placeholder for later implementation)
 *
 * Thumb Zone: Money-generating actions one thumb away for mobile users.
 */
export function MobileNav() {
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Catálogo',
      href: '/catalog',
      icon: LayoutGrid,
      active: pathname === '/catalog' || pathname.startsWith('/catalog/'),
    },
    {
      label: 'Publicar',
      href: '/publish',
      icon: PlusCircle,
      active: pathname === '/publish' || pathname.startsWith('/publish/'),
    },
    {
      label: 'Leads',
      href: '/leads',
      icon: Users,
      active: pathname === '/leads' || pathname.startsWith('/leads/'),
    },
    {
      label: 'Más',
      href: '/more',
      icon: MoreHorizontal,
      active: pathname === '/more' || pathname.startsWith('/more/'),
      // TODO: Implement drawer for Más action
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-background md:hidden">
      <div className="flex h-full items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-1"
            >
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-12 w-12 rounded-full transition-colors',
                  item.active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label={item.label}
                aria-current={item.active ? 'page' : undefined}
              >
                <Icon className="h-6 w-6" strokeWidth={2} />
              </Button>
              <span
                className={cn(
                  'text-xs font-medium',
                  item.active
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {item.label}
              </span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
