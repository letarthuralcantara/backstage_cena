/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authHeaders, fazerLogin, salvarCadastro } from '../../public/js/auth.js'

describe('cliente da API', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('envia Bearer e Content-Type nos requests JSON', () => {
    localStorage.setItem('token', 'abc123')
    expect(authHeaders()).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc123',
    })
  })

  it('salva usuario e token após cadastro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ usuario: { id_usuario: 2 }, token: 'token' }), { status: 201 })))
    await salvarCadastro({ nome_completo: 'Ana', email: 'ANA@EXAMPLE.COM', senha: '123456' })
    expect(fetch).toHaveBeenCalledWith('/api/usuarios', expect.objectContaining({ method: 'POST' }))
    expect(localStorage.getItem('token')).toBe('token')
  })

  it('converte resposta de erro em excecao com status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ erro: 'E-mail duplicado' }), { status: 409 })))
    await expect(fazerLogin('ana@example.com', '123456')).rejects.toMatchObject({ status: 409, message: 'E-mail duplicado' })
  })
})
