# F1-004 - Feature Flag System

**Status**: 🔄 TODO  
**Priority**: P0 (Critical Path)  
**Estimation**: 3 hours  
**Risk**: 🟡 Medium (new system)  
**Dependencies**: None  

---

## Context

PRD Section 10 requires runtime feature flags for all Phase 1 optimizations to enable immediate rollback without deployment.

**Problem**: If an optimization causes issues in production, we need to disable it immediately without waiting for a new deploy.

**Solution**: Runtime feature flag system with localStorage persistence and dev-only admin panel.

---

## Requirements

### Functional Requirements

- [ ] Create `featureFlagStore` using Zustand
- [ ] Implement `get(flag, defaultValue)` method
- [ ] Implement `set(flag, value)` method
- [ ] Implement `reset()` method (restore defaults)
- [ ] Persist flags in localStorage
- [ ] Create dev-only admin panel for toggling flags
- [ ] Define default flags:
  - `auth-init-fix`: true
  - `oauth-preload`: true
  - `svg-wrapper`: true

### Non-Functional Requirements

- [ ] Feature detection: Work if localStorage unavailable
- [ ] Type-safe: TypeScript strict mode
- [ ] Zero dependencies on other stores
- [ ] Admin panel: Dev mode only (`process.env.NODE_ENV === 'development'`)

---

## Acceptance Criteria

- [ ] **AC1**: `get('nonexistent', true)` returns `true` (default value)
- [ ] **AC2**: `set('flag', false)` updates value and persists to localStorage
- [ ] **AC3**: `reset()` restores all defaults
- [ ] **AC4**: Admin panel toggles flags in dev mode
- [ ] **AC5**: Flags survive page refresh (localStorage)
- [ ] **AC6**: Works if localStorage disabled (in-memory fallback)

---

## Implementation

### Files to Create

```
apps/web/src/stores/featureFlagStore.ts          (NEW)
apps/web/src/stores/__tests__/featureFlagStore.test.ts  (NEW)
apps/web/src/lib/admin/featureFlagPanel.tsx     (NEW - dev only)
apps/web/src/stores/index.ts                    (UPDATE)
```

### Code Structure

```typescript
// stores/featureFlagStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface FeatureFlagState {
  flags: Record<string, boolean>;
  get: (flag: string, defaultValue?: boolean) => boolean;
  set: (flag: string, value: boolean) => void;
  reset: () => void;
}

const DEFAULT_FLAGS = {
  'auth-init-fix': true,
  'oauth-preload': true,
  'svg-wrapper': true,
};

export const useFeatureFlagStore = create<FeatureFlagState>()(
  persist(
    (set, get) => ({
      flags: DEFAULT_FLAGS,

      get: (flag: string, defaultValue = false) => {
        return get().flags[flag] ?? defaultValue;
      },

      set: (flag: string, value: boolean) => {
        set((state) => ({
          flags: { ...state.flags, [flag]: value },
        }));
      },

      reset: () => {
        set({ flags: DEFAULT_FLAGS });
      },
    }),
    {
      name: 'feature-flags',
      storage: createJSONStorage(() => localStorage),
      // Fallback to memory if localStorage unavailable
      partialize: (state) => ({ flags: state.flags }),
    }
  )
);
```

### Usage Pattern

```typescript
// In components
import { useFeatureFlagStore } from '@/stores';

function MyComponent() {
  const authInitFix = useFeatureFlagStore((s) => s.get('auth-init-fix', true));

  if (authInitFix) {
    // Use optimized path
    return <OptimizedVersion />;
  } else {
    // Use original path
    return <OriginalVersion />;
  }
}
```

### Admin Panel (Dev Only)

```typescript
// lib/admin/featureFlagPanel.tsx (dev only)
'use client';

import { useFeatureFlagStore } from '@/stores/featureFlagStore';

if (process.env.NODE_ENV === 'development') {
  export function FeatureFlagPanel() {
    const flags = useFeatureFlagStore((s) => s.flags);
    const setFlag = useFeatureFlagStore((s) => s.set);
    const reset = useFeatureFlagStore((s) => s.reset);

    return (
      <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg">
        <h3>Feature Flags (Dev Only)</h3>
        {Object.entries(flags).map(([key, value]) => (
          <label key={key} className="flex gap-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => setFlag(key, e.target.checked)}
            />
            <span>{key}</span>
          </label>
        ))}
        <button onClick={reset}>Reset All</button>
      </div>
    );
  }
}
```

---

## Testing

### Unit Tests

```typescript
describe('featureFlagStore', () => {
  it('should return default value for nonexistent flag', () => {
    const { get } = useFeatureFlagStore.getState();
    expect(get('nonexistent', true)).toBe(true);
  });

  it('should return false for nonexistent flag without default', () => {
    const { get } = useFeatureFlagStore.getState();
    expect(get('nonexistent')).toBe(false);
  });

  it('should set and persist flag', () => {
    const { get, set } = useFeatureFlagStore.getState();
    set('test-flag', true);
    expect(get('test-flag')).toBe(true);
  });

  it('should reset all flags to defaults', () => {
    const { get, set, reset } = useFeatureFlagStore.getState();
    set('auth-init-fix', false);
    reset();
    expect(get('auth-init-fix')).toBe(true);
  });

  it('should have correct defaults', () => {
    const { get } = useFeatureFlagStore.getState();
    expect(get('auth-init-fix')).toBe(true);
    expect(get('oauth-preload')).toBe(true);
    expect(get('svg-wrapper')).toBe(true);
  });
});
```

### Integration Tests

- [ ] Toggle flag in admin panel → verify behavior changes
- [ ] Persist flag → refresh → verify value maintained
- [ ] Reset flags → verify all return to defaults

---

## Definition of Done

- [ ] Code implements all requirements
- [ ] Unit tests passing (100%)
- [ ] Admin panel works in dev mode
- [ ] Admin panel does NOT render in production
- [ ] localStorage persistence working
- [ ] Fallback to memory if localStorage unavailable
- [ ] Code review approved
- [ ] Documentation updated

---

## Notes

- **Feature Flag Toggle Test**: Before completing this ticket, verify you can toggle a flag ON/OFF and see the behavior change
- **Admin Panel**: Add to `AuthProvider` or `layout.tsx` in dev mode only
- **Production Safety**: Admin panel MUST be production-safe (dev-only check)

---

**Estimated Completion**: Day 1, 12:00  
**Blocks**: F1-001 (authStore Flag)  
**Reviewer**: Dev B
