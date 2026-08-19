import { expect, test } from '@playwright/test'

test('estimates a Thor and exposes sharing support', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: /four digits/i }).fill('2500')
  await page.getByRole('button', { name: /show my window/i }).click()
  await expect(page.getByText(/most likely dispatch/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /donate/i })).toHaveAttribute(
    'href',
    /github.com\/sponsors\/castdrian/
  )
})
