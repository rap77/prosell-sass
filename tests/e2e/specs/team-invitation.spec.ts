/**
 * E2E Tests for Team Invitation Flow (B4.1)
 *
 * Tests the complete invitation flow:
 * 1. Admin creates invitation via API
 * 2. User receives email with token
 * 3. User clicks link to /invite/[token]
 * 4. User accepts invitation
 * 5. User is added to team
 */

import { test, expect } from '@playwright/test';

test.describe('Team Invitation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'admin@prosell-demo.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should accept team invitation from email link', async ({ page, request }) => {
    // Step 1: Create invitation via API
    const createResponse = await request.post('/api/v1/teams/invite', {
      data: {
        team_id: 'test-team-id',
        email: 'newuser@example.com',
        role: 'vendor',
        expires_in_days: 7,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const invitation = await createResponse.json();
    const token = invitation.token; // In real scenario, this comes from email

    // Logout to simulate new user receiving email
    await page.click('button:has-text("Logout")');
    await page.waitForURL('/auth/login');

    // Login as the invited user
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Step 2: Navigate to invitation link (simulate clicking email link)
    await page.goto(`/invite/${token}`);

    // Step 3: Verify acceptance page loads
    await expect(page.locator('h1, h2').filter({ hasText: 'Team Invitation' })).toBeVisible();

    // Step 4: Wait for acceptance to complete
    await expect(page.locator('text=Welcome to the team')).toBeVisible({ timeout: 5000 });

    // Step 5: Verify redirect to dashboard
    await page.waitForURL('/dashboard*');
    expect(page.url()).toContain('/dashboard');
  });

  test('should show error for expired invitation', async ({ page }) => {
    // Use an expired token (this would be mocked in real scenario)
    const expiredToken = 'expired-token-1234567890abcdef';

    await page.goto(`/invite/${expiredToken}`);

    // Verify expired invitation message
    await expect(page.locator('text=Invitation Expired')).toBeVisible();
    await expect(page.locator('text=has expired')).toBeVisible();
  });

  test('should show error for invalid invitation token', async ({ page }) => {
    const invalidToken = 'invalid-token-abc123';

    await page.goto(`/invite/${invalidToken}`);

    // Verify error message
    await expect(page.locator('text=Unable to Accept Invitation')).toBeVisible();
    await expect(page.locator('text=Invalid invitation token')).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page, request }) => {
    // Create invitation
    const createResponse = await request.post('/api/v1/teams/invite', {
      data: {
        team_id: 'test-team-id',
        email: 'newuser@example.com',
        role: 'vendor',
      },
    });

    const invitation = await createResponse.json();
    const token = invitation.token;

    // Navigate to invitation link while logged out
    await page.goto(`/invite/${token}`);

    // Should redirect to login with return URL
    await page.waitForURL(/\/auth\/login/);
    expect(page.url()).toContain('/auth/login');
    expect(page.url()).toContain(`/invite/${token}`);
  });

  test('should handle already member scenario', async ({ page, request }) => {
    // Create invitation for existing team member
    const createResponse = await request.post('/api/v1/teams/invite', {
      data: {
        team_id: 'test-team-id',
        email: 'admin@prosell-demo.com', // Already a member
        role: 'vendor',
      },
    });

    const invitation = await createResponse.json();
    const token = invitation.token;

    await page.goto(`/invite/${token}`);

    // Verify already member message
    await expect(page.locator('text=Already a Member')).toBeVisible();
    await expect(page.locator('text=already a member of this team')).toBeVisible();

    // Should redirect to dashboard
    await page.waitForURL('/dashboard');
  });

  test('should have retry button on error', async ({ page }) => {
    const invalidToken = 'definitely-invalid-token';

    await page.goto(`/invite/${invalidToken}`);

    // Verify error state
    await expect(page.locator('text=Unable to Accept Invitation')).toBeVisible();

    // Verify retry button exists
    const retryButton = page.locator('button:has-text("Try Again")');
    await expect(retryButton).toBeVisible();

    // Verify homepage button exists
    const homeButton = page.locator('button:has-text("Go to Homepage")');
    await expect(homeButton).toBeVisible();
  });
});
