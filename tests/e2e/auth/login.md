### E2E Tests: Authentication - Login Flow

**Suite ID:** `AUTH-LOGIN`
**Feature:** User authentication via email/password login

---

## Test Case: `LOGIN-E2E-001` - Display Login Page Elements

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @login

**Description/Objective:** Verify that all login page elements are correctly displayed

**Preconditions:**

- User is on the login page (/auth/login)

### Flow Steps:

1. Navigate to /auth/login
2. Verify heading "Sign in to your account" is visible
3. Verify email input is visible
4. Verify password input is visible
5. Verify sign in button is visible
6. Verify OAuth buttons (Google, GitHub) are visible

### Expected Result:

- All elements are visible and properly positioned

### Key verification points:

- Heading text matches expected
- Form inputs are interactive
- OAuth buttons display provider names

---

## Test Case: `LOGIN-E2E-002` - Accessibility Compliance

**Priority:** `critical`

**Tags:**

- type → @e2e
- feature → @login
- a11y → @a11y

**Description/Objective:** Ensure login page meets WCAG accessibility standards

**Preconditions:**

- User is on the login page

### Flow Steps:

1. Run axe-core accessibility scan
2. Check for violations

### Expected Result:

- Zero accessibility violations

### Key verification points:

- All form inputs have proper labels
- Buttons have accessible names
- Color contrast meets standards

---

## Test Case: `LOGIN-E2E-007` - Successful Login

**Priority:** `critical`

**Tags:**

- type → @e2e
- feature → @login
- critical → @critical

**Description/Objective:** Verify user can login with valid credentials

**Preconditions:**

- User has valid account credentials
- Mock API accepts existing user (test@example.com / password123)

### Flow Steps:

1. Navigate to /auth/login
2. Fill email with valid user email
3. Fill password with valid password
4. Click sign in button
5. Wait for redirect

### Expected Result:

- User is redirected to /dashboard
- Session is established

### Key verification points:

- URL changes to /dashboard
- Auth cookies are set
- User can access protected routes

---

## Test Case: `LOGIN-E2E-008` - Invalid Credentials Error

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @login

**Description/Objective:** Verify error message for invalid login

**Preconditions:**

- User is on login page

### Flow Steps:

1. Fill email with non-existent user
2. Fill password with any password
3. Click sign in button

### Expected Result:

- Error message displayed
- User remains on login page

### Key verification points:

- Error message indicates invalid credentials
- Form is not submitted
- User can retry

---

## Test Case: `LOGIN-E2E-009` - Loading State

**Priority:** `medium`

**Tags:**

- type → @e2e
- feature → @login

**Description/Objective:** Verify loading state during authentication

**Preconditions:**

- User is on login page

### Flow Steps:

1. Fill valid credentials
2. Click sign in button
3. Check button state during API call

### Expected Result:

- Submit button is disabled during loading
- Loading indicator is shown

### Key verification points:

- Button has disabled attribute
- Visual loading feedback
- Button re-enables after completion

---

## Test Case: `MIDDLEWARE-E2E-001` - Protected Route Redirect

**Priority:** `critical`

**Tags:**

- type → @e2e
- feature → @middleware
- critical → @critical

**Description/Objective:** Verify unauthenticated users are redirected from protected routes

**Preconditions:**

- User is not logged in
- No auth cookies present

### Flow Steps:

1. Navigate directly to /dashboard
2. Wait for redirect

### Expected Result:

- User is redirected to /auth/login
- Redirect parameter includes original destination

### Key verification points:

- URL changes to /auth/login
- ?redirect=/dashboard parameter is present

---

## Test Case: `MIDDLEWARE-E2E-006` - Public Route Access

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @middleware

**Description/Objective:** Verify public routes are accessible without auth

**Preconditions:**

- User is not logged in

### Flow Steps:

1. Navigate to home page (/)
2. Navigate to login page
3. Navigate to register page
4. Navigate to forgot-password page

### Expected Result:

- All routes load without redirect
- Pages are fully accessible

### Key verification points:

- No redirect occurs
- Full page content is visible
- Navigation works correctly

---

### Notes:

- Tests use mock API responses for consistent behavior
- Existing user credentials: test@example.com / password123
- OAuth tests verify button presence but do not test actual OAuth flow
- Middleware tests verify redirect behavior for protected routes
