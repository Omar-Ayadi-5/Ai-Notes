import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('demo works without an API and preserves drafts across note switches', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/http:\/\/127\.0\.0\.1:4173\/api(?:\/|\?)/, (route) => route.abort());
  await page.goto('./#/demo');
  await expect(page.getByLabel('Note title', { exact: true })).toHaveValue('Launch plan · AI Notes');
  await page.getByRole('button', { name: 'Insights', exact: true }).click();
  await expect(page.getByText('Total', { exact: true })).toBeVisible();
  if (process.env.UPDATE_DOC_SCREENSHOTS) {
    await mkdir('../docs/images', { recursive: true });
    await page.screenshot({ path: '../docs/images/workspace.png' });
  }
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByLabel('Note content').fill('An unsaved idea worth keeping');
  await page.getByRole('button', { name: /Engineering journal/ }).click();
  await expect(page.getByLabel('Note title')).toHaveValue('Engineering journal');
  await page.getByRole('button', { name: /Launch plan/ }).click();
  await expect(page.getByLabel('Note content')).toHaveValue('An unsaved idea worth keeping');
  await page.getByRole('button', { name: 'AI Analyze' }).click();
  await expect(page.getByRole('heading', { name: 'Local summary' })).toBeVisible();
  await expect(page.getByText('Unsaved changes', { exact: false })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('mobile menu leaves room for writing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/demo');
  await expect(page.getByLabel('Note content')).toBeVisible();
  if (process.env.UPDATE_DOC_SCREENSHOTS) {
    await mkdir('../docs/images', { recursive: true });
    await page.screenshot({ path: '../docs/images/mobile.png' });
  }
  await page.getByRole('button', { name: 'Open notes menu' }).click();
  await page.getByRole('button', { name: /Engineering journal/ }).click();
  await expect(page.getByLabel('Note title')).toHaveValue('Engineering journal');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('demo is accessible from the sign-in screen', async ({ page }) => {
  test.skip(Boolean(process.env.PLAYWRIGHT_STATIC), 'Static demo mode has no account screens');
  await page.goto('./#/login');
  await page.getByRole('link', { name: /Try the interactive demo/ }).click();
  await expect(page.getByLabel('Note content')).toBeVisible();
});

test('static hosting redirects account screens to a usable demo', async ({ page }) => {
  test.skip(!process.env.PLAYWRIGHT_STATIC, 'Only applies to the static demo build');
  await page.goto('./#/signup');
  await expect(page.getByLabel('Note content')).toBeVisible();
  await expect(page.getByText('View the project', { exact: true })).toBeVisible();
});
