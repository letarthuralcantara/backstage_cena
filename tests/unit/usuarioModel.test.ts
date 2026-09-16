import { describe, expect, it } from 'vitest'
import { cadastroCompleto, sanitizeUsuario } from '../../src/utils/usuario.js'

describe('regras puras de usuario', () => {
  it('identifica cadastro completo', () => {
    expect(cadastroCompleto({ nome_completo: 'Ana', instrumentos: ['Voz'], generos: ['Pop'], estado: 'SP', biografia: 'Artista', area_atuacao: ['Vocalista'] })).toBe(true)
  })

  it('rejeita campos ausentes, vazios e biografia curta', () => {
    expect(cadastroCompleto({})).toBe(false)
    expect(cadastroCompleto({ nome_completo: 'Ana', instrumentos: [], generos: ['Pop'], estado: 'SP', biografia: 'x', area_atuacao: ['Vocalista'] })).toBe(false)
  })

  it('remove a senha da resposta publica', () => {
    expect(sanitizeUsuario({ id_usuario: 1, senha: 'hash', email: 'a@b.com' })).toEqual({ id_usuario: 1, email: 'a@b.com' })
  })
})
