'use client'

import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/lib/stores/layoutStore'
import { useAuth } from '@/hooks/useAuth'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  FileText,
  Users,
  Calendar,
  Settings,
  ScrollText,
} from 'lucide-react'

/**
 * Navigation group types for role-based sidebar filtering.
 * Using corrected user terminology from CONTEXT.md Brain #2:
 * - "inventario" (NOT "Operations")
 * - "ventas" (NOT "Growth")
 * - "configuración" (NOT "System")
 */
export type NavGroup = 'inventario' | 'ventas' | 'configuración'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  group: NavGroup
}

const navigationItems: NavItem[] = [
  // Inventario group
  {
    label: 'Catálogo',
    href: '/catalog',
    icon: LayoutGrid,
    group: 'inventario',
  },
  {
    label: 'Publicaciones',
    href: '/publications',
    icon: FileText,
    group: 'inventario',
  },
  // Ventas group
  {
    label: 'Leads',
    href: '/leads',
    icon: Users,
    group: 'ventas',
  },
  {
    label: 'Citas',
    href: '/appointments',
    icon: Calendar,
    group: 'ventas',
  },
  // Configuración group (admin/branch only)
  {
    label: 'Configuración',
    href: '/settings',
    icon: Settings,
    group: 'configuración',
  },
  {
    label: 'Logs',
    href: '/logs',
    icon: ScrollText,
    group: 'configuración',
  },
]

interface SidebarProps {
  /** Navigation groups to display based on user role */
  groups: NavGroup[]
}

/**
 * Collapsible sidebar navigation component using Compound Components pattern.
 *
 * Features:
 * - Context API for shared state (isOpen, toggle)
 * - Compound components: <Sidebar.Nav />, <Sidebar.Footer />
 * - Smooth transitions using opacity/transform only (CSS-01 anti-pattern)
 * - Role-based filtering via `groups` prop
 * - Active route highlighting
 */
export function Sidebar({ groups }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useLayoutStore()
  const pathname = usePathname()

  // Filter navigation items based on user role
  const visibleItems = navigationItems.filter((item) =>
    groups.includes(item.group)
  )

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo/Collapse Toggle */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!sidebarCollapsed && (
            <span className="text-lg font-bold">ProSell</span>
          )}
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 hover:bg-accent"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(
                'transition-transform duration-300',
                sidebarCollapsed ? 'rotate-180' : 'rotate-0'
              )}
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <Sidebar.Nav items={visibleItems} pathname={pathname} collapsed={sidebarCollapsed} />

        {/* Footer */}
        <Sidebar.Footer collapsed={sidebarCollapsed} />
      </div>
    </aside>
  )
}

/**
 * Sidebar navigation items with group labels.
 * Animate opacity/transform only (60fps) per CSS-01 anti-pattern.
 */
Sidebar.Nav = function SidebarNav({
  items,
  pathname,
  collapsed,
}: {
  items: NavItem[]
  pathname: string
  collapsed: boolean
}) {
  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = []
    }
    acc[item.group].push(item)
    return acc
  }, {} as Record<NavGroup, NavItem[]>)

  const groupLabels: Record<NavGroup, string> = {
    inventario: 'Inventario',
    ventas: 'Ventas',
    configuración: 'Configuración',
  }

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Main navigation">
      {Object.entries(groupedItems).map(([group, groupItems]) => {
        return (
          <div key={group} className="mb-6">
            {!collapsed && (
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
                {groupLabels[group as NavGroup]}
              </h3>
            )}
            <ul className="space-y-1">
              {groupItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const Icon = item.icon

                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

/**
 * Sidebar footer with user info and logout.
 */
Sidebar.Footer = function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth()

  // Helper function to get user initials
  const getInitials = (firstName?: string, lastName?: string): string => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase()
    }
    return '??'
  }

  const initials = getInitials(user?.first_name, user?.last_name)
  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.email?.split('@')[0] || 'User'
  const role = user?.role || 'Seller'

  return (
    <div className="border-t p-4">
      <div
        className={cn(
          'flex items-center gap-3 rounded-md p-2 hover:bg-accent',
          collapsed && 'justify-center'
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <span className="text-sm font-medium">{initials}</span>
        </div>
        {!collapsed && (
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{role}</p>
          </div>
        )}
      </div>
    </div>
  )
}
