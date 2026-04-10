import { test, expect } from '@playwright/test';

test('redirects unauthenticated user to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('login page shows the form', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
});