import prisma from '../database/prisma.js'
import { HttpError } from '../errors/HttpError.js'
import { hash as argon2Hash, verify as argon2Verify } from 'argon2'
import type { Usuario, CreateUsuarioInput, UpdateUsuarioInput } from '../types/index.js'

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseArea(raw: string | null | undefined): string[] {
  if (!raw) return []
  try { return raw.startsWith('[') ? JSON.parse(raw) : [raw] }
  catch { return [raw] }
}

function serializeArea(a: string | string[] | null | undefined): string | null {
  if (!a) return null
  return Array.isArray(a) ? JSON.stringify(a) : a
}

/**
 * Cadastro completo exige:
 *  - nome_completo
 *  - pelo menos 1 instrumento
 *  - pelo menos 1 gênero
 *  - estado
 *  - biografia com mínimo 20 caracteres
 *  - área de atuação
 */
export function cadastroCompleto(u: any): boolean {
  const areas = parseArea(u.area_atuacao)
  const bio = (u.biografia || '').trim()
  const insts = Array.isArray(u.instrumentos) ? u.instrumentos : []
  const gens  = Array.isArray(u.generos)      ? u.generos      : []
  return !!(
    u.nome_completo &&
    insts.length > 0 &&
    gens.length > 0 &&
    u.estado &&
    bio.length >= 5 &&
    areas.length > 0
  )
}

// mapUsuario mantém TODOS os campos, incluindo o hash da senha — necessário
// internamente (ex: argon2.verify no login). Nunca use o retorno desta função
// diretamente numa resposta HTTP: use sanitizeUsuario() antes de enviar ao cliente.
function mapUsuario(u: any): Usuario {
  const instrumentos = u.instrumentos?.map((r: any) => r.instrumento.nome) ?? []
  const generos      = u.generos?.map((r: any) => r.genero.nome) ?? []
  const daws         = u.daws?.map((r: any) => r.daw.nome) ?? []
  const disponibilidades = u.disponibilidades?.map((r: any) => r.disponibilidade.descricao) ?? []
  
  let redes_sociais: Record<string, string> | null = null
  try { redes_sociais = u.redes_sociais ? JSON.parse(u.redes_sociais) : null } catch { redes_sociais = null }
  
  const area_atuacao = parseArea(u.area_atuacao)
  
  const mapped = { ...u, instrumentos, generos, daws, disponibilidades, redes_sociais, area_atuacao }
  mapped.cadastro_completo = cadastroCompleto(mapped) ? 1 : 0
  return mapped
}

/**
 * Remove o hash da senha antes de enviar o usuário para o cliente.
 * Use SEMPRE no controller, na resposta HTTP — nunca envie o resultado
 * "cru" de mapUsuario() diretamente em um res.json().
 */
export function sanitizeUsuario<T extends { senha?: string }>(u: T): Omit<T, 'senha'> {
  const { senha, ...resto } = u
  return resto
}

const include = {
  instrumentos:     { include: { instrumento: true } },
  generos:          { include: { genero: true } },
  daws:             { include: { daw: true } },
  disponibilidades: { include: { disponibilidade: true } },
  configuracoes:    true,
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
async function read(field?: string, value?: unknown): Promise<Usuario[]> {
  const rows = await prisma.usuario.findMany({ include })
  return rows
    .map(mapUsuario)
    .filter(u => {
      if (u.status === 'invisivel') return false
      if ((u as any).configuracoes && (u as any).configuracoes.perfil_publico === 0) return false
      if (u.cadastro_completo !== 1) return false
      if (field && value !== undefined && value !== null && value !== '') {
        return (u as any)[field] === value
      }
      return true
    })
}

async function readById(id: number): Promise<Usuario> {
  const row = await prisma.usuario.findUnique({ where: { id_usuario: id }, include })
  if (!row) throw new HttpError(404, `Usuário com id ${id} não encontrado.`)
  return mapUsuario(row)
}

async function findByEmail(email: string): Promise<Usuario | null> {
  const row = await prisma.usuario.findUnique({ where: { email }, include })
  if (!row) return null
  return mapUsuario(row)
}

async function create(dados: CreateUsuarioInput): Promise<Usuario> {
  if (!dados.nome_completo) throw new HttpError(400, 'O campo nome completo é obrigatório.')
  if (!dados.email)         throw new HttpError(400, 'O campo e-mail é obrigatório.')
  if (!dados.senha)         throw new HttpError(400, 'O campo senha é obrigatório.')
  if (dados.senha.length < 6) throw new HttpError(400, 'A senha deve ter pelo menos 6 caracteres.')

  const existente = await prisma.usuario.findUnique({ where: { email: dados.email } })
  if (existente) throw new HttpError(400, 'Este e-mail já está cadastrado. Tente fazer login.')

  const senhaHash = await argon2Hash(dados.senha)

  const novo = await prisma.usuario.create({
    data: {
      nome_completo:    dados.nome_completo,
      nome_artistico:   dados.nome_artistico ?? dados.nome_completo,
      email:            dados.email,
      senha:            senhaHash,
      telefone:         dados.telefone ?? null,
      cidade:           dados.cidade ?? null,
      estado:           dados.estado ?? null,
      bairro:           dados.bairro ?? null,
      area_atuacao:     serializeArea(dados.area_atuacao),
      anos_experiencia: dados.anos_experiencia ?? 0,
      biografia:        dados.biografia ?? null,
      cadastro_completo: 0,
      redes_sociais:    dados.redes_sociais ? JSON.stringify(dados.redes_sociais) : null,
      status:           dados.status ?? 'disponivel',
      instrumentos: dados.instrumentos?.length ? {
        create: await resolverInstrumentos(dados.instrumentos)
      } : undefined,
      generos: dados.generos?.length ? {
        create: await resolverGeneros(dados.generos)
      } : undefined,
      daws: dados.daws?.length ? {
        create: await resolverDaws(dados.daws)
      } : undefined,
      disponibilidades: dados.disponibilidades?.length ? {
        create: await resolverDisponibilidades(dados.disponibilidades)
      } : undefined,
      configuracoes: {
        create: {
          mostrar_email: 1,
          mostrar_telefone: 0,
          mostrar_redes_sociais: 1,
          perfil_publico: 1,
        }
      }
    },
    include,
  })
  const mapped = mapUsuario(novo)
  await prisma.usuario.update({
    where: { id_usuario: novo.id_usuario },
    data: { cadastro_completo: mapped.cadastro_completo }
  })
  return mapped
}

async function update({ id_usuario, ...dados }: UpdateUsuarioInput): Promise<Usuario> {
  const existe = await prisma.usuario.findUnique({ where: { id_usuario }, include })
  if (!existe) throw new HttpError(404, `Usuário com id ${id_usuario} não encontrado.`)

  // O front-end nunca deve mais enviar um hash de volta (ver sanitizeUsuario).
  // Se "senha" vier no corpo, é sempre senha em texto puro digitada pelo usuário.
  let senhaFinal: string | undefined = undefined
  if (dados.senha) {
    senhaFinal = await argon2Hash(dados.senha)
  }

  await prisma.usuarioInstrumento.deleteMany({ where: { id_usuario } })
  await prisma.usuarioGenero.deleteMany({ where: { id_usuario } })
  await prisma.usuarioDaw.deleteMany({ where: { id_usuario } })
  await prisma.usuarioDisponibilidade.deleteMany({ where: { id_usuario } })

  const atualizado = await prisma.usuario.update({
    where: { id_usuario },
    data: {
      nome_completo:    dados.nome_completo,
      nome_artistico:   dados.nome_artistico,
      email:            dados.email,
      ...(senhaFinal ? { senha: senhaFinal } : {}),
      telefone:         dados.telefone,
      cidade:           dados.cidade,
      estado:           dados.estado,
      bairro:           dados.bairro,
      area_atuacao:     serializeArea(dados.area_atuacao),
      anos_experiencia: dados.anos_experiencia ?? 0,
      biografia:        dados.biografia,
      redes_sociais:    dados.redes_sociais ? JSON.stringify(dados.redes_sociais) : null,
      status:           dados.status,
      instrumentos: dados.instrumentos?.length ? {
        create: await resolverInstrumentos(dados.instrumentos)
      } : undefined,
      generos: dados.generos?.length ? {
        create: await resolverGeneros(dados.generos)
      } : undefined,
      daws: dados.daws?.length ? {
        create: await resolverDaws(dados.daws)
      } : undefined,
      disponibilidades: dados.disponibilidades?.length ? {
        create: await resolverDisponibilidades(dados.disponibilidades)
      } : undefined,
    },
    include,
  })
  const mapped = mapUsuario(atualizado)
  await prisma.usuario.update({
    where: { id_usuario },
    data: { cadastro_completo: mapped.cadastro_completo }
  })
  return mapped
}

async function updateStatus(id_usuario: number, status: string): Promise<Usuario> {
  const statusValidos = ['disponivel', 'ocupado', 'nao_perturbe', 'invisivel']
  if (!statusValidos.includes(status)) {
    throw new HttpError(400, `Status inválido. Use: ${statusValidos.join(', ')}`)
  }
  const existe = await prisma.usuario.findUnique({ where: { id_usuario } })
  if (!existe) throw new HttpError(404, `Usuário com id ${id_usuario} não encontrado.`)
  const atualizado = await prisma.usuario.update({
    where: { id_usuario },
    data: { status },
    include,
  })
  return mapUsuario(atualizado)
}

async function remove(id: number): Promise<void> {
  const existe = await prisma.usuario.findUnique({ where: { id_usuario: id } })
  if (!existe) throw new HttpError(404, `Usuário com id ${id} não encontrado.`)
  await prisma.usuario.delete({ where: { id_usuario: id } })
}

// ── Configurações ─────────────────────────────────────────────────────────────
async function getConfiguracoes(id_usuario: number) {
  let config = await prisma.configuracaoUsuario.findUnique({ where: { id_usuario } })
  if (!config) {
    config = await prisma.configuracaoUsuario.create({
      data: { id_usuario, mostrar_email: 1, mostrar_telefone: 0, mostrar_redes_sociais: 1, perfil_publico: 1 }
    })
  }
  return config
}

async function updateConfiguracoes(id_usuario: number, dados: {
  mostrar_email?: number
  mostrar_telefone?: number
  mostrar_redes_sociais?: number
  perfil_publico?: number
}) {
  return prisma.configuracaoUsuario.upsert({
    where: { id_usuario },
    update: dados,
    create: { id_usuario, mostrar_email: 1, mostrar_telefone: 0, mostrar_redes_sociais: 1, perfil_publico: 1, ...dados }
  })
}

async function alterarSenha(id_usuario: number, senhaAtual: string, novaSenha: string): Promise<void> {
  const usuario = await prisma.usuario.findUnique({ where: { id_usuario } })
  if (!usuario) throw new HttpError(404, 'Usuário não encontrado.')
  if (novaSenha.length < 6) throw new HttpError(400, 'A nova senha deve ter pelo menos 6 caracteres.')
  const senhaCorreta = await argon2Verify(usuario.senha, senhaAtual)
  if (!senhaCorreta) throw new HttpError(401, 'Senha atual incorreta.')
  const novoHash = await argon2Hash(novaSenha)
  await prisma.usuario.update({ where: { id_usuario }, data: { senha: novoHash } })
}

// ── Catálogos ─────────────────────────────────────────────────────────────────
async function listarInstrumentos(): Promise<string[]> {
  const r = await prisma.instrumento.findMany({ orderBy: { nome: 'asc' } })
  return r.map(x => x.nome)
}

async function listarGeneros(): Promise<string[]> {
  const r = await prisma.genero.findMany({ orderBy: { nome: 'asc' } })
  return r.map(x => x.nome)
}

async function listarDaws(): Promise<string[]> {
  const r = await prisma.daw.findMany({ orderBy: { nome: 'asc' } })
  return r.map(x => x.nome)
}

async function listarDisponibilidades(): Promise<string[]> {
  const r = await prisma.disponibilidade.findMany({ orderBy: { descricao: 'asc' } })
  return r.map(x => x.descricao)
}

// ── Resolvers de relacionamento ───────────────────────────────────────────────
async function resolverInstrumentos(nomes: string[]) {
  return Promise.all(nomes.map(async nome => {
    const inst = await prisma.instrumento.upsert({ where: { nome }, update: {}, create: { nome } })
    return { id_instrumento: inst.id_instrumento }
  }))
}

async function resolverGeneros(nomes: string[]) {
  return Promise.all(nomes.map(async nome => {
    const gen = await prisma.genero.upsert({ where: { nome }, update: {}, create: { nome } })
    return { id_genero: gen.id_genero }
  }))
}

async function resolverDaws(nomes: string[]) {
  return Promise.all(nomes.map(async nome => {
    const daw = await prisma.daw.upsert({ where: { nome }, update: {}, create: { nome } })
    return { id_daw: daw.id_daw }
  }))
}

async function resolverDisponibilidades(descricoes: string[]) {
  return Promise.all(descricoes.map(async descricao => {
    const disp = await prisma.disponibilidade.upsert({ where: { descricao }, update: {}, create: { descricao } })
    return { id_disponibilidade: disp.id_disponibilidade }
  }))
}

export default {
  read, readById, findByEmail, create, update, updateStatus, remove,
  getConfiguracoes, updateConfiguracoes, alterarSenha,
  listarInstrumentos, listarGeneros, listarDaws, listarDisponibilidades,
}