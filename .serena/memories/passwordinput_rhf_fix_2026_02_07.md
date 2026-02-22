# PasswordInput + React Hook Form Fix

**Date:** 2026-02-07
**Status:** RESOLVED ✅
**Commit:** 48f55e2

## Problem

PasswordInput component manages its own internal state (show/hide password toggle), which conflicted with React Hook Form's `register()` method when used directly.

### Symptoms

- LoginForm: 5 tests failing/skipped
- RegisterForm: 3 tests failing/skipped
- Total: 8 tests affected

### Root Cause

PasswordInput has internal `useState` for the visibility toggle. When React Hook Form tries to control the component with `register()`, there's a conflict:

- RHF wants to control `value` and `onChange`
- PasswordInput internally manages its own state

## Solution

Wrap PasswordInput with `Controller` from React Hook Form.

### Before (BROKEN)

```typescript
import { useForm } from "react-hook-form";
import { PasswordInput } from "./PasswordInput";

export function LoginForm() {
  const { register, handleSubmit } = useForm<LoginFormValues>();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* ❌ This conflicts with PasswordInput's internal state */}
      <PasswordInput {...register("password")} />
    </form>
  );
}
```

### After (FIXED)

```typescript
import { useForm, Controller } from "react-hook-form";
import { PasswordInput } from "./PasswordInput";

export function LoginForm() {
  const { control, handleSubmit } = useForm<LoginFormValues>();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* ✅ Controller gives RHF full control while maintaining PasswordInput functionality */}
      <Controller
        name="password"
        control={control}
        render={({ field }) => (
          <PasswordInput
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
    </form>
  );
}
```

## Implementation Details

### LoginForm Changes

1. Added `Controller` to imports from "react-hook-form"
2. Changed `register` to `control` in `useForm` destructuring
3. Wrapped PasswordInput with Controller
4. Passed `value`, `onChange`, `onBlur` from Controller's `render` prop

### RegisterForm Changes

1. Same as LoginForm, but applied to BOTH password fields:
   - `password`
   - `confirmPassword`

### Test Changes

1. Removed `.skip` from 8 previously skipped tests
2. Fixed AuthError mock format (object with `message` property)
3. Fixed submit button selector (use `type="submit"` not `role="button"`)

## Results

### Before Fix

```
LoginForm: 20/25 passing (80%, 5 skipped)
RegisterForm: 31/34 passing (91%, 3 skipped)
Total: 182/190 passing (95.8%)
```

### After Fix

```
LoginForm: 25/25 passing (100%) ✅
RegisterForm: 34/34 passing (100%) ✅
Total: 280/280 passing (100%) ✅
```

## Key Learnings

### When to Use Controller

Use `Controller` from React Hook Form when:

- Component has internal state that conflicts with RHF
- Component needs explicit control over `value`, `onChange`, `onBlur`
- Component is a third-party library you can't modify
- Component has complex behavior that RHF's `register` can't handle

### When register() is Fine

Use `register()` directly when:

- Component is a simple input without internal state
- Component accepts standard input props (value, onChange, onBlur)
- You have full control over the component implementation

### Pattern Reference

```typescript
// ✅ Simple input - use register()
<input {...register("email")} />

// ✅ Simple select - use register()
<select {...register("country")}>

// ❌ Complex component with state - use Controller
<Controller
  name="password"
  control={control}
  render={({ field }) => (
    <PasswordInput
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
    />
  )}
/>
```

## Files Modified

1. `apps/web/src/components/auth/LoginForm.tsx`
2. `apps/web/src/components/auth/RegisterForm.tsx`
3. `apps/web/tests/components/auth/LoginForm.test.tsx`
4. `apps/web/tests/components/auth/RegisterForm.test.tsx`

## Related Documentation

- React Hook Form Controller: https://react-hook-form.com/docs/usecontroller/controller
- PasswordInput Component: `apps/web/src/components/auth/PasswordInput.tsx`
