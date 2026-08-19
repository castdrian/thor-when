import { expect, test } from '@playwright/test'

test('estimates a Thor and exposes sharing support', async ({ page }) => {
  await page.goto('/')
  const tier = page.getByRole('combobox', { name: 'Thor tier' })
  await expect(tier.locator('option').nth(0)).toHaveText('Max')
  await expect(tier.locator('option').nth(3)).toHaveText('Lite')
  await expect(
    page.getByRole('combobox', { name: 'Thor storage' }).locator('option').nth(0)
  ).toHaveText('1TB')
  await page.getByRole('button', { name: /switch to dark mode/i }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: /switch to light mode/i }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('heading', { name: /share your real shipment dates/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /save shipping report/i })).toBeDisabled()
  await page.getByRole('textbox', { name: 'First four digits of your order number' }).fill('2500')
  await page.getByRole('button', { name: /show my window/i }).click()
  await expect(page.getByText(/most likely dispatch/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /donate/i })).toHaveAttribute(
    'href',
    /github.com\/sponsors\/castdrian/
  )
})
