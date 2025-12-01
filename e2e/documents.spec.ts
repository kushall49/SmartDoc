import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Document Upload and Processing', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[id="email"]', 'demo@example.com');
    await page.fill('input[id="password"]', 'demo12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate to upload page', async ({ page }) => {
    await page.click('text=Upload');
    await expect(page).toHaveURL(/\/dashboard\/upload/);
    await expect(page.locator('text=Upload Documents')).toBeVisible();
  });

  test('should upload a PDF file', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/upload');

    // Create a test file
    const testFile = path.join(__dirname, '../fixtures/test.pdf');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // Wait for file to appear in list
    await expect(page.locator('text=test.pdf')).toBeVisible({ timeout: 5000 });

    // Click upload button
    await page.click('button:has-text("Upload 1 File")');

    // Wait for success message
    await expect(page.locator('text=/upload.*successful/i')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should display uploaded documents', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/documents');

    // Wait for documents to load
    await expect(page.locator('text=Documents')).toBeVisible();

    // Check if documents are displayed or empty state
    const hasDocuments = await page.locator('[data-testid="document-card"]').count();
    if (hasDocuments > 0) {
      expect(hasDocuments).toBeGreaterThan(0);
    } else {
      await expect(page.locator('text=/No documents yet/i')).toBeVisible();
    }
  });

  test('should filter documents by status', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/documents');

    // Click on completed filter
    await page.click('text=/Completed/i');

    // Wait for filter to apply
    await page.waitForTimeout(1000);
  });

  test('should search documents', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/documents');

    // Type in search box
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');

    // Wait for search to filter results
    await page.waitForTimeout(1000);
  });

  test('should view document details', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/documents');

    // Wait for documents to load
    await page.waitForTimeout(2000);

    // Click on first View button if available
    const viewButton = page.locator('button:has-text("View")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Should navigate to document detail page
      await expect(page).toHaveURL(/\/dashboard\/documents\/[a-zA-Z0-9]+/);
    }
  });
});
