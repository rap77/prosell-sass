# F1-003 - 2FA Management Center

**Status**: 🔄 TODO
**Priority**: P0 (Critical Path)
**Estimation**: 4 hours
**Risk**: 🔴 High (UX changes, security critical)
**Dependencies**: F1-001, F1-002, F1-004

---

## Context

PRD F2-F3 requires refactoring 2FA setup from automatic-on-mount to a user-initiated management center with conditional behavior.

**Current Behavior**:

- `TwoFactorSetupForm` automatically calls `enable2FA()` on mount if `!is_2fa_enabled`
- No protection against navigation during operation
- TOTP secrets potentially exposed

**New Behavior**:

- **State A** (`!is_2fa_enabled`): Show "Enable 2FA" button → user clicks → API call → QR displays
- **State B** (`is_2fa_enabled`): Show "Protected" view + backup codes + disable button
- Navigation interruption protection with `beforeunload` warning
- Fresh fetch on return (never stale secrets)

---

## Requirements

### Functional Requirements

#### State A: Setup Flow (`!is_2fa_enabled`)

- [ ] Show "Enable 2FA" button with description
- [ ] On click → call `enable2FA()` API
- [ ] Show loading spinner during API call
- [ ] Display QR code after success
- [ ] Display backup codes (sorted)
- [ ] Input to enter 6-digit TOTP code
- [ ] Verify button to confirm setup
- [ ] `beforeunload` warning active during loading/verifying
- [ ] Error message with "Try Again" button on failure

#### State B: Protected View (`is_2fa_enabled`)

- [ ] Show "Protected" badge/checkmark
- [ ] Show current 2FA method (TOTP app)
- [ ] "View Backup Codes" button
- [ ] "Disable 2FA" button with confirmation
- [ ] NO `beforeunload` warning (view-only state)
- [ ] Confirmation modal before disabling

#### Navigation Interruption

- [ ] If `state === 'loading' | 'verifying'`: Show `beforeunload` warning
- [ ] Warning message: "You have an operation in progress. Are you sure you want to leave?"
- [ ] If user leaves: Operation cancelled, state reset
- [ ] On return: Fresh fetch (new secret generated)
- [ ] Secrets NEVER persist across navigation

### Security Requirements (NON-NEGOTIABLE)

- [ ] **NEVER** persist TOTP secret in `localStorage`
- [ ] **NEVER** persist TOTP secret in `sessionStorage`
- [ ] **NEVER** persist TOTP secret in component state (ephemeral only)
- [ ] **ONLY** store QR code URL in component state (ephemeral)
- [ ] Fresh fetch on every mount (no caching secrets)

### Non-Functional Requirements

- [ ] Backward compatible with existing 2FA flow
- [ ] All existing tests must still pass
- [ ] No visual changes to existing UI elements
- [ ] Feature flag: `auth-2fa-management` (default true)

---

## Acceptance Criteria

### State A Acceptance

- [ ] **AC1**: User without 2FA sees "Enable 2FA" button (no QR on mount)
- [ ] **AC2**: Click button → loading → QR code displays
- [ ] **AC3**: Verify code → success → update user state
- [ ] **AC4**: Error shows message + "Try Again" button

### State B Acceptance

- [ ] **AC5**: User with 2FA sees "Protected" state (no QR, no auto-enable)
- [ ] **AC6**: "View Backup Codes" shows existing codes
- [ ] **AC7**: "Disable 2FA" requires confirmation
- [ ] **AC8**: Disable success → update user state

### Navigation Acceptance

- [ ] **AC9**: Navigating during loading → beforeunload warning appears
- [ ] **AC10**: Leaving page → operation cancelled
- [ ] **AC11**: Returning → clean state, new fetch if clicking Enable again

### Security Acceptance

- [ ] **AC12**: Code review confirms NO secrets in storage
- [ ] **AC13**: Code review confirms fresh fetch on mount
- [ ] **AC14**: E2E test verifies secrets not in localStorage

---

## Implementation

### Files to Modify

```
apps/web/src/components/auth/TwoFactorSetupForm.tsx           (REFACTOR)
apps/web/src/components/auth/__tests__/TwoFactorSetupForm.test.tsx  (UPDATE)
```

### Type Definitions

```typescript
// Add to TwoFactorSetupForm.tsx

type SetupState =
  | "idle" // Not started
  | "enabling" // Calling enable2FA API
  | "setup_ready" // QR code received, ready to verify
  | "verifying" // Verifying TOTP code
  | "enabled" // Successfully enabled
  | "protected" // Already enabled (view-only)
  | "disabling" // Disabling 2FA
  | "disabled" // Successfully disabled
  | "error"; // Error state

interface FormState {
  state: SetupState;
  error: string | null;
  qrCode: string | null;
  backupCodes: string[];
  totpCode: string;
}
```

### Component Structure

```typescript
export function TwoFactorSetupForm({ is2FAEnabled }: Props) {
  const { updateUser } = useAuth();
  const router = useRouter();

  // Lazy state init - derive from prop
  const [formState, setFormState] = useState<FormState>(() => ({
    state: is2FAEnabled ? 'protected' : 'idle',
    error: null,
    qrCode: null,
    backupCodes: [],
    totpCode: '',
  }));

  // Update state when prop changes (external auth update)
  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      state: is2FAEnabled ? 'protected' : 'idle',
    }));
  }, [is2FAEnabled]);

  // beforeunload warning during operations
  useEffect(() => {
    if (formState.state === 'enabling' || formState.state === 'verifying' || formState.state === 'disabling') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires this
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [formState.state]);

  // Handlers
  async function handleEnable2FA() {
    setFormState((prev) => ({ ...prev, state: 'enabling', error: null }));

    try {
      const response = await authApi.enable2FA();  // Fresh fetch every time
      setFormState((prev) => ({
        ...prev,
        state: 'setup_ready',
        qrCode: response.qr_code,
        backupCodes: response.backup_codes,
      }));
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to enable 2FA');
      setFormState((prev) => ({
        ...prev,
        state: 'error',
        error: message,
      }));
    }
  }

  async function handleVerifyCode() {
    if (!TOTP_REGEX.test(formState.totpCode)) {
      setFormState((prev) => ({
        ...prev,
        error: 'Invalid 2FA code format',
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, state: 'verifying', error: null }));

    try {
      await authApi.verify2FA(formState.totpCode);
      updateUser({ is_2fa_enabled: true });
      setFormState((prev) => ({
        ...prev,
        state: 'enabled',
        error: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to verify code');
      setFormState((prev) => ({
        ...prev,
        state: 'setup_ready',  // Back to ready state
        error: message,
      }));
    }
  }

  async function handleDisable2FA() {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    setFormState((prev) => ({ ...prev, state: 'disabling', error: null }));

    try {
      await authApi.disable2FA();
      updateUser({ is_2fa_enabled: false });
      setFormState((prev) => ({
        ...prev,
        state: 'disabled',
        error: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to disable 2FA');
      setFormState((prev) => ({
        ...prev,
        state: 'protected',  // Back to protected state
        error: message,
      }));
    }
  }

  // Render based on state
  return (
    <div>
      {/* State A: Not Enabled */}
      {formState.state === 'idle' && (
        <div>
          <h2>Set Up Two-Factor Authentication</h2>
          <p>Protect your account with an authenticator app</p>
          <Button onClick={handleEnable2FA}>Enable 2FA</Button>
        </div>
      )}

      {formState.state === 'enabling' && (
        <LoadingSpinner message="Generating QR code..." />
      )}

      {formState.state === 'setup_ready' && (
        <SetupQRCode
          qrCode={formState.qrCode!}
          backupCodes={formState.backupCodes}
          totpCode={formState.totpCode}
          onCodeChange={(code) => setFormState((prev) => ({ ...prev, totpCode: code }))}
          onVerify={handleVerifyCode}
          error={formState.error}
        />
      )}

      {formState.state === 'verifying' && (
        <LoadingSpinner message="Verifying code..." />
      )}

      {/* State B: Already Enabled */}
      {formState.state === 'protected' && (
        <ProtectedState
          onDisable={handleDisable2FA}
          backupCodesCount={10}  // From API
        />
      )}

      {/* Success/Error States */}
      {formState.state === 'enabled' && (
        <SuccessMessage onClose={() => router.push('/profile')} />
      )}

      {formState.state === 'disabled' && (
        <SuccessMessage onClose={() => router.push('/profile')} />
      )}

      {formState.state === 'error' && (
        <ErrorMessage error={formState.error} onRetry={handleEnable2FA} />
      )}
    </div>
  );
}
```

---

## Testing

### Unit Tests

```typescript
describe('TwoFactorSetupForm - State A (Setup)', () => {
  it('should show Enable button when not enabled', () => {
    render(<TwoFactorSetupForm is2FAEnabled={false} />);
    expect(screen.getByText('Enable 2FA')).toBeInTheDocument();
  });

  it('should NOT call API on mount', () => {
    const enable2FASpy = vi.spyOn(authApi, 'enable2FA');
    render(<TwoFactorSetupForm is2FAEnabled={false} />);
    expect(enable2FASpy).not.toHaveBeenCalled();
  });

  it('should call API when Enable clicked', async () => {
    const enable2FASpy = vi.spyOn(authApi, 'enable2FA').mockResolvedValue({
      qr_code: 'otpauth://...',
      backup_codes: ['abc', 'def'],
    });

    render(<TwoFactorSetupForm is2FAEnabled={false} />);
    fireEvent.click(screen.getByText('Enable 2FA'));

    await waitFor(() => {
      expect(enable2FASpy).toHaveBeenCalled();
    });
  });
});

describe('TwoFactorSetupForm - State B (Protected)', () => {
  it('should show Protected state when enabled', () => {
    render(<TwoFactorSetupForm is2FAEnabled={true} />);
    expect(screen.getByText(/Protected/)).toBeInTheDocument();
  });

  it('should NOT show Enable button when already enabled', () => {
    render(<TwoFactorSetupForm is2FAEnabled={true} />);
    expect(screen.queryByText('Enable 2FA')).not.toBeInTheDocument();
  });
});

describe('TwoFactorSetupForm - Navigation', () => {
  it('should add beforeunload listener during operations', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    const { rerender } = render(<TwoFactorSetupForm is2FAEnabled={false} />);
    fireEvent.click(screen.getByText('Enable 2FA'));

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('should remove listener when idle', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<TwoFactorSetupForm is2FAEnabled={false} />);
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function);
  });
});

describe('TwoFactorSetupForm - Security', () => {
  it('should NOT persist QR code in localStorage', () => {
    const localStorageSetSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(<TwoFactorSetupForm is2FAEnabled={false} />);
    fireEvent.click(screen.getByText('Enable 2FA'));

    // Wait for API response
    await waitFor(() => {
      expect(localStorageSetSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('qr'),
        expect.anything()
      );
    });
  });
});
```

### E2E Tests

```typescript
test("2FA setup flow - State A", async ({ page }) => {
  // Login as user without 2FA
  await page.goto("/auth/setup-2fa");

  // Should see Enable button
  await expect(page.getByText("Enable 2FA")).toBeVisible();

  // Click Enable
  await page.getByText("Enable 2FA").click();

  // Should see loading
  await expect(page.getByText("Generating QR code")).toBeVisible();

  // Should show QR code after loading
  await expect(page.locator('img[alt*="QR"]')).toBeVisible();

  // Verify backup codes shown
  await expect(page.getByText("Backup Codes")).toBeVisible();

  // Enter code and verify
  await page.fill('input[name="totp"]', "123456");
  await page.getByText("Verify and Enable").click();

  // Should show success
  await expect(
    page.getByText("Two-Factor Authentication Enabled"),
  ).toBeVisible();
});

test("2FA protected view - State B", async ({ page }) => {
  // Login as user WITH 2FA
  await page.goto("/auth/setup-2fa");

  // Should see Protected state
  await expect(page.getByText(/Protected/)).toBeVisible();

  // Should NOT see Enable button
  await expect(page.getByText("Enable 2FA")).not.toBeVisible();

  // Should see Disable button
  await expect(page.getByText("Disable 2FA")).toBeVisible();
});

test("Navigation interruption warning", async ({ page }) => {
  await page.goto("/auth/setup-2fa");
  await page.getByText("Enable 2FA").click();

  // Try to navigate away
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/profile");

  // Should have shown beforeunload dialog
  // (verification depends on browser support)
});

test("Security: NO secrets in localStorage", async ({ page }) => {
  await page.goto("/auth/setup-2fa");
  await page.getByText("Enable 2FA").click();
  await page.waitForLoadState("networkidle");

  const localStorage = await page.evaluate(() => {
    return JSON.stringify(localStorage);
  });

  // Verify no TOTP secrets
  expect(localStorage).not.toContain("totp");
  expect(localStorage).not.toContain("secret");
  expect(localStorage).not.toContain("qr_code");
});
```

---

## Definition of Done

- [ ] Code implements all State A requirements
- [ ] Code implements all State B requirements
- [ ] Navigation interruption working
- [ ] beforeunload warning functional
- [ ] Fresh fetch on every mount
- [ ] Unit tests passing (100%)
- [ ] E2E tests passing (100%)
- [ ] Security audit passed (NO secrets in storage)
- [ ] Feature flag toggles new behavior
- [ ] All existing tests still passing
- [ ] Code review approved
- [ ] Documentation updated

---

## Security Checklist

**CRITICAL: These must pass BEFORE merge**

- [ ] Code review confirms NO `localStorage.setItem('qr_code'...)`
- [ ] Code review confirms NO `localStorage.setItem('totp_secret'...)`
- [ ] Code review confirms NO `sessionStorage.setItem(...)` for secrets
- [ ] Code review confirms secrets ONLY in component state (ephemeral)
- [ ] E2E test verifies localStorage doesn't contain secrets
- [ ] Fresh fetch happens on every mount (no cached secrets)
- [ ] beforeunload warning prevents accidental navigation

---

## Risk Mitigation

| Risk                           | Mitigation                                |
| ------------------------------ | ----------------------------------------- |
| Regressed 2FA flow             | Extensive E2E tests + manual verification |
| Secrets leaked                 | Security checklist + E2E verification     |
| beforeunload not working       | Test in multiple browsers                 |
| Stale secrets after navigation | Fresh fetch on mount                      |

---

## Notes

- **Security is CRITICAL**: This ticket handles TOTP secrets - extreme caution required
- **Fresh Fetch**: Every mount calls `enable2FA()` → new secret every time (prevents replay)
- **beforeunload**: Not supported in all browsers equally - feature detection needed
- **Feature Flag**: `auth-2fa-management` toggles between old/new behavior

---

**Estimated Completion**: Day 2, 13:00
**Blocks**: None (last ticket)
**Reviewers**: Dev A + Dev B (pair programming recommended)
**Dependencies**: F1-001, F1-002, F1-004 MUST be complete
**Security Review**: MANDATORY before merge
