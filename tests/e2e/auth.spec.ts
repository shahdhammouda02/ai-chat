import { test, expect } from '@playwright/test';

test('unauthenticated user sees welcome screen', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByText('Welcome to AI Chat')
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Sign In', exact: true })
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Sign In to Get Started' })
  ).toBeVisible();
});

test('login page shows the form', async ({ page }) => {
  await page.goto('/auth/login');

  await expect(
    page.getByLabel('Email')
  ).toBeVisible();

  await expect(
    page.getByLabel('Password')
  ).toBeVisible();

  await expect(
    page.locator('form').getByRole('button', { name: 'Sign In' })
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: /continue with google/i })
  ).toBeVisible();
});