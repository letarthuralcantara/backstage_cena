import { expect, request as playwrightRequest, test } from '@playwright/test'

// Cada execução cria (e depois apaga) seu próprio usuário via API, em vez de
// depender do usuário fixo do seed — assim o teste pode rodar quantas vezes
// quiser, em paralelo, sem ficar preso a um dado específico do banco.
let email: string
const senha = '123456'
let userId = 0
let token = ''

test.beforeAll(async ({ baseURL }) => {
  const api = await playwrightRequest.newContext({ baseURL })
  email = `e2e-${Date.now()}@example.com`

  const res = await api.post('/api/usuarios', {
    data: { nome_completo: 'Usuario E2E', email, senha },
  })
  const body = await res.json()
  userId = body.usuario.id_usuario
  token = body.token

  await api.dispose()
})

test.afterAll(async ({ baseURL }) => {
  if (!userId || !token) return
  const api = await playwrightRequest.newContext({ baseURL })
  await api.delete(`/api/usuarios/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  await api.dispose()
})

test('usuario faz login e publica um tweet pela interface', async ({ page }) => {
  // 1) Login pela UI, com localizadores por papel acessível.
  await page.goto('/pages/login.html')
  await page.getByLabel(/e-mail/i).fill(email)
  await page.getByLabel(/senha/i).fill(senha)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/perfil\.html/)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).toBeTruthy()

  // 2) Criação de um registro pela interface: publica um tweet.
  await page.goto('/pages/publicar.html')
  await expect(page).toHaveURL(/publicar\.html/)
  await page.getByRole('button', { name: /tweet/i }).click()

  const texto = `Tweet de teste e2e ${Date.now()}`
  await page.getByLabel(/o que tá rolando/i).fill(texto)
  await page.getByRole('button', { name: /publicar tweet/i }).click()

  // 3) Verificação do resultado na tela.
  await expect(page.locator('#tweetMsg')).toHaveText(/publicado com sucesso/i)
})
