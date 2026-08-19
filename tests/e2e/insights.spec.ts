import { expect, test } from '@playwright/test'

test('shows the local insights route', async ({ page }) => {
  await page.goto('/insights')
  await expect(page).toHaveTitle('thor when? · insights')
  await expect(page.getByRole('heading', { name: /the read behind the read/i })).toBeVisible()
  await expect(page.getByText('submissions', { exact: true })).toBeVisible()
  await expect(page.getByText('confidence mix', { exact: true })).toBeVisible()
})
