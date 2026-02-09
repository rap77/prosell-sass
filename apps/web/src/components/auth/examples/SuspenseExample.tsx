/**
 * Suspense Boundary Example
 *
 * Demonstrates proper use of Suspense boundaries for streaming authentication content.
 * This pattern allows the page to render immediately while non-critical content loads.
 */

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { LoginForm } from "../LoginForm";
import { TwoFactorSetupSkeleton } from "../dynamic/TwoFactorSetupForm";

// ============================================
// DYNAMIC COMPONENTS
// ============================================

// Load components only when needed
const AuthBackground = dynamic(
  () => import("./AuthBackground"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800" />
    )
  }
);

const OAuthButtons = dynamic(
  () => import("../dynamic/OAuthButtons").then(mod => mod.OAuthButtons),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-3 w-full">
        <div className="h-12 bg-muted rounded-md animate-pulse" />
        <div className="h-12 bg-muted rounded-md animate-pulse" />
      </div>
    )
  }
);

const TermsAndPrivacy = dynamic(
  () => import("./TermsAndPrivacy"),
  {
    ssr: false,
    loading: () => (
      <div className="text-center text-sm text-slate-600 dark:text-slate-400">
        <div className="h-4 bg-muted rounded-lg animate-pulse w-64 mx-auto" />
      </div>
    )
  }
);

// ============================================
// MAIN COMPONENTS WITH SUSPENSE
// ============================================

/**
 * Login page with proper Suspense boundaries
 */
export function LoginPageWithSuspense() {
  return (
    <AuthBackground>
      <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo/Brand - Critical, no suspense needed */}
          <div className="text-center">
            <h1>ProSell</h1>
          </div>

          {/* Login Form - Suspense for form state */}
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginSection />
          </Suspense>

          {/* Footer - Non-critical, can load later */}
          <Suspense fallback={<div />}>
            <TermsAndPrivacy />
          </Suspense>
        </div>
      </div>
    </AuthBackground>
  );
}

/**
 * Login section with all form components
 */
function LoginSection() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
      {/* Email/Password Form - Critical */}
      <LoginForm />

      {/* Separator - Small element */}
      <div className="my-6">
        <Separator />
      </div>

      {/* OAuth Buttons - Non-critical, can load after form */}
      <div className="space-y-4">
        <h3 className="text-center text-sm text-muted-foreground">
          Or continue with
        </h3>
        <OAuthButtons />
      </div>
    </div>
  );
}

/**
 * Skeleton for loading state
 */
function LoginFormSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="h-10 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

// ============================================
// SHARED PROMISE PATTERN EXAMPLE
// ============================================

/**
 * Example showing how to share promises between components
 */
export function PromiseSharingExample() {
  // Create the promise once at the page level
  const authPromise = fetch("/api/auth/state");

  return (
    <div>
      <Suspense fallback={<div>Loading user...</div>}>
        <UserInfo authPromise={authPromise} />
      </Suspense>

      <Suspense fallback={<div>Loading preferences...</div>}>
        <UserPreferences authPromise={authPromise} />
      </Suspense>
    </div>
  );
}

function UserInfo({ authPromise }: { authPromise: Promise<Response> }) {
  const authState = use(authPromise);
  return <div>User: {authState.user?.name}</div>;
}

function UserPreferences({ authPromise }: { authPromise: Promise<Response> }) {
  const authState = use(authPromise);
  return <div>Preferences for {authState.user?.id}</div>;
}

// Utility to use promise in components (React 18)
function use<T>(promise: Promise<T>): T {
  throw promise;
}
