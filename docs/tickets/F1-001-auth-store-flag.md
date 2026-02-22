# F1-001 - authStore `initialized` Flag

**Status**: 🔄 TODO
**Priority**: P0 (Critical Path)
**Estimation**: 2 hours
**Risk**: 🟡 Medium (touches core auth logic)
**Dependencies**: F1-004 (Feature Flags)

---

## Context

PRD F1 requires preventing duplicate `initializeAuth()` calls when multiple components mount.

**Current Behavior**: Every component using `useAuthInitializer` triggers a new API call to `/api/auth/state`.

**Problem**:

- Multiple unnecessary network requests
- Race conditions possible
- Wasted server resources

**Solution**: Add `initialized` flag to authStore with early exit logic.

---

## Requirements

### Functional Requirements

- [ ] Add `initialized: boolean` property to `AuthState`
- [ ] Initialize as `false` in default state
- [ ] Set to `true` after first successful `initializeAuth()` call
- [ ] Implement early exit: if `initialized === true`, skip API call
- [ ] Persist to localStorage (survives page refresh)
- [ ] Reset to `false` on logout
- [ ] Wrap in feature flag: `auth-init-fix`

### Non-Functional Requirements

- [ ] No breaking changes to existing API
- [ ] Early exit must log in dev mode (for debugging)
- [ ] localStorage fallback to memory if unavailable
- [ ] Type-safe TypeScript

---

## Acceptance Criteria

- [ ] **AC1**: First mount → calls `/api/auth/state` exactly 1 time
- [ ] **AC2**: Second mount → NO API call (early exit, log in dev)
- [ ] **AC3**: Page refresh → maintains `initialized = true`
- [ ] **AC4**: Logout → resets `initialized = false`
- [ ] **AC5**: Feature flag OFF → bypasses optimization (original behavior)
- [ ] **AC6**: E2E test: Network tab shows exactly 1 request

---

## Implementation

### Files to Modify

```
apps/web/src/stores/authStore.ts                 (UPDATE)
apps/web/src/stores/__tests__/authStore.test.ts  (UPDATE)
```

### Code Changes

```typescript
// stores/authStore.ts - update AuthState interface
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  initialized: boolean; // <-- NEW
  // ... rest of existing state
}

// Update default state
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      initialized: false, // <-- NEW

      // Initialize auth state from server
      initializeAuth: async () => {
        // Early exit if already initialized
        const { initialized } = get();

        // Feature flag check
        const useOptimization = featureFlags.get("auth-init-fix", true);
        if (!useOptimization) {
          // Original behavior: always call API
        } else if (initialized) {
          // Optimized behavior: early exit
          logger.debug("Auth already initialized, skipping API call");
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          markPerformance("auth-init-start");

          const response = await fetch("/api/auth/state", {
            credentials: "include",
          });
          const authState = await response.json();

          markPerformance("auth-init-end");
          measurePerformance(
            "auth-init-duration",
            "auth-init-start",
            "auth-init-end",
          );

          if (!authState.isAuthenticated || !authState.user) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              initialized: false, // <-- Set false if not auth
              error: null,
            });
            return;
          }

          set({
            user: authState.user,
            isAuthenticated: true,
            isLoading: false,
            initialized: true, // <-- Set true after success
            error: null,
          });
        } catch (error) {
          logger.error("Failed to initialize auth state", error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            initialized: false, // <-- Set false on error
            error: null,
          });
        }
      },

      // Update logout to reset flag
      logout: async () => {
        try {
          set({ isLoading: true, initialized: false }); // <-- Reset on logout

          await authApi.logout();

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            initialized: false, // <-- Confirm reset
            error: null,
          });

          // ... rest of logout logic
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            initialized: false, // <-- Confirm reset on error
            error: null,
          });
        }
      },

      // ... rest of existing actions
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user
          ? {
              id: state.user.id,
              email: state.user.email,
              first_name: state.user.first_name,
              last_name: state.user.last_name,
              is_email_verified: state.user.is_email_verified,
              is_2fa_enabled: state.user.is_2fa_enabled,
            }
          : null,
        isAuthenticated: state.isAuthenticated,
        initialized: state.initialized, // <-- Persist flag
      }),
      // ... rest of persist config
    },
  ),
);
```

---

## Testing

### Unit Tests

```typescript
describe("authStore initialized flag", () => {
  it("should initialize with initialized=false", () => {
    const { initialized } = useAuthStore.getState();
    expect(initialized).toBe(false);
  });

  it("should set initialized=true after successful init", async () => {
    const { initializeAuth, initialized } = useAuthStore.getState();

    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        isAuthenticated: true,
        user: { id: "123", email: "test@test.com" },
      }),
    });

    await initializeAuth();

    const { initialized: afterInit } = useAuthStore.getState();
    expect(afterInit).toBe(true);
  });

  it("should skip API call if already initialized", async () => {
    const { initializeAuth } = useAuthStore.getState();

    // Set initialized = true
    useAuthStore.setState({ initialized: true });

    await initializeAuth();

    // Verify fetch was NOT called
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should reset initialized=false on logout", async () => {
    const { logout } = useAuthStore.getState();

    useAuthStore.setState({ initialized: true });

    // Mock logout API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
    });

    await logout();

    const { initialized } = useAuthStore.getState();
    expect(initialized).toBe(false);
  });

  it("should persist initialized in localStorage", async () => {
    const { initializeAuth } = useAuthStore.getState();

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        isAuthenticated: true,
        user: { id: "123", email: "test@test.com" },
      }),
    });

    await initializeAuth();

    // Check localStorage was updated
    const stored = localStorage.getItem("auth-storage");
    expect(stored).toContain('"initialized":true');
  });
});
```

### E2E Tests

```typescript
// E2E test: Playwright
test("should call /api/auth/state exactly once", async ({ page }) => {
  // Track network requests
  const requests = [];

  page.on("request", (request) => {
    if (request.url().includes("/api/auth/state")) {
      requests.push(request);
    }
  });

  // Navigate to login page (triggers initializeAuth)
  await page.goto("/auth/login");

  // Wait for page load
  await page.waitForLoadState("networkidle");

  // Verify exactly ONE request
  expect(requests).toHaveLength(1);
});

test("should not call API on second mount", async ({ page }) => {
  let requestCount = 0;

  page.on("request", (request) => {
    if (request.url().includes("/api/auth/state")) {
      requestCount++;
    }
  });

  // First mount
  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");
  const firstCount = requestCount;

  // Navigate away and back
  await page.goto("/profile");
  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");

  // Should still be same count (no new requests)
  expect(requestCount).toBe(firstCount);
});
```

---

## Definition of Done

- [ ] Code implements all requirements
- [ ] Unit tests passing (100%)
- [ ] E2E test: Exactly 1 request to `/api/auth/state`
- [ ] E2E test: No new requests on subsequent mounts
- [ ] Flag persists in localStorage
- [ ] Logout resets flag to false
- [ ] Feature flag toggles optimization
- [ ] Code review approved
- [ ] No breaking changes

---

## Risk Mitigation

| Risk              | Mitigation                                      |
| ----------------- | ----------------------------------------------- |
| Flag desync       | Feature flag allows bypass to original behavior |
| localStorage full | Graceful degradation to memory-only             |
| Stale flag        | Reset on logout + API failure                   |

---

## Notes

- **Feature Flag**: `auth-init-fix` must be checked BEFORE early exit logic
- **Debug Logging**: Log early exit in dev mode only: `logger.debug('Auth already initialized, skipping')`
- **E2E Verification**: Use Network tab to count requests - should be exactly 1

---

**Estimated Completion**: Day 1, 16:00
**Blocks**: F1-003 (2FA Management Center)
**Reviewer**: Dev B
**Dependencies**: F1-004 MUST be complete
