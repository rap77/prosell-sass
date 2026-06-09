### E2E Tests: Organizations

**Suite ID:** `ORG-E2E`
**Feature:** Organizations CRUD functionality

---

## Test Case: `ORG-E2E-001` - Organizations list page layout

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @organizations

**Description/Objective:** Verify that the organizations list page displays all required elements correctly.

**Preconditions:**

- User is logged in
- User has navigated to /dashboard/org

### Flow Steps:

1. Navigate to organizations list page
2. Verify heading "Organizations" is visible
3. Verify "Create Organization" button is visible

### Expected Result:

- All page elements are displayed correctly
- User can see the option to create new organization

### Key verification points:

- Heading element contains "Organizations" text
- Create Organization button is clickable

---

## Test Case: `ORG-E2E-002` - Organizations list accessibility

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @organizations
- a11y → @a11y

**Description/Objective:** Verify that the organizations list page passes accessibility checks.

**Preconditions:**

- User is logged in
- User has navigated to /dashboard/org

### Flow Steps:

1. Run Axe accessibility scan on the page
2. Check for violations

### Expected Result:

- Zero accessibility violations

### Key verification points:

- No WCAG violations detected

---

## Test Case: `ORG-E2E-009` - Create organization successfully

**Priority:** `critical`

**Tags:**

- type → @e2e
- feature → @organizations

**Description/Objective:** Verify that a user can create a new organization with valid data.

**Preconditions:**

- User is logged in
- User is on organizations list page

### Flow Steps:

1. Click "Create Organization" button
2. Fill organization form with valid data (name, description, website, phone)
3. Submit form
4. Wait for navigation

### Expected Result:

- Organization is created successfully
- User is redirected to organization detail page
- Organization name is displayed on detail page

### Key verification points:

- URL changes to /dashboard/org/{id}
- Organization name appears in heading
- Status is "pending_verification" for new orgs

---

## Test Case: `ORG-E2E-012` - View organization details

**Priority:** `critical`

**Tags:**

- type → @e2e
- feature → @organizations

**Description/Objective:** Verify that organization details are displayed correctly.

**Preconditions:**

- User is logged in
- Organization exists

### Flow Steps:

1. Navigate to organization detail page
2. Verify organization name, description, website, phone are displayed
3. Verify status badge is visible
4. Verify quick actions (Teams, Wallet) are present

### Expected Result:

- All organization details are visible
- Status badge shows correct status
- Quick action buttons work

### Key verification points:

- Organization name matches created data
- Status badge color corresponds to status
- Teams and Wallet buttons navigate correctly

---

## Test Case: `ORG-E2E-021` - Update organization

**Priority:** `critical`

**Tags:**

- type → @e2e
- feature → @organizations

**Description/Objective:** Verify that a user can update an existing organization.

**Preconditions:**

- User is logged in
- Organization exists
- User is on organization detail page

### Flow Steps:

1. Click "Edit" button
2. Update form fields (name, description, website, phone)
3. Submit form
4. Wait for navigation

### Expected Result:

- Organization is updated successfully
- Updated details are displayed on detail page

### Key verification points:

- Organization name reflects update
- Other fields show new values

---

## Test Case: `ORG-E2E-005` - Form validation: empty name

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @organizations
- validation → @validation

**Description/Objective:** Verify that form shows error when name is empty.

**Preconditions:**

- User is on create organization page

### Flow Steps:

1. Leave name field empty
2. Fill other fields (optional)
3. Submit form

### Expected Result:

- Validation error is displayed
- Form submission is prevented

### Key verification points:

- Error message mentions "name is required" or similar

---

## Test Case: `ORG-E2E-006` - Form validation: short name

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @organizations
- validation → @validation

**Description/Objective:** Verify that form shows error when name is too short.

**Preconditions:**

- User is on create organization page

### Flow Steps:

1. Enter single character in name field
2. Submit form

### Expected Result:

- Validation error is displayed
- Error message mentions minimum length (2 characters)

### Key verification points:

- Error text includes "at least 2 characters"

---

## Test Case: `ORG-E2E-007` - Form validation: invalid URL

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @organizations
- validation → @validation

**Description/Objective:** Verify that form shows error when website URL is invalid.

**Preconditions:**

- User is on create organization page

### Flow Steps:

1. Enter valid name
2. Enter invalid URL (e.g., "not-a-url")
3. Submit form

### Expected Result:

- Validation error is displayed for website field
- Error message mentions "invalid URL"

### Key verification points:

- Error appears under website input
- Error text contains "invalid url"

---

## Test Case: `ORG-E2E-014` - Quick Actions navigation

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @organizations

**Description/Objective:** Verify that quick action buttons navigate to correct pages.

**Preconditions:**

- User is logged in
- User is on organization detail page

### Flow Steps:

1. Click "Teams" quick action button
2. Verify navigation to teams page
3. Go back to organization detail
4. Click "Wallet" quick action button
5. Verify navigation to wallet page

### Expected Result:

- Teams button navigates to /dashboard/org/{id}/teams
- Wallet button navigates to /dashboard/org/{id}/wallet

### Key verification points:

- URL changes correctly for each button
- Destination page heading is visible
