import { prisma } from '../lib/prisma.js'
import { HttpError } from '../errors/HttpError.js'
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

function calcularCompleto(u: Usuario): number {
  return (u.area_atuacao as string[])?.length &&
    u.instrumentos?.length &&
    u.generos?.length &&
    u.cidade ? 1 : 0
}

// ── Mapeador: converte a linha do Prisma para a interface Usuario do frontend ──
//
// O Prisma retorna o registro da tabela "usuario" com campos extras incluídos
// via "include". Este mapeador achata tudo para a forma que o frontend espera,
// idêntica à que era produzida pelas queries SQLite diretas.

function mapUsuario(row: {
  id_usuario: number
  nome_completo: string
  nome_artistico: string
  email: string
  senha: string
  telefone: string | null
  cidade: string | null
  estado: string | null
  bairro: string | null
  area_atuacao: string | null
  anos_experiencia: number
  biografia: string | null
  cadastro_completo: number
  redes_sociais: string | null
  instrumentos?: { instrumento: { nome: string } }[]
  generos?:      { genero:      { nome: string } }[]
  disponibilidades?: { disponibilidade: { descricao: string } }[]
  daws?:         { daw:         { nome: string } }[]
}): Usuario {
  let redesSociais: Record<string, string> | null = null
  try { redesSociais = row.redes_sociais ? JSON.parse(row.redes_sociais) : null }
  catch { redesSociais = null }

  const u: Usuario = {
    id_usuario:        row.id_usuario,
    nome_completo:     row.nome_completo,
    nome_artistico:    row.nome_artistico,
    email:             row.email,
    senha:             row.senha,
    telefone:          row.telefone,
    cidade:            row.cidade,
    estado:            row.estado,
    bairro:            row.bairro,
    anos_experiencia:  row.anos_experiencia,
    biografia:         row.biografia,
    cadastro_completo: row.cadastro_completo,
    redes_sociais:     redesSociais,
    area_atuacao:      parseArea(row.area_atuacao),
    instrumentos:      row.instrumentos?.map(r => r.instrumento.nome) ?? [],
    generos:           row.generos?.map(r => r.genero.nome) ?? [],
    disponibilidades:  row.disponibilidades?.map(r => r.disponibilidade.descricao) ?? [],
    daws:              row.daws?.map(r => r.daw.nome) ?? [],
  }
  u.cadastro_completo = calcularCompleto(u)
  return u
}

// Include reutilizável: carrega todos os relacionamentos many-to-many de uma vez
const includeRelacionamentos = {
  instrumentos:    { include: { instrumento: true } },
  generos:         { include: { genero:      true } },
  disponibilidades:{ include: { disponibilidade: true } },
  daws:            { include: { daw:         true } },
} as const

// ── Helpers de relacionamento ─────────────────────────────────────────────────

/**
 * Dado um nome de instrumento, retorna seu id_instrumento (ou null se não encontrado).
 * Padrão idêntico ao `db.get('SELECT id_instrumento FROM instrumento WHERE nome=?')` original.
 */
async function resolverInstrumentoId(nome: string): Promise<number | null> {
  const r = await prisma.instrumento.findUnique({ where: { nome } })
  return r?.id_instrumento ?? null
}
async function resolverGeneroId(nome: string): Promise<number | null> {
  const r = await prisma.genero.findUnique({ where: { nome } })
  return r?.id_genero ?? null
}
async function resolverDisponibilidadeId(descricao: string): Promise<number | null> {
  const r = await prisma.disponibilidade.findUnique({ where: { descricao } })
  return r?.id_disponibilidade ?? null
}
async function resolverDawId(nome: string): Promise<number | null> {
  const r = await prisma.daw.findUnique({ where: { nome } })
  return r?.id_daw ?? null
}

/**
 * Apaga todos os vínculos do usuário e recria apenas os enviados.
 * Equivalente ao loop DELETE + INSERT OR IGNORE do código SQLite original.
 */
async function sincronizarRelacionamentos(
  id_usuario: number,
  dados: Pick<CreateUsuarioInput, 'instrumentos' | 'generos' | 'disponibilidades' | 'daws'>,
): Promise<void> {
  // Instrumentos
  if (dados.instrumentos !== undefined) {
    await prisma.usuarioInstrumento.deleteMany({ where: { id_usuario } })
    for (const nome of dados.instrumentos ?? []) {
      const id = await resolverInstrumentoId(nome)
      if (id !== null) {
        await prisma.usuarioInstrumento.createMany({
          data: [{ id_usuario, id_instrumento: id }],
          skipDuplicates: true,
        })
      }
    }
  }

  // Gêneros
  if (dados.generos !== undefined) {
    await prisma.usuarioGenero.deleteMany({ where: { id_usuario } })
    for (const nome of dados.generos ?? []) {
      const id = await resolverGeneroId(nome)
      if (id !== null) {
        await prisma.usuarioGenero.createMany({
          data: [{ id_usuario, id_genero: id }],
          skipDuplicates: true,
        })
      }
    }
  }

  // Disponibilidades
  if (dados.disponibilidades !== undefined) {
    await prisma.usuarioDisponibilidade.deleteMany({ where: { id_usuario } })
    for (const descricao of dados.disponibilidades ?? []) {
      const id = await resolverDisponibilidadeId(descricao)
      if (id !== null) {
        await prisma.usuarioDisponibilidade.createMany({
          data: [{ id_usuario, id_disponibilidade: id }],
          skipDuplicates: true,
        })
      }
    }
  }

  // DAWs
  if (dados.daws !== undefined) {
    await prisma.usuarioDaw.deleteMany({ where: { id_usuario } })
    for (const nome of dados.daws ?? []) {
      const id = await resolverDawId(nome)
      if (id !== null) {
        await prisma.usuarioDaw.createMany({
          data: [{ id_usuario, id_daw: id }],
          skipDuplicates: true,
        })
      }
    }
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * read(field?, value?)
 * Lista todos os usuários com cadastro_completo = 1.
 * Se field e value forem passados, filtra por campo adicional.
 *
 * Antes: db.all('SELECT * FROM usuario WHERE cadastro_completo=1 AND field=?')
 * Agora: prisma.usuario.findMany({ where: { cadastro_completo: 1, [field]: value } })
 */
async function read(field?: string, value?: unknown): Promise<Usuario[]> {
  // Monta o objeto where dinamicamente, igual ao SQL montado com string no original
  const where: Record<string, unknown> = { cadastro_completo: 1 }
  if (field && value !== undefined && value !== null && value !== '') {
    where[field] = value
  }

  const rows = await prisma.usuario.findMany({
    where: where as Parameters<typeof prisma.usuario.findMany>[0]['where'],
    include: includeRelacionamentos,
  })

  return rows.map(mapUsuario)
}

/**
 * readById(id)
 * Busca um usuário pelo id_usuario.
 * Lança HttpError 404 se não encontrado — mesmo comportamento do original.
 */
async function readById(id: number): Promise<Usuario> {
  const row = await prisma.usuario.findUnique({
    where: { id_usuario: id },
    include: includeRelacionamentos,
  })
  if (!row) throw new HttpError(404, `Usuário com id ${id} não encontrado.`)
  return mapUsuario(row)
}

/**
 * findByEmail(email)
 * Usado pelo login. Retorna null se não encontrado (não lança erro).
 */
async function findByEmail(email: string): Promise<Usuario | null> {
  const row = await prisma.usuario.findUnique({
    where: { email },
    include: includeRelacionamentos,
  })
  if (!row) return null
  return mapUsuario(row)
}

/**
 * create(dados)
 * Cria o registro em "usuario" e depois insere os vínculos many-to-many.
 * Retorna o usuário completo via readById, garantindo a mesma forma de retorno.
 */
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
      cidade:           dados.cidade   ?? null,
      estado:           dados.estado   ?? null,
      bairro:           dados.bairro   ?? null,
      area_atuacao:     serializeArea(dados.area_atuacao),
      anos_experiencia: dados.anos_experiencia ?? 0,
      biografia:        dados.biografia ?? null,
      cadastro_completo: 0,
      redes_sociais:    dados.redes_sociais ? JSON.stringify(dados.redes_sociais) : null,
    },
  })

  // Insere os vínculos many-to-many (instrumentos, gêneros, daws, disponibilidades)
  await sincronizarRelacionamentos(novo.id_usuario, {
    instrumentos:    dados.instrumentos,
    generos:         dados.generos,
    disponibilidades:dados.disponibilidades,
    daws:            dados.daws,
  })

  return readById(novo.id_usuario)
}

/**
 * update({ id_usuario, ...dados })
 * Atualiza o registro e sincroniza os vínculos.
 * Somente atualiza uma categoria de vínculo se o campo correspondente foi enviado.
 */
async function update({ id_usuario, ...dados }: UpdateUsuarioInput): Promise<Usuario> {
  const existe = await prisma.usuario.findUnique({ where: { id_usuario } })
  if (!existe) throw new HttpError(404, `Usuário com id ${id_usuario} não encontrado.`)

  await prisma.usuario.update({
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
    },
  })

  // Sincroniza apenas as categorias que vieram no payload
  await sincronizarRelacionamentos(id_usuario, {
    instrumentos:    dados.instrumentos,
    generos:         dados.generos,
    disponibilidades:dados.disponibilidades,
    daws:            dados.daws,
  })

  return readById(id_usuario)
}

/**
 * remove(id)
 * Remove o usuário. O CASCADE no banco já apaga os vínculos.
 */
async function remove(id: number): Promise<void> {
  const u = await prisma.usuario.findUnique({ where: { id_usuario: id } })
  if (!u) throw new HttpError(404, `Usuário com id ${id} não encontrado.`)
  await prisma.usuario.delete({ where: { id_usuario: id } })
}

// ── Catálogos ─────────────────────────────────────────────────────────────────

async function listarInstrumentos(): Promise<string[]> {
  const rows = await prisma.instrumento.findMany({ orderBy: { nome: 'asc' } })
  return rows.map(r => r.nome)
}

async function listarGeneros(): Promise<string[]> {
  const rows = await prisma.genero.findMany({ orderBy: { nome: 'asc' } })
  return rows.map(r => r.nome)
}

async function listarDaws(): Promise<string[]> {
  const rows = await prisma.daw.findMany({ orderBy: { nome: 'asc' } })
  return rows.map(r => r.nome)
}

async function listarDisponibilidades(): Promise<string[]> {
  const rows = await prisma.disponibilidade.findMany()
  return rows.map(r => r.descricao)
}

export default {
  read,
  readById,
  findByEmail,
  create,
  update,
  remove,
  listarInstrumentos,
  listarGeneros,
  listarDaws,
  listarDisponibilidades,
}