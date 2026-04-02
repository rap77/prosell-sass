---
status: awaiting_human_verify
trigger: "ahora no funciona ningun boton oauth"
created: "2026-03-31T12:00:00Z"
updated: "2026-03-31T12:20:00Z"
---

## Current Focus
hypothesis: CONFIRMED - AnimatedSvgWrapper using React.forwardRef caused runtime errors in React 19
test: Removed forwardRef and changed to ref-as-prop pattern
expecting: OAuth buttons now work without JavaScript errors
next_action: User needs to test OAuth flow in browser to confirm fix

## Symptoms
expected: Clicking Google/Facebook OAuth buttons redirects to OAuth authorize endpoint
actual: "ahora no funciona ningun boton oauth" - No OAuth buttons work
errors: Unknown yet - need to check browser console
reproduction: Go to login page, click OAuth button
started: After recent linting fixes (commit 4efafb4)

## Evidence
- timestamp: 2026-03-31T12:00:00Z
  checked: LoginForm.tsx OAuthButtons usage
  found: LoginForm DOES pass onGoogleClick and onFacebookClick to dynamic OAuthButtons
  implication: Component props are correct, issue must be runtime or import-related

- timestamp: 2026-03-31T12:05:00Z
  checked: AnimatedSvgWrapper component (used by NON-dynamic OAuthButtons)
  found: AnimatedSvgWrapper uses React.forwardRef (line 64-108)
  implication: React 19 anti-pattern! React 19 uses ref as prop, not forwardRef
  hypothesis: AnimatedSvgWrapper with forwardRef causes runtime error/crash

- timestamp: 2026-03-31T12:07:00Z
  checked: Two different OAuthButtons implementations
  found:
    - /components/auth/OAuthButtons.tsx (non-dynamic) - Uses AnimatedSvgWrapper, has internal redirect logic
    - /components/auth/dynamic/OAuthButtons.tsx - No AnimatedSvgWrapper, expects onClick callbacks
  implication: LoginForm uses dynamic version (correct), but barrel export points to non-dynamic (broken)

## Eliminated

## Resolution
root_cause: AnimatedSvgWrapper component used React.forwardRef which is an anti-pattern in React 19. React 19 uses "ref as prop" instead of forwardRef for component composition. This caused runtime errors when OAuthButtons tried to use AnimatedSvgWrapper.
fix:
  - Removed React.forwardRef wrapper from AnimatedSvgWrapper
  - Changed ref from second parameter to regular prop (ref?: React.Ref<HTMLDivElement>)
  - Updated AnimatedSvgWrapperProps to extend Omit<React.HTMLAttributes<HTMLDivElement>, 'ref'>
  - Removed displayName (not needed without forwardRef)
verification: Pending - needs browser test with real OAuth flow
files_changed:
  - /home/rpadron/proy/prosell-sass/apps/web/src/components/ui/AnimatedSvgWrapper.tsx
