import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/services/EmailService.js', () => ({ default: { enviarBoasVindas: vi.fn().mockResolvedValue(undefined) } }))

const { default: app } = await import('../../src/app.js')
const { default: EmailService } = await import('../../src/services/EmailService.js')

let userId = 0
let token = ''
const email = `test-${Date.now()}@example.com`

beforeAll(async () => {
  const response = await request(app).post('/api/usuarios').send({
    nome_completo: 'Usuario de Teste', email, senha: '123456',
  })
  userId = response.body.usuario.id_usuario
  token = response.body.token
})

afterAll(async () => {
  if (userId && token) await request(app).delete(`/api/usuarios/${userId}`).set('Authorization', `Bearer ${token}`)
})

describe('rotas da API sem abrir porta', () => {
  it('responde o health check', async () => {
    const response = await request(app).get('/')
    expect(response.status).toBe(200)
    expect(response.body.mensagem).toContain('rodando')
  })

  it('retorna 404 JSON para rota de API inexistente', async () => {
    const response = await request(app).get('/api/inexistente')
    expect(response.status).toBe(404)
    expect(response.body.erro).toBeDefined()
  })

  it('retorna 400 com issues para cadastro inválido', async () => {
    vi.mocked(EmailService.enviarBoasVindas).mockClear()
    const response = await request(app).post('/api/usuarios').send({ email: 'invalido', senha: '1' })
    expect(response.status).toBe(400)
    expect(response.body.issues.length).toBeGreaterThan(0)
    expect(EmailService.enviarBoasVindas).not.toHaveBeenCalled()
  })

  it('mantém 201 quando o SMTP falha depois do cadastro', async () => {
    const emailComFalha = `smtp-falha-${Date.now()}@example.com`
    vi.mocked(EmailService.enviarBoasVindas)
      .mockClear()
      .mockRejectedValueOnce(new Error('SMTP indisponível'))

    const response = await request(app).post('/api/usuarios').send({
      nome_completo: 'Cadastro sem SMTP',
      email: emailComFalha,
      senha: '123456',
    })

    expect(response.status).toBe(201)
    expect(EmailService.enviarBoasVindas).toHaveBeenCalledWith(
      emailComFalha,
      'Cadastro sem SMTP',
    )

    await request(app)
      .delete(`/api/usuarios/${response.body.usuario.id_usuario}`)
      .set('Authorization', `Bearer ${response.body.token}`)
  })

  it('protege criação de tweet sem token', async () => {
    const response = await request(app).post('/api/tweets').send({ texto: 'sem token' })
    expect(response.status).toBe(401)
  })

  it('rejeita id inválido antes do controller', async () => {
    const response = await request(app).get('/api/usuarios/abc')
    expect(response.status).toBe(400)
    expect(response.body.issues.length).toBeGreaterThan(0)
  })

  it('exercita CRUD e conflito de e-mail de forma repetível', async () => {
    const duplicate = await request(app).post('/api/usuarios').send({ nome_completo: 'Duplicado', email, senha: '123456' })
    expect(duplicate.status).toBe(409)

    const found = await request(app).get(`/api/usuarios/${userId}`)
    expect(found.status).toBe(200)
    expect(found.body.senha).toBeUndefined()

    const updated = await request(app).put(`/api/usuarios/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome_completo: 'Usuario Atualizado' })
    expect(updated.status).toBe(200)
    expect(updated.body.nome_completo).toBe('Usuario Atualizado')
  })

  it('rejeita token com formato invalido', async () => {
    const response = await request(app).put(`/api/usuarios/${userId}`)
      .set('Authorization', 'Bearer token-invalido')
      .send({ nome_completo: 'Nao autorizado' })
    expect(response.status).toBe(401)
  })

  it('bloqueia um usuario autenticado de editar o perfil de outro (IDOR)', async () => {
    const outro = await request(app).post('/api/usuarios').send({
      nome_completo: 'Outro Usuario', email: `intruso-${Date.now()}@example.com`, senha: '123456',
    })
    const outroToken = outro.body.token
    const outroId = outro.body.usuario.id_usuario

    const response = await request(app).put(`/api/usuarios/${userId}`)
      .set('Authorization', `Bearer ${outroToken}`)
      .send({ nome_completo: 'Nao autorizado' })
    expect(response.status).toBe(403)

    await request(app).delete(`/api/usuarios/${outroId}`).set('Authorization', `Bearer ${outroToken}`)
  })
})
