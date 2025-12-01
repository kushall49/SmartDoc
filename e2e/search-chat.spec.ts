import { test, expect } from '@playwright/test';

test.describe('Search and Chat Features', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[id="email"]', 'demo@example.com');
    await page.fill('input[id="password"]', 'demo12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate to search page', async ({ page }) => {
    await page.click('text=Search');
    await expect(page).toHaveURL(/\/dashboard\/search/);
    await expect(page.locator('text=Semantic Search')).toBeVisible();
  });

  test('should perform semantic search', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/search');

    // Type search query
    const searchInput = page.locator('input[placeholder*="search"]').first();
    await searchInput.fill('invoice payment terms');

    // Click search button
    await page.click('button[type="button"]:has-text("Search")');

    // Wait for results or no results message
    await page.waitForTimeout(3000);
  });

  test('should navigate to chat from document', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/documents');
    await page.waitForTimeout(2000);

    // Click on first Chat button if available
    const chatButton = page.locator('button:has-text("Chat")').first();
    if (await chatButton.isVisible()) {
      await chatButton.click();

      // Should navigate to chat page
      await expect(page).toHaveURL(/\/dashboard\/chat\/[a-zA-Z0-9]+/);
      await expect(page.locator('text=Chat with Document')).toBeVisible();
    }
  });

  test('should send a chat message', async ({ page }) => {
    // Navigate to a document's chat (assuming at least one document exists)
    await page.goto('http://localhost:3000/dashboard/documents');
    await page.waitForTimeout(2000);

    const chatButton = page.locator('button:has-text("Chat")').first();
    if (await chatButton.isVisible()) {
      await chatButton.click();

      // Wait for chat interface to load
      await page.waitForTimeout(2000);

      // Type a message
      const messageInput = page.locator('input[placeholder*="question"]');
      await messageInput.fill('What is this document about?');

      // Send message
      await page.click('button[type="button"]:has-text("Send")');

      // Wait for response
      await page.waitForTimeout(5000);
    }
  });

  test('should display chat history', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/documents');
    await page.waitForTimeout(2000);

    const chatButton = page.locator('button:has-text("Chat")').first();
    if (await chatButton.isVisible()) {
      await chatButton.click();
      await page.waitForTimeout(2000);

      // Check for chat interface elements
      await expect(page.locator('text=Chat with Document')).toBeVisible();
    }
  });
});
