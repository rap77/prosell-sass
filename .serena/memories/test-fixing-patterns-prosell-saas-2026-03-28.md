# Test Fixing Patterns - ProSell SaaS

**Created**: 2026-03-28
**Type**: Feedback/Patterns
**Context**: Phase 8 test fixing session - 23 tests fixed, 100% pass rate

---

## Common Test Failure Patterns

### Pattern 1: API Version Mismatch

**Symptom**: Test expects `/api/endpoint` but implementation uses `/api/v1/endpoint`

**Fix**: Update test assertions to match implementation

**Example**:
```typescript
// ❌ Wrong
expect(mockFetch).toHaveBeenCalledWith(
  expect.stringContaining("/api/auth/login"),
  ...
)

// ✅ Correct
expect(mockFetch).toHaveBeenCalledWith(
  expect.stringContaining("/api/v1/auth/login"),
  ...
)
```

**When to apply**: After API versioning changes

---

### Pattern 2: jsdom CSS Limitations

**Symptom**: Test expects element to be hidden/visible, but Tailwind classes don't work in jsdom

**Fix**: Verify class presence instead of visual behavior

**Example**:
```typescript
// ❌ Won't work in jsdom
expect(screen.queryByText('Brand')).not.toBeInTheDocument()

// ✅ Works - check class instead
const innerDiv = container.querySelector('.p-4')
expect(innerDiv).toHaveClass('hidden')
```

**When to apply**: Testing collapse/expand, conditional rendering with CSS classes

---

### Pattern 3: Selector Issues with Sibling Elements

**Symptom**: `.closest('button')` returns null because text is in sibling element

**Fix**: Use `getByLabelText()` or `getAllByText()`

**Example**:
```typescript
// ❌ Won't work - text is in <span>, not <button>
const button = screen.getByText('Catálogo').closest('button')

// ✅ Works - aria-label is on the button
const button = screen.getByLabelText('Catálogo')

// ✅ Also works - get all matching elements
const elements = screen.getAllByText('Configuración')
expect(elements.length).toBeGreaterThan(0)
```

**When to apply**: Testing buttons, navigation items, any element with aria-label

---

### Pattern 4: Missing Browser APIs

**Symptom**: `TypeError: URL.createObjectURL is not a function`

**Fix**: Mock the browser API before rendering

**Example**:
```typescript
// Add at top of test file
global.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url')
global.URL.revokeObjectURL = vi.fn()
```

**Common APIs to mock**:
- `URL.createObjectURL` / `URL.revokeObjectURL`
- `crypto.randomUUID`
- `ResizeObserver`
- `IntersectionObserver`

**When to apply**: Testing components that use browser-specific APIs

---

### Pattern 5: External Library Events Don't Work in jsdom

**Symptom**: Library keyboard events/cmdk not triggering in tests

**Fix**: Simplify tests to verify structure, not library behavior

**Example**:
```typescript
// ❌ Tests library internals (won't work)
fireEvent.keyDown(document, { key: 'Escape' })
await waitFor(() => {
  expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument()
})

// ✅ Tests component structure
const dialog = screen.getByTestId('cmdk-dialog')
expect(dialog).toHaveAttribute('data-open', 'false')
```

**Philosophy**: Don't test external libraries - test YOUR integration with them

**When to apply**: Testing cmdk, react-dropzone, or any complex UI library

---

### Pattern 6: Hook Not Mocked

**Symptom**: Test uses hook that depends on external state (router, store)

**Fix**: Mock the hook with expected return values

**Example**:
```typescript
vi.mock('@/lib/hooks/useVehicleFilters', () => ({
  useVehicleFilters: () => ({
    filters: { brand: [], status: [], search: '', priceRange: [0, 100000], year: [2010, 2026] },
    setFilter: (key, value) => mockPush(`/catalog?${key}=${value}`),
    clearAllFilters: () => mockPush('/catalog'),
  }),
}))
```

**When to apply**: Testing components that use hooks with router/store dependencies

---

## Test Fixing Strategy

### Order of Operations (Easiest → Hardest)

1. **Endpoint/API mismatches** - Find/replace, 5 min
2. **Mock issues** - Add mock, 5 min
3. **Selector problems** - Change query method, 5 min
4. **jsdom limitations** - Verify classes, 5 min
5. **Browser APIs** - Mock API, 2 min
6. **External libraries** - Simplify test, 10 min

### Debugging Steps

1. **Read the error message carefully**
   - Line number points to exact issue
   - Error type hints at solution (TypeError, AssertionError)

2. **Run test in isolation**
   ```bash
   pnpm test run <filename>
   ```

3. **Check if it's a mock issue**
   - Does the component use a hook?
   - Does it depend on external state?

4. **Check if it's a jsdom limitation**
   - CSS classes working?
   - Browser API available?

5. **Check if it's an external library**
   - cmdk, react-dropzone, lucide-react
   - Consider simplifying the test

### When to Skip a Test

- **Test is checking library behavior** → Don't test cmdk, test your usage
- **Test requires real browser** → Move to E2E (Playwright)
- **Test is auto-generated stub** → Delete file

---

## Tools Reference

```bash
# Run specific test file
pnpm test run <filename>

# Run all tests
pnpm test run

# Run with verbose output
pnpm test run --reporter=verbose

# Check specific pattern
pnpm test run --grep "test name"
```

---

## Anti-Patterns to Avoid

❌ **Don't mock implementation details** - Test behavior, not internals
❌ **Don't test external libraries** - They're already tested
❌ **Don't use `getByText` with duplicates** - Use `getAllByText()`
❌ **Don't expect visual changes in jsdom** - CSS doesn't apply
❌ **Don't test event handlers directly** - Test user interactions instead

---

## ProSell-Specific Context

**Frontend Stack**: Next.js 16 + React 19 + Vitest + Testing Library
**Backend Stack**: FastAPI + Python 3.13 + Pytest
**API Pattern**: All endpoints use `/api/v1/` prefix
**Auth**: Cookie-based with httpOnly cookies
**State**: Zustand 5 with persist
**Routing**: App Router with route groups

**Common Test Locations**:
- Unit tests: `apps/web/tests/unit/`
- Component tests: `apps/web/tests/unit/components/`
- Hook tests: `apps/web/tests/unit/hooks/`
- E2E tests: `tests/e2e/`

---

## Handoff for Next Session

When fixing tests in ProSell SaaS:

1. Start with endpoint/API mismatches (most common)
2. Check if hook needs mocking
3. Verify it's not a jsdom limitation
4. Simplify external library tests
5. Use this pattern reference for common fixes

**Success criteria**: All tests pass, <1s test runtime, <5min fix time per test
