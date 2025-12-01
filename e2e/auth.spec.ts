import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should sign up a new user', async ({ page }) => {
    await page.click('text=Sign up');
    await expect(page).toHaveURL(/\/auth\/signup/);

    // Fill registration form
    await page.fill('input[id="name"]', 'Test User');
    await page.fill('input[id="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[id="password"]', 'Test1234');
    await page.fill('input[id="confirmPassword"]', 'Test1234');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to signin
    await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 10000 });
  });

  test('should sign in existing user', async ({ page }) => {
    await page.click('text=Sign in');
    await expect(page).toHaveURL(/\/auth\/signin/);

    // Fill signin form
    await page.fill('input[id="email"]', 'demo@example.com');
    await page.fill('input[id="password"]', 'demo12345');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin');

    await page.fill('input[id="email"]', 'wrong@example.com');
    await page.fill('input[id="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('text=/Sign in failed/i')).toBeVisible({ timeout: 5000 });
  });

  test('should protect dashboard routes', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');

    // Should redirect to signin
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should sign out user', async ({ page }) => {
    // First sign in
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[id="email"]', 'demo@example.com');
    await page.fill('input[id="password"]', 'demo12345');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);

    // Click sign out
    await page.click('text=Sign Out');

    // Should redirect to signin
    await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 10000 });
  });
});
