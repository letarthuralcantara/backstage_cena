import { describe, expect, it } from 'vitest'
import { cadastroSchema, buscarSchema } from '../../src/schema/usuario.schema.js'

describe('schemas de entrada', () => {
  it('aceita cadastro valido', () => {
    expect(cadastroSchema.safeParse({ body: { nome_completo: 'Ana Silva', email: 'ana@example.com', senha: '123456' } }).success).toBe(true)
  })

  it('rejeita e-mail e senha invalidos com issues', () => {
    const result = cadastroSchema.safeParse({ body: { nome_completo: 'A', email: 'invalido', senha: '1' } })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.length).toBeGreaterThan(0)
  })

  it('aceita somente ids positivos', () => {
    expect(buscarSchema.safeParse({ params: { id: '2' } }).success).toBe(true)
    expect(buscarSchema.safeParse({ params: { id: '0' } }).success).toBe(false)
  })
})
