import prisma from '../database/prisma.js'
import { HttpError } from '../errors/HttpError.js'
import type { Usuario, CreateUsuarioInput, UpdateUsuarioInput, UserStatus } from '../types/index.js'

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

function calcularCompleto(u: any): number {
  const areas = parseArea(u.area_atuacao)
  return areas.length && u.instrumentos?.length && u.generos?.length && u.cidade ? 1 : 0
}

function mapUsuario(u: any): Usuario {
  const instrumentos   = u.instrumentos?.map((r: any) => r.instrumento.nome) ?? []
  const generos        = u.generos?.map((r: any) => r.genero.nome) ?? []
  const disponibilidades = u.disponibilidades?.map((r: any) => r.disponibilidade.descricao) ?? []
  const daws           = u.daws?.map((r: any) => r.daw.nome) ?? []

  let redes_sociais: Record<string, string> | null = null
  try { redes_sociais = u.redes_sociais ? JSON.parse(u.redes_sociais) : null } catch { redes_sociais = null }

  const area_atuacao = parseArea(u.area_atuacao)

  const mapped = { ...u, instrumentos, generos, disponibilidades, daws, redes_sociais, area_atuacao, status: u.status as UserStatus }
  mapped.cadastro_completo = calcularCompleto(mapped)
  return mapped
}

const include = {
  instrumentos:     { include: { instrumento: true } },
  generos:          { include: { genero: true } },
  disponibilidades: { include: { disponibilidade: true } },
  daws:             { include: { daw: true } },
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

async function read(field?: string, value?: unknown): Promise<Usuario[]> {
  const where: any = { cadastro_completo: 1 }
  if (field && value !== undefined && value !== null && value !== '') {
    where[field] = value
  }
  const rows = await prisma.usuario.findMany({ where, include })
  return rows.map(mapUsuario)
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
  if (!dados.nome_completo || !dados.email || !dados.senha)
    throw new HttpError(400, 'Nome completo, email e senha são obrigatórios.')

  const existente = await prisma.usuario.findUnique({ where: { email: dados.email } })
  if (existente) throw new HttpError(400, 'Email já cadastrado.')

  const novo = await prisma.usuario.create({
    data: {
      nome_completo:    dados.nome_completo,
      nome_artistico:   dados.nome_artistico ?? dados.nome_completo,
      email:            dados.email,
      senha:            dados.senha,
      telefone:         dados.telefone ?? null,
      cidade:           dados.cidade ?? null,
      estado:           dados.estado ?? null,
      bairro:           dados.bairro ?? null,
      area_atuacao:     serializeArea(dados.area_atuacao),
      anos_experiencia: dados.anos_experiencia ?? 0,
      biografia:        dados.biografia ?? null,
      cadastro_completo: 0,
      redes_sociais:    dados.redes_sociais ? JSON.stringify(dados.redes_sociais) : null,
      status:           dados.status ?? 'online',
      instrumentos: dados.instrumentos?.length ? {
        create: await resolverInstrumentos(dados.instrumentos)
      } : undefined,
      generos: dados.generos?.length ? {
        create: await resolverGeneros(dados.generos)
      } : undefined,
      disponibilidades: dados.disponibilidades?.length ? {
        create: await resolverDisponibilidades(dados.disponibilidades)
      } : undefined,
      daws: dados.daws?.length ? {
        create: await resolverDaws(dados.daws)
      } : undefined,
    },
    include,
  })
  return mapUsuario(novo)
}

async function update({ id_usuario, ...dados }: UpdateUsuarioInput): Promise<Usuario> {
  const existe = await prisma.usuario.findUnique({ where: { id_usuario } })
  if (!existe) throw new HttpError(404, `Usuário com id ${id_usuario} não encontrado.`)

  // Limpa relacionamentos antes de recriar
  await prisma.usuarioInstrumento.deleteMany({ where: { id_usuario } })
  await prisma.usuarioGenero.deleteMany({ where: { id_usuario } })
  await prisma.usuarioDisponibilidade.deleteMany({ where: { id_usuario } })
  await prisma.usuarioDaw.deleteMany({ where: { id_usuario } })

  const atualizado = await prisma.usuario.update({
    where: { id_usuario },
    data: {
      nome_completo:    dados.nome_completo,
      nome_artistico:   dados.nome_artistico,
      email:            dados.email,
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
      disponibilidades: dados.disponibilidades?.length ? {
        create: await resolverDisponibilidades(dados.disponibilidades)
      } : undefined,
      daws: dados.daws?.length ? {
        create: await resolverDaws(dados.daws)
      } : undefined,
    },
    include,
  })
  return mapUsuario(atualizado)
}

async function remove(id: number): Promise<void> {
  const existe = await prisma.usuario.findUnique({ where: { id_usuario: id } })
  if (!existe) throw new HttpError(404, `Usuário com id ${id} não encontrado.`)
  await prisma.usuario.delete({ where: { id_usuario: id } })
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
  const r = await prisma.disponibilidade.findMany()
  return r.map(x => x.descricao)
}

// ── Resolvers de relacionamento ───────────────────────────────────────────────

async function resolverInstrumentos(nomes: string[]) {
  return Promise.all(nomes.map(async nome => {
    const inst = await prisma.instrumento.upsert({
      where: { nome }, update: {}, create: { nome }
    })
    return { id_instrumento: inst.id_instrumento }
  }))
}

async function resolverGeneros(nomes: string[]) {
  return Promise.all(nomes.map(async nome => {
    const gen = await prisma.genero.upsert({
      where: { nome }, update: {}, create: { nome }
    })
    return { id_genero: gen.id_genero }
  }))
}

async function resolverDisponibilidades(descricoes: string[]) {
  return Promise.all(descricoes.map(async descricao => {
    const disp = await prisma.disponibilidade.upsert({
      where: { descricao }, update: {}, create: { descricao }
    })
    return { id_disponibilidade: disp.id_disponibilidade }
  }))
}

async function resolverDaws(nomes: string[]) {
  return Promise.all(nomes.map(async nome => {
    const daw = await prisma.daw.upsert({
      where: { nome }, update: {}, create: { nome }
    })
    return { id_daw: daw.id_daw }
  }))
}
