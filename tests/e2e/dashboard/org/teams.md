### E2E Tests: Teams

**Suite ID:** `TEAMS-E2E`
**Feature:** Teams CRUD functionality within organizations

---

## Test Case: `TEAMS-E2E-001` - Teams list page layout

**Priority:** `high`

**Tags:**
- type → @e2e
- feature → @teams

**Description/Objective:** Verify that the teams list page displays all required elements correctly.

**Preconditions:**
- User is logged in
- Organization exists
- User has navigated to /dashboard/org/{orgId}/teams

### Flow Steps:
1. Navigate to teams list page
2. Verify heading "Teams" is visible
3. Verify "Create Team" button is visible
4. Verify back button is visible

### Expected Result:
- All page elements are displayed correctly
- User can see the option to create new team

### Key verification points:
- Heading element contains "Teams" text
- Create Team button is clickable
- Back button returns to organization detail

---

## Test Case: `TEAMS-E2E-002` - Teams list accessibility

**Priority:** `high`

**Tags:**
- type → @e2e
- feature → @teams
- a11y → @a11y

**Description/Objective:** Verify that the teams list page passes accessibility checks.

**Preconditions:**
- User is logged in
- User has navigated to teams list page

### Flow Steps:
1. Run Axe accessibility scan on the page
2. Check for violations

### Expected Result:
- Zero accessibility violations

### Key verification points:
- No WCAG violations detected

---

## Test Case: `TEAMS-E2E-008` - Create team successfully

**Priority:** `critical`

**Tags:**
- type → @e2e
- feature → @teams

**Description/Objective:** Verify that a user can create a new team with valid data.

**Preconditions:**
- User is logged in
- Organization exists
- User is on teams list page

### Flow Steps:
1. Click "Create Team" button
2. Fill team form with valid name
3. Submit form
4. Wait for navigation

### Expected Result:
- Team is created successfully
- User is redirected back to teams list or team detail
- Team name appears in list

### Key verification points:
- Team card with created name is visible
- Member count shows "0 members" for new team

---

## Test Case: `TEAMS-E2E-011` - Display multiple teams

**Priority:** `high`

**Tags:**
- type → @e2e
- feature → @teams

**Description/Objective:** Verify that multiple teams are displayed correctly in the list.

**Preconditions:**
- User is logged in
- Organization exists
- At least 2 teams exist for the organization

### Flow Steps:
1. Navigate to teams list page
2. Count team cards displayed

### Expected Result:
- All teams are visible
- Each team shows name and member count

### Key verification points:
- Team count matches expected
- Each team card is clickable

---

## Test Case: `TEAMS-E2E-012` - Empty state for no teams

**Priority:** `medium`

**Tags:**
- type → @e2e
- feature → @teams

**Description/Objective:** Verify that empty state message is shown when organization has no teams.

**Preconditions:**
- User is logged in
- Organization exists with no teams

### Flow Steps:
1. Navigate to teams list page
2. Verify empty state message

### Expected Result:
- Empty state message is displayed
- "Create Your First Team" button is visible

### Key verification points:
- Message text mentions "no teams yet"
- Create button is clickable

---

## Test Case: `TEAMS-E2E-005` - Form validation: empty name

**Priority:** `high`

**Tags:**
- type → @e2e
- feature → @teams
- validation → @validation

**Description/Objective:** Verify that form shows error when team name is empty.

**Preconditions:**
- User is on create team page

### Flow Steps:
1. Leave name field empty
2. Submit form

### Expected Result:
- Validation error is displayed
- Form submission is prevented

### Key verification points:
- Error message mentions "name is required" or similar

---

## Test Case: `TEAMS-E2E-006` - Form validation: short name

**Priority:** `high`

**Tags:**
- type → @e2e
- feature → @teams
- validation → @validation

**Description/Objective:** Verify that form shows error when team name is too short.

**Preconditions:**
- User is on create team page

### Flow Steps:
1. Enter single character in name field
2. Submit form

### Expected Result:
- Validation error is displayed
- Error message mentions minimum length (2 characters)

### Key verification points:
- Error text includes "at least 2 characters"

---

## Test Case: `TEAMS-E2E-015` - Member form display

**Priority:** `medium`

**Tags:**
- type → @e2e
- feature → @teams

**Description/Objective:** Verify that member form fields are displayed correctly.

**Preconditions:**
- User is on team detail or add member page
- Member form component is rendered

### Flow Steps:
1. Verify User ID input field
2. Verify Role selector (Manager/Vendor)
3. Verify Commission Rate input field
4. Verify Add Member button

### Expected Result:
- All member form fields are visible
- Role selector has both options

### Key verification points:
- User ID field has required indicator
- Role dropdown is functional
- Commission rate accepts decimal values

---

## Test Case: `TEAMS-E2E-016` - Member validation: required fields

**Priority:** `high`

**Tags:**
- type → @e2e
- feature → @teams
- validation → @validation

**Description/Objective:** Verify that member form validates required fields.

**Preconditions:**
- Member form is displayed

### Flow Steps:
1. Leave User ID field empty
2. Submit form

### Expected Result:
- Validation error is displayed
- Error message mentions "user ID is required"

### Key verification points:
- Error appears under User ID input
- Add Member button remains disabled or shows error

---

## Test Case: `TEAMS-E2E-019` - Commission rate validation

**Priority:** `high`

**Tags:**
- type → @e2e
- feature → @teams
- validation → @validation

**Description/Objective:** Verify that commission rate is validated (0-100%).

**Preconditions:**
- Member form is displayed

### Flow Steps:
1. Enter valid User ID
2. Select a role
3. Enter commission rate > 100 (e.g., 150)
4. Submit form

### Expected Result:
- Validation error is displayed
- Error message mentions "cannot exceed 100%"

### Key verification points:
- Error appears under commission rate field
- Form prevents submission of invalid rate

---

## Test Case: `TEAMS-E2E-020` - Navigation: back to organization

**Priority:** `medium`

**Tags:**
- type → @e2e
- feature → @teams

**Description/Objective:** Verify that back button navigates to organization detail.

**Preconditions:**
- User is on teams list page

### Flow Steps:
1. Click back button
2. Verify navigation

### Expected Result:
- User is redirected to organization detail page

### Key verification points:
- URL changes to /dashboard/org/{orgId}
- Organization detail heading is visible

---

## Test Case: `TEAMS-E2E-022` - Navigation from organization detail

**Priority:** `medium`

**Tags:**
- type → @e2e
- feature → @teams

**Description/Objective:** Verify navigation to teams from organization detail quick action.

**Preconditions:**
- User is on organization detail page

### Flow Steps:
1. Click "Teams" quick action button
2. Verify navigation

### Expected Result:
- User is redirected to teams list page

### Key verification points:
- URL changes to /dashboard/org/{orgId}/teams
- Teams heading is visible
