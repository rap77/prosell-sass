# Fix for AuthStore Hydration Issue

## Problem

The original authStore implementation used `zustand persist` middleware with localStorage, which caused hydration mismatches between server and client in Next.js. This led to:

- Flash of incorrect authentication state
- Client-side JavaScript errors during hydration
- Inconsistent UI state between server and client

## Solution Overview

Implemented a cookie-based authentication system with proper hydration handling:

### 1. Server Actions (`/src/app/actions/auth-actions.ts`)

- `setAuthCookies()` - Sets httpOnly cookies on the server
- `deleteAuthCookies()` - Clears auth cookies on the server
- Run exclusively on the server, preventing XSS attacks

### 2. API Route (`/src/app/api/auth/route.ts`)

- `GET /api/auth/state` - Returns current authentication state from cookies
- `DELETE /api/auth/state` - Clears authentication state
- Provides server-side auth state for client hydration

### 3. Updated AuthStore (`/src/stores/authStore.ts`)

- Removed `persist` middleware
- Added `initializeAuth()` action to fetch state from server
- Uses API route instead of localStorage for state persistence
- Maintains same API for components

### 4. Auth Initialization

- `useAuthInitializer` hook - Triggers server state fetch on mount
- `AuthProvider` component - Shows loading state during initialization
- Proper loading states prevent UI flickering

## Implementation Details

### Cookie Structure

```typescript
{
  ACCESS_TOKEN: "access_token",        // httpOnly, 15min
  REFRESH_TOKEN: "refresh_token",      // httpOnly, 7days
  USER_DATA: "user_data"              // client-readable, 7days
}
```

### Auth Flow

1. **Login**: API sets httpOnly cookies → Client updates store
2. **Initialization**: Fetch `/api/auth/state` → Sync server state with client
3. **Logout**: Clear cookies via API route → Client clears store
4. **Refresh**: Use refresh token cookie to get new access token

### Security Benefits

- ✅ No tokens in localStorage (prevents XSS)
- ✅ HttpOnly cookies (inaccessible to JavaScript)
- ✅ Proper SameSite configuration
- ✅ Secure flag in production
- ✅ Automatic token refresh via cookies

## Usage

### In Components

```tsx
import { useAuthStore } from "@/stores/authStore";

// Auth state is automatically initialized
const { user, isAuthenticated } = useAuthStore();

// Actions work the same way
const login = useAuthStore((state) => state.login);
```

### With Loading States

```tsx
import { useAuthInitializer } from "@/hooks/useAuthInitializer";

function MyComponent() {
  const isLoading = useAuthInitializer();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <ActualComponent />;
}
```

## Migration Notes

### Breaking Changes

1. **No more localStorage persistence** - State is cookie-based
2. **Initialization required** - Must use AuthProvider or initialize manually
3. **Server-only operations** - Cookie operations only work on server

### Backwards Compatibility

- All existing component APIs remain the same
- Actions (login, logout, register) work identically
- State structure unchanged

## Testing

### Unit Tests

```typescript
// Test authStore without localStorage
import { useAuthStore } from "@/stores/authStore";

// Initialize from mock server response
authStore.getState().initializeAuth();
```

### Integration Tests

```typescript
// Test cookie operations via API routes
await fetch("/api/auth/state");
await fetch("/api/auth/state", { method: "DELETE" });
```

## Future Improvements

1. **Middleware Integration** - Add auth checking to middleware
2. **Token Refresh Strategy** - Automatic token refresh before expiration
3. **Session Management** - Session timeout and renewal
4. **OAuth Integration** - Cookie-based OAuth flows

## Files Modified

### Created

- `/src/app/actions/auth-actions.ts` - Server actions for cookies
- `/src/app/api/auth/route.ts` - Auth state API route
- `/src/hooks/useAuthInitializer.ts` - Auth initialization hook
- `/src/components/providers/AuthProvider.tsx` - Auth provider component

### Modified

- `/src/stores/authStore.ts` - Updated to use server state
- `/src/app/layout.tsx` - Added AuthProvider
- `/src/lib/api/authApi.ts` - Added credentials: "include"

## Benefits Achieved

1. ✅ **Hydration Mismatch Fixed** - No more client-server state mismatch
2. ✅ **Improved Security** - HttpOnly cookies prevent XSS attacks
3. ✅ **Better UX** - Loading states prevent flickering
4. ✅ **Same API** - Components work without changes
5. ✅ **Future-Proof** - Ready for SSR/SSG optimizations
