import request from 'supertest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/services/EmailService.js', () => ({
  default: { enviarBoasVindas: vi.fn().mockResolvedValue(undefined) },
}))

const { default: app } = await import('../../src/app.js')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const arquivoAudioValido = path.join(__dirname, '..', 'fixtures', 'sample.mp3')

let donoId = 0
let donoToken = ''
let intrusoId = 0
let intrusoToken = ''

beforeAll(async () => {
  const dono = await request(app).post('/api/usuarios').send({
    nome_completo: 'Dono do Conteudo',
    email: `dono-${Date.now()}@example.com`,
    senha: '123456',
  })
  donoId = dono.body.usuario.id_usuario
  donoToken = dono.body.token

  const intruso = await request(app).post('/api/usuarios').send({
    nome_completo: 'Usuario Intruso',
    email: `intruso-${Date.now()}@example.com`,
    senha: '123456',
  })
  intrusoId = intruso.body.usuario.id_usuario
  intrusoToken = intruso.body.token
})

afterAll(async () => {
  if (donoId && donoToken) await request(app).delete(`/api/usuarios/${donoId}`).set('Authorization', `Bearer ${donoToken}`)
  if (intrusoId && intrusoToken) await request(app).delete(`/api/usuarios/${intrusoId}`).set('Authorization', `Bearer ${intrusoToken}`)
})

describe('rotas de postagem (upload de audio)', () => {
  let postagemId = 0

  it('rejeita upload sem autenticacao e nao processa o arquivo', async () => {
    const response = await request(app).post('/api/postagens').attach('audio', arquivoAudioValido)
    expect(response.status).toBe(401)
  })

  it('rejeita tipo de arquivo nao permitido com 400', async () => {
    const response = await request(app)
      .post('/api/postagens')
      .set('Authorization', `Bearer ${donoToken}`)
      .attach('audio', Buffer.from('conteudo qualquer'), { filename: 'arquivo.txt', contentType: 'text/plain' })
    expect(response.status).toBe(400)
  })

  it('cria uma postagem com audio valido', async () => {
    const response = await request(app)
      .post('/api/postagens')
      .set('Authorization', `Bearer ${donoToken}`)
      .field('titulo', 'Previa de teste automatizado')
      .attach('audio', arquivoAudioValido)

    expect(response.status).toBe(201)
    expect(response.body.audio_url).toMatch(/^\/uploads\/audio\//)
    postagemId = response.body.id_postagem
  })

  it('lista a postagem recem-criada no feed', async () => {
    const response = await request(app).get('/api/postagens/feed')
    expect(response.status).toBe(200)
    expect(response.body.some((p: { id_postagem: number }) => p.id_postagem === postagemId)).toBe(true)
  })

  it('impede que outro usuario remova a postagem de outra pessoa (IDOR)', async () => {
    const response = await request(app)
      .delete(`/api/postagens/${postagemId}`)
      .set('Authorization', `Bearer ${intrusoToken}`)
    expect(response.status).toBe(403)
  })

  it('permite que o dono remova a propria postagem', async () => {
    const response = await request(app)
      .delete(`/api/postagens/${postagemId}`)
      .set('Authorization', `Bearer ${donoToken}`)
    expect(response.status).toBe(204)
  })

  it('responde 404 ao tentar remover uma postagem que ja foi removida', async () => {
    const response = await request(app)
      .delete(`/api/postagens/${postagemId}`)
      .set('Authorization', `Bearer ${donoToken}`)
    expect(response.status).toBe(404)
  })
})

describe('rotas de tweet', () => {
  let tweetId = 0

  it('rejeita criacao sem autenticacao', async () => {
    const response = await request(app).post('/api/tweets').send({ texto: 'sem token' })
    expect(response.status).toBe(401)
  })

  it('rejeita tweet vazio com 400', async () => {
    const response = await request(app)
      .post('/api/tweets')
      .set('Authorization', `Bearer ${donoToken}`)
      .send({ texto: '' })
    expect(response.status).toBe(400)
  })

  it('cria um tweet valido', async () => {
    const response = await request(app)
      .post('/api/tweets')
      .set('Authorization', `Bearer ${donoToken}`)
      .send({ texto: 'Meu primeiro tweet de teste automatizado' })
    expect(response.status).toBe(201)
    tweetId = response.body.id_tweet
  })

  it('impede que outro usuario remova o tweet de outra pessoa (IDOR)', async () => {
    const response = await request(app)
      .delete(`/api/tweets/${tweetId}`)
      .set('Authorization', `Bearer ${intrusoToken}`)
    expect(response.status).toBe(403)
  })

  it('permite que o dono remova o proprio tweet', async () => {
    const response = await request(app)
      .delete(`/api/tweets/${tweetId}`)
      .set('Authorization', `Bearer ${donoToken}`)
    expect(response.status).toBe(204)
  })
})
