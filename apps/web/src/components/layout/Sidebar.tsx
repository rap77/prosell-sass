'use client'

import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/lib/stores/layoutStore'
import { useAuth } from '@/hooks/useAuth'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import Image from 'next/image'
import {
  LayoutDashboard,
  Package,
  FileText,
  TrendingUp,
  Users,
  BarChart3,
  Settings,
  ScrollText,
} from 'lucide-react'

/**
 * Navigation group types for role-based sidebar filtering.
 *
 * - 'general'       → top-level items (Dashboard), no group header shown
 * - 'inventario'    → catalog & publications
 * - 'ventas'        → sales execution (leads, pipeline, analytics)
 * - 'configuración' → admin/branch only
 */
export type NavGroup = 'general' | 'inventario' | 'ventas' | 'configuración'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  group: NavGroup
}

const navigationItems: NavItem[] = [
  // General — top-level (no section header)
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    group: 'general',
  },
  // Inventario group
  {
    label: 'Catálogo',
    href: '/catalog',
    icon: Package,
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
    href: '/vendedor/leads',
    icon: Users,
    group: 'ventas',
  },
  {
    label: 'Pipeline',
    href: '/pipeline',
    icon: TrendingUp,
    group: 'ventas',
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
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
        'fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
      style={{
        background: 'var(--ps-bg-sidebar)',
        borderRight: '1px solid var(--ps-border-subtle)',
      }}
    >
      <div className="flex h-full flex-col">
        {/* Logo + collapse toggle */}
        <div
          className={cn(
            'flex items-center border-b px-4',
            sidebarCollapsed ? 'h-16 justify-center' : 'h-16 justify-between'
          )}
          style={{ borderBottomColor: 'var(--ps-border-subtle)' }}
        >
          {!sidebarCollapsed && (
            <span
              className="flex items-center gap-2 text-[17px] font-bold tracking-tight"
              style={{ color: 'var(--ps-text-primary)' }}
            >
              <Image src="/logo-mark.png" alt="ProSell" width={271} height={294} style={{ height: 26, width: 'auto', flexShrink: 0 }} />
              ProSell
            </span>
          )}
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 transition-colors"
            style={{ color: 'var(--ps-text-secondary)' }}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ps-text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ps-text-secondary)')}
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className={cn('transition-transform duration-300', sidebarCollapsed ? 'rotate-180' : 'rotate-0')}
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
    general: '',            // top-level items — no visible header
    inventario: 'Inventario',
    ventas: 'Ventas',
    configuración: 'Configuración',
  }

  return (
    <nav className="flex-1 overflow-y-auto py-4" style={{ padding: '16px 8px' }} aria-label="Main navigation">
      {Object.entries(groupedItems).map(([group, groupItems], groupIdx) => (
        <div key={group}>
          {/* Group divider between sections (not before first) */}
          {groupIdx > 0 && (
            <div
              className="my-3"
              style={{ height: 1, background: 'var(--ps-border-subtle)', margin: '12px 8px' }}
            />
          )}

          {/* Group label (only when expanded and group has a label) */}
          {!collapsed && groupLabels[group as NavGroup] && (
            <span
              className="block mb-1 px-4 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--ps-text-disabled)' }}
            >
              {groupLabels[group as NavGroup]}
            </span>
          )}

          <ul style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {groupItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const Icon = item.icon

              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 text-sm font-medium transition-all duration-200',
                      collapsed ? 'justify-center px-2 py-2' : 'px-4 py-[10px]'
                    )}
                    style={{
                      borderRadius: isActive ? '8px 0 0 8px' : 8,
                      background: isActive ? 'var(--ps-nav-active-bg)' : 'transparent',
                      color: isActive ? 'var(--ps-text-primary)' : 'var(--ps-text-secondary)',
                      fontWeight: isActive ? 600 : 500,
                      borderRight: isActive ? '2px solid var(--ps-cyan)' : '2px solid transparent',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'var(--ps-hover-bg-xs)'
                        e.currentTarget.style.color = 'var(--ps-text-primary)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--ps-text-secondary)'
                      }
                    }}
                  >
                    <Icon
                      className="h-[18px] w-[18px] flex-shrink-0"
                      style={{ strokeWidth: 2, color: isActive ? 'var(--ps-cyan)' : 'inherit' }}
                    />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
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
    <div
      className="p-3"
      style={{ borderTop: '1px solid var(--ps-border-subtle)' }}
    >
      <div
        className={cn(
          'flex items-center gap-[10px] rounded-[10px] cursor-pointer transition-all',
          collapsed ? 'justify-center p-2' : 'p-3'
        )}
        style={{
          background: 'var(--ps-user-card-bg)',
          border: '1px solid var(--ps-border-subtle)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ps-border-medium)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ps-border-subtle)')}
      >
        {/* Avatar */}
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
          style={{
            background: 'linear-gradient(135deg, var(--ps-cyan), var(--ps-blue))',
            color: 'var(--ps-bg-base)',
            letterSpacing: '0.02em',
          }}
        >
          {initials}
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
              <b
                className="truncate text-[13px] font-semibold"
                style={{ color: 'var(--ps-text-primary)' }}
              >
                {displayName}
              </b>
              <span
                className="inline-flex self-start text-[10px] font-bold uppercase px-[7px] py-[2px] rounded-full tracking-[0.04em]"
                style={{
                  background: 'var(--ps-badge-bg)',
                  color: 'var(--ps-cyan)',
                }}
              >
                {role}
              </span>
            </div>
            <svg
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ color: 'var(--ps-text-secondary)', flexShrink: 0 }}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </>
        )}
      </div>
    </div>
  )
}
