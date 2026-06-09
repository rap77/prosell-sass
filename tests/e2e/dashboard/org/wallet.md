### E2E Tests: Wallet

**Suite ID:** `WALLET-E2E`
**Feature:** Wallet balance and transaction history

---

## Test Case: `WALLET-E2E-001` - Wallet page layout

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @wallet

**Description/Objective:** Verify that the wallet page displays all required elements correctly.

**Preconditions:**

- User is logged in
- Organization exists
- User has navigated to /dashboard/org/{orgId}/wallet

### Flow Steps:

1. Navigate to wallet page
2. Verify heading "Wallet" is visible
3. Verify token balance section is displayed
4. Verify transaction history section is displayed

### Expected Result:

- All page elements are displayed correctly
- User can see balance and transactions

### Key verification points:

- Heading element contains "Wallet" text
- Token Balance card is visible
- Transaction History heading is visible

---

## Test Case: `WALLET-E2E-002` - Wallet page accessibility

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @wallet
- a11y → @a11y

**Description/Objective:** Verify that the wallet page passes accessibility checks.

**Preconditions:**

- User is logged in
- User has navigated to wallet page

### Flow Steps:

1. Run Axe accessibility scan on the page
2. Check for violations

### Expected Result:

- Zero accessibility violations

### Key verification points:

- No WCAG violations detected

---

## Test Case: `WALLET-E2E-005` - Display token balance

**Priority:** `critical`

**Tags:**

- type → @e2e
- feature → @wallet

**Description/Objective:** Verify that wallet token balance is displayed correctly.

**Preconditions:**

- User is logged in
- Organization exists
- User is on wallet page

### Flow Steps:

1. Navigate to wallet page
2. Wait for balance to load
3. Read balance value

### Expected Result:

- Token balance is displayed as a number
- Balance is >= 0
- "tokens" label is visible

### Key verification points:

- Balance value is numeric (with possible commas)
- Balance is not negative
- Label "tokens" appears below balance

---

## Test Case: `WALLET-E2E-007` - Refresh button presence

**Priority:** `medium`

**Tags:**

- type → @e2e
- feature → @wallet

**Description/Objective:** Verify that refresh button is available on wallet card.

**Preconditions:**

- User is on wallet page

### Flow Steps:

1. Locate refresh button on wallet card
2. Verify button is clickable

### Expected Result:

- Refresh button is visible
- Button can be clicked

### Key verification points:

- Refresh icon is displayed
- Button is not disabled

---

## Test Case: `WALLET-E2E-008` - Refresh balance functionality

**Priority:** `medium`

**Tags:**

- type → @e2e
- feature → @wallet

**Description/Objective:** Verify that clicking refresh updates the balance.

**Preconditions:**

- User is on wallet page
- Balance is already displayed

### Flow Steps:

1. Note current balance value
2. Click refresh button
3. Wait for network idle
4. Verify balance is still displayed

### Expected Result:

- Balance refreshes without error
- Balance value remains valid

### Key verification points:

- No error message appears
- Balance value is still a number >= 0

---

## Test Case: `WALLET-E2E-009` - Recharge button presence

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @wallet

**Description/Objective:** Verify that recharge button is available on wallet card.

**Preconditions:**

- User is on wallet page

### Flow Steps:

1. Locate recharge button on wallet card
2. Verify button is visible and clickable

### Expected Result:

- Recharge button is displayed
- Button contains "+" icon and "Recharge" text

### Key verification points:

- Button text is "Recharge"
- Plus icon is visible
- Button is enabled

---

## Test Case: `WALLET-E2E-010` - Open recharge dialog

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @wallet

**Description/Objective:** Verify that clicking recharge button opens token package selection dialog.

**Preconditions:**

- User is on wallet page

### Flow Steps:

1. Click recharge button
2. Verify dialog appears

### Expected Result:

- Recharge dialog is displayed
- Token packages are shown

### Key verification points:

- Dialog heading mentions "token package"
- Multiple package options are visible

---

## Test Case: `WALLET-E2E-011` - Token package options

**Priority:** `high`

**Tags:**

- type → @e2e
- feature → @wallet

**Description/Objective:** Verify that correct token packages are displayed.

**Preconditions:**

- Recharge dialog is open

### Flow Steps:

1. Count number of package options
2. Verify package labels (100, 500, 1000 tokens)
3. Verify pricing ($10, $50, $100)

### Expected Result:

- 3 token packages are displayed
- Pricing is correct (10 tokens = $1)

### Key verification points:

- "100 Tokens" with "$10" is visible
- "500 Tokens" with "$50" is visible
- "1000 Tokens" with "$100" is visible

---

## Test Case: `WALLET-E2E-013` - Cancel recharge dialog

**Priority:** `medium`

**Tags:**

- type → @e2e
- feature → @wallet

**Description/Objective:** Verify that recharge dialog can be cancelled.

**Preconditions:**

- Recharge dialog is open

### Flow Steps:

1. Click cancel button in dialog
2. Verify dialog closes

### Expected Result:

- Dialog is no longer visible
- User returns to wallet page view

### Key verification points:

- Dialog element is removed from DOM
- Wallet card is still visible

---

## Test Case: `WALLET-E2E-014` - Empty transaction state

**Priority:** `medium`

**Tags:**

- type → @e2e
- feature → @wallet

**Description/Objective:** Verify empty state message when no transactions exist.

**Preconditions:**

- User is on wallet page
- Organization has no transactions

### Flow Steps:

1. Navigate to wallet page
2. Verify transaction history section

### Expected Result:

- Empty state message is displayed
- "No transactions yet" or similar message is visible

### Key verification points:

- Message text mentions "no transactions"
- Clock or empty state icon may be displayed

---

## Test Case: `WALLET-E2E-015` - Display transaction list

**Priority:** `medium`

**Tags:**

- type → @e2e
- feature → @wallet

**Description/Objective:** Verify that transactions are displayed when they exist.

**Preconditions:**

- User is on wallet page
- Organization has one or more transactions

### Flow Steps:

1. Navigate to wallet page
2. Count transaction items
3. Verify transaction details (amount, type, date)

### Expected Result:

- Each transaction is displayed with:
  - Amount with +/- indicator
  - Type (credit/debit)
  - Description or type label
  - Timestamp

### Key verification points:

- Credit transactions show "+" and green color
- Debit transactions show "-" and red color
- Balance after transaction is shown

---

## Test Case: `WALLET-E2E-021` - Navigation: back to organization

**Priority:** `medium`

**Tags:**

- type → @e2e
- feature → @wallet

**Description/Objective:** Verify that back button navigates to organization detail.

**Preconditions:**

- User is on wallet page

### Flow Steps:

1. Click back button (arrow icon)
2. Verify navigation

### Expected Result:

- User is redirected to organization detail page

### Key verification points:

- URL changes to /dashboard/org/{orgId}
- Organization detail heading is visible

---

## Test Case: `WALLET-E2E-022` - Navigation from organization detail

**Priority:** `medium`

**Tags:**

- type → @e2e
- feature → @wallet

**Description/Objective:** Verify navigation to wallet from organization detail quick action.

**Preconditions:**

- User is on organization detail page

### Flow Steps:

1. Click "Wallet" quick action button
2. Verify navigation

### Expected Result:

- User is redirected to wallet page

### Key verification points:

- URL changes to /dashboard/org/{orgId}/wallet
- Wallet heading is visible
- Token balance is displayed
