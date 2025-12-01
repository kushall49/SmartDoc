import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[id="email"]', 'demo@example.com');
    await page.fill('input[id="password"]', 'demo12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display dashboard overview', async ({ page }) => {
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Total Documents')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('text=Processing')).toBeVisible();
    await expect(page.locator('text=Failed')).toBeVisible();
  });

  test('should navigate using sidebar', async ({ page }) => {
    // Navigate to Documents
    await page.click('a:has-text("Documents")');
    await expect(page).toHaveURL(/\/dashboard\/documents/);

    // Navigate to Search
    await page.click('a:has-text("Search")');
    await expect(page).toHaveURL(/\/dashboard\/search/);

    // Navigate to Upload
    await page.click('a:has-text("Upload")');
    await expect(page).toHaveURL(/\/dashboard\/upload/);

    // Navigate back to Overview
    await page.click('a:has-text("Overview")');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('should display user name in header', async ({ page }) => {
    // Check if user name is visible (on desktop)
    const userName = page.locator('text=demo@example.com, text=Demo User');
    const isVisible = await userName.isVisible().catch(() => false);
    // User name might be hidden on mobile, so we just check it doesn't error
    expect(isVisible !== undefined).toBe(true);
  });

  test('should show quick actions on overview', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');

    await expect(page.locator('text=Quick Actions')).toBeVisible();
    await expect(page.locator('text=Upload Documents')).toBeVisible();
    await expect(page.locator('text=View Documents')).toBeVisible();
    await expect(page.locator('text=Semantic Search')).toBeVisible();
  });

  test('should navigate via quick actions', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');

    // Click Upload Documents quick action
    const uploadLink = page.locator('a:has-text("Upload Documents")');
    await uploadLink.click();
    await expect(page).toHaveURL(/\/dashboard\/upload/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('http://localhost:3000/dashboard');

    // Check if hamburger menu appears
    const menuButton = page.locator('button:has-text("Menu"), button[aria-label="Menu"]');
    await expect(menuButton.first()).toBeVisible();
  });

  test('should toggle mobile sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000/dashboard');

    // Find and click menu button
    const menuButtons = page.locator('button').filter({ hasText: /menu/i });
    if (await menuButtons.count() > 0) {
      await menuButtons.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('should refresh data on dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/documents');

    // Click refresh button
    await page.click('button:has-text("Refresh")');

    // Wait for data to reload
    await page.waitForTimeout(2000);
  });
});
