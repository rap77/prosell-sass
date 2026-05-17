## Goal
Fix login E2E test flakiness and create placeholder pages for terms/privacy to avoid 404 errors in login flow.

## Instructions
- User prefers Spanish (Rioplatense) with warm but direct tone
- GGA is required — never use --no-verify or commit bypasa
- Use bat/rg/fd/sd/eza instead of cat/grep/find/sed/ls
- Verify technical claims before stating them

## Discoveries
- Login E2E tests were failing due to double execution: running in both `auth-tests` (clean) and `chromium` (with persistent cookies) projects
- The `chromium` project was using persistent cookies from global setup, causing tests to start already authenticated and not on the login page
- Missing `/terms` and `/privacy` pages were causing 404 errors when clicking footer links in login form

## Accomplished
- ✅ Fixed login E2E test configuration: Segregated auth tests to only run in `auth-tests` project (clean state) by updating `tests/e2e/playwright.config.ts` testMatch/testIgnore rules
- ✅ All 12 login E2E tests now passing (were 12 passing, 12 failing)
- ✅ Created placeholder pages for missing routes:
  - `/apps/web/src/app/terms/page.tsx` - Terms of Service placeholder
  - `/apps/web/src/app/privacy/page.tsx` - Privacy Policy placeholder

## Relevant Files
- /home/rpadron/proy/prosell-sass/tests/e2e/playwright.config.ts — Fixed test project segregation to prevent double execution of auth tests
- /home/rpadron/proy/prosell-sass/apps/web/src/app/terms/page.tsx — Terms of Service placeholder page
- /home/rpadron/proy/prosell-sass/apps/web/src/app/privacy/page.tsx — Privacy Policy placeholder page
- /home/rpadron/proy/prosell-sass/.planning/phases/02-catalog-roles/.continue-here.md — Handoff file with session context
