import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/services/EmailService.js', () => ({ default: { enviarBoasVindas: vi.fn().mockResolvedValue(undefined) } }))

const { default: app } = await import('../../src/app.js')

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
    const response = await request(app).post('/api/usuarios').send({ email: 'invalido', senha: '1' })
    expect(response.status).toBe(400)
    expect(response.body.issues.length).toBeGreaterThan(0)
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

  it('bloqueia outro proprietario', async () => {
    const response = await request(app).put(`/api/usuarios/${userId}`)
      .set('Authorization', 'Bearer token-invalido')
      .send({ nome_completo: 'Nao autorizado' })
    expect(response.status).toBe(401)
  })
})
