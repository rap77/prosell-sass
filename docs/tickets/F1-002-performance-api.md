# F1-002 - Performance API Marks

**Status**: 🔄 TODO
**Priority**: P0 (Critical Path)
**Estimation**: 1 hour
**Risk**: 🟢 Low (additive only)
**Dependencies**: None

---

## Context

PRD Section 11 requires baseline measurements via Performance API to validate Phase 1 improvements.

**Problem**: We need objective, automated metrics to verify `initializeAuth()` performance improvements.

**Solution**: Add Performance API marks to measure `initializeAuth()` duration with feature detection for browser compatibility.

---

## Requirements

### Functional Requirements

- [ ] Add `performance.mark('auth-init-start')` before API call
- [ ] Add `performance.mark('auth-init-end')` after API response
- [ ] Add `performance.measure('auth-init-duration', 'auth-init-start', 'auth-init-end')`
- [ ] Feature detection wrapper (only call if `performance.mark` exists)
- [ ] Log duration in dev mode only (ms, 2 decimal places)
- [ ] No errors thrown in browsers without Performance API

### Non-Functional Requirements

- [ ] Zero performance impact in production (marks are lightweight)
- [ ] Graceful degradation if API missing
- [ ] Type-safe TypeScript
- [ ] No console logs in production

---

## Acceptance Criteria

- [ ] **AC1**: Marks created when Performance API supported
- [ ] **AC2**: Duration calculated correctly (end - start)
- [ ] **AC3**: No errors when Performance API unavailable
- [ ] **AC4**: Dev console shows duration in ms (e.g., "Auth init took 45.23ms")
- [ ] **AC5**: Production build has no console logs

---

## Implementation

### Files to Modify

```
apps/web/src/stores/authStore.ts                 (UPDATE)
apps/web/src/stores/__tests__/authStore.test.ts  (UPDATE)
```

### Code Changes

```typescript
// stores/authStore.ts - add to imports
import { logger } from "@/lib/logger";

// Feature detection wrapper for Performance API
const markPerformance = (name: string) => {
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(name);
  }
};

const measurePerformance = (
  name: string,
  startMark: string,
  endMark: string,
) => {
  if (typeof performance !== "undefined" && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);

      if (process.env.NODE_ENV === "development") {
        const measures = performance.getEntriesByName(name);
        const measure = measures[0];
        if (measure) {
          logger.debug(`${name} took ${measure.duration.toFixed(2)}ms`);
        }
      }
    } catch (error) {
      // Ignore errors from performance.measure
      logger.debug("Performance measure failed", error);
    }
  }
};

// In initializeAuth function:
initializeAuth: async () => {
  markPerformance("auth-init-start");

  try {
    // ... existing API call logic ...
  } finally {
    markPerformance("auth-init-end");
    measurePerformance(
      "auth-init-duration",
      "auth-init-start",
      "auth-init-end",
    );
  }
};
```

---

## Testing

### Unit Tests

```typescript
describe("authStore performance marks", () => {
  beforeEach(() => {
    // Mock performance API
    global.performance = {
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByName: vi.fn(() => [{ duration: 123.45 }]),
    } as unknown as Performance;
  });

  it("should create marks when Performance API available", async () => {
    const { initializeAuth } = useAuthStore.getState();
    await initializeAuth();

    expect(performance.mark).toHaveBeenCalledWith("auth-init-start");
    expect(performance.mark).toHaveBeenCalledWith("auth-init-end");
  });

  it("should measure duration", async () => {
    const { initializeAuth } = useAuthStore.getState();
    await initializeAuth();

    expect(performance.measure).toHaveBeenCalledWith(
      "auth-init-duration",
      "auth-init-start",
      "auth-init-end",
    );
  });

  it("should not throw when Performance API unavailable", async () => {
    // @ts-expect-error - testing without performance API
    delete global.performance;

    const { initializeAuth } = useAuthStore.getState();

    await expect(initializeAuth()).resolves.not.toThrow();
  });
});
```

### Manual Testing

- [ ] Open DevTools → Performance tab
- [ ] Trigger auth initialization
- [ ] Verify marks appear in timeline
- [ ] Verify duration logged in console (dev only)

---

## Definition of Done

- [ ] Code implements all requirements
- [ ] Unit tests passing (100%)
- [ ] Feature detection working
- [ ] No console logs in production
- [ ] Dev console shows duration
- [ ] Code review approved
- [ ] Manual verification in DevTools

---

## Performance Impact

**Estimated overhead**: <1ms per auth initialization
**Justification**: Marks are lightweight metadata; no measurable impact on user-facing performance

---

## Notes

- **Performance API Browser Support**: Chrome 25+, Firefox 15+, Safari 8+ (caniuse: 98.5%)
- **Alternative for older browsers**: Silent skip (no metrics, no errors)
- **DevTools Verification**: Open Performance tab → record auth flow → verify marks visible

---

**Estimated Completion**: Day 1, 12:00
**Blocks**: F1-003 (2FA Management Center)
**Reviewer**: Dev A
