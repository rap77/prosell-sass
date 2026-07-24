"use client"; // Required for useState and usePathname hooks

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { formatBreadcrumbLabel } from "@/lib/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  User,
  Settings,
  LogOut,
  Building2,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBreadcrumbStore } from "@/lib/stores/breadcrumbStore";
import { useLayoutStore } from "@/lib/stores/layoutStore";
import { TeamSwitcher } from "@/components/teams/TeamSwitcher";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { OrganizationPicker } from "@/components/admin/OrganizationPicker";

/**
 * Props for Header component.
 */
interface HeaderUser {
  name?: string;
  email?: string;
  role?: string;
  initials?: string;
}

interface HeaderOrganization {
  id?: string;
  name?: string;
}

interface HeaderProps {
  user?: HeaderUser;
  organization?: HeaderOrganization;
  /** Tenant ID for multi-tenancy */
  tenantId?: string;
}

type AuthUser = ReturnType<typeof useAuth>["user"];

function getInitials(
  firstName?: string | null,
  lastName?: string | null,
): string {
  if (firstName && lastName)
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.substring(0, 2).toUpperCase();
  return "??";
}

function resolveUserData(
  user: HeaderUser | undefined,
  authUser: AuthUser,
): HeaderUser {
  if (user) return user;
  if (!authUser) {
    return {
      name: "John Doe",
      email: "john.doe@example.com",
      role: "Seller",
      initials: "JD",
    };
  }

  const name =
    authUser.first_name && authUser.last_name
      ? `${authUser.first_name} ${authUser.last_name}`
      : authUser.email?.split("@")[0] || "User";

  return {
    name,
    email: authUser.email,
    role: authUser.role || "Seller",
    initials: getInitials(authUser.first_name, authUser.last_name),
  };
}

/**
 * Header component with global search, breadcrumbs, user menu, and org switcher.
 *
 * Features:
 * - Global search input (placeholder for Cmd+K CommandPalette in later plan)
 * - Breadcrumb navigation using Next.js usePathname
 * - User menu dropdown with visible role badge
 * - Org switcher placeholder (multi-brancheship in Phase 5)
 * - Logout functionality
 */
export function Header({ user, organization, tenantId }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user: authUser, isAdmin } = useAuth();
  const breadcrumbOverrides = useBreadcrumbStore((state) => state.labels);
  const toggleMobileDrawer = useLayoutStore(
    (state) => state.toggleMobileDrawer,
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Use real user data from auth context, fallback to placeholder
  const userData = resolveUserData(user, authUser);

  // TODO: Replace with real org data from user context
  const orgData = organization || {
    name: "ProSell Brancheship",
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  // Generate breadcrumbs from pathname. A detail page can register the real
  // entity name for its dynamic `[id]` segment via the breadcrumb store; we
  // prefer that override and fall back to the URL-only resolver (which turns
  // a raw UUID into the generic "Detalle" label).
  const breadcrumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((segment, index, array) => {
      const href = "/" + array.slice(0, index + 1).join("/");
      const label =
        breadcrumbOverrides[segment] ??
        formatBreadcrumbLabel(segment, pathname);
      return { label, href };
    });

  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className="flex h-16 items-center px-6 gap-4">
        {/* Sidebar collapse toggle - mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleMobileDrawer}
          aria-label="Toggle sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" x2="21" y1="6" y2="6" />
            <line x1="3" x2="21" y1="12" y2="12" />
            <line x1="3" x2="21" y1="18" y2="18" />
          </svg>
        </Button>

        {/* Breadcrumbs - hidden on mobile */}
        <nav className="hidden md:flex items-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Inicio
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              {index === breadcrumbs.length - 1 ? (
                <span className="font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Global search (placeholder for Cmd+K) */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              name="search"
              aria-label="Search"
              placeholder="Search... (Cmd+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Admins get the cross-organization OrganizationPicker (Subsystem D); everyone
            else keeps the single-org switcher placeholder. */}
        {isAdmin ? (
          <OrganizationPicker />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden md:inline">{orgData.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Organizations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Building2 className="mr-2 h-4 w-4" />
                <span>{orgData.name}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <span className="text-xs text-muted-foreground">
                  Multi-brancheship coming in Phase 5
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Team switcher */}
        {organization?.id && tenantId && (
          <TeamSwitcher organizationId={organization.id} tenantId={tenantId} />
        )}

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Locale switcher */}
        <LocaleSwitcher />

        {/* Notification bell */}
        <NotificationBell />

        {/* User menu with role badge */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="text-sm font-medium">{userData.initials}</span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{userData.name}</p>
                <p className="text-xs text-muted-foreground">{userData.role}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{userData.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {userData.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile breadcrumb subheader */}
      <div className="md:hidden border-t bg-muted/30 px-4 py-2">
        <nav className="flex items-center gap-2 text-xs overflow-x-auto">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            Inicio
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <div
              key={crumb.href}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              {index === breadcrumbs.length - 1 ? (
                <span className="font-medium text-foreground whitespace-nowrap">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}
