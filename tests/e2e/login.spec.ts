import { expect, test } from '@playwright/test'

test('usuario faz login e acessa o perfil', async ({ page }) => {
  await page.goto('/pages/login.html')
  await page.getByLabel(/e-mail/i).fill('lucas@email.com')
  await page.getByLabel(/senha/i).fill('123456')
  await page.getByRole('button', { name: /entrar|login/i }).click()
  await expect(page).toHaveURL(/perfil\.html/)
})
