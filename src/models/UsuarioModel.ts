import prisma from '../database/prisma.js'
import { HttpError } from '../errors/HttpError.js'
import { hash as argon2Hash, verify as argon2Verify } from 'argon2'
import { randomInt } from 'node:crypto'
import type { Usuario, CreateUsuarioInput, UpdateUsuarioInput } from '../types/index.js'
import { cadastroCompleto, sanitizeUsuario } from '../utils/usuario.js'

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
export { cadastroCompleto, sanitizeUsuario } from '../utils/usuario.js'

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
  const existente = await prisma.usuario.findUnique({ where: { email: dados.email } })
  if (existente) throw new HttpError(409, 'Este e-mail já está cadastrado. Tente fazer login.')

  const senhaHash = await argon2Hash(dados.senha)

  let novo
  try {
    novo = await prisma.usuario.create({
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
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw new HttpError(409, 'Este e-mail já está cadastrado. Tente fazer login.')
    }
    throw error
  }
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

  if (dados.instrumentos !== undefined) await prisma.usuarioInstrumento.deleteMany({ where: { id_usuario } })
  if (dados.generos !== undefined) await prisma.usuarioGenero.deleteMany({ where: { id_usuario } })
  if (dados.daws !== undefined) await prisma.usuarioDaw.deleteMany({ where: { id_usuario } })
  if (dados.disponibilidades !== undefined) await prisma.usuarioDisponibilidade.deleteMany({ where: { id_usuario } })

  const atualizado = await prisma.usuario.update({
    where: { id_usuario },
    data: {
      ...(dados.nome_completo !== undefined ? { nome_completo: dados.nome_completo } : {}),
      ...(dados.nome_artistico !== undefined ? { nome_artistico: dados.nome_artistico } : {}),
      ...(dados.email !== undefined ? { email: dados.email } : {}),
      ...(senhaFinal ? { senha: senhaFinal } : {}),
      ...(dados.telefone !== undefined ? { telefone: dados.telefone } : {}),
      ...(dados.cidade !== undefined ? { cidade: dados.cidade } : {}),
      ...(dados.estado !== undefined ? { estado: dados.estado } : {}),
      ...(dados.bairro !== undefined ? { bairro: dados.bairro } : {}),
      ...(dados.area_atuacao !== undefined ? { area_atuacao: serializeArea(dados.area_atuacao) } : {}),
      ...(dados.anos_experiencia !== undefined ? { anos_experiencia: dados.anos_experiencia } : {}),
      ...(dados.biografia !== undefined ? { biografia: dados.biografia } : {}),
      ...(dados.redes_sociais !== undefined ? { redes_sociais: dados.redes_sociais ? JSON.stringify(dados.redes_sociais) : null } : {}),
      ...(dados.status !== undefined ? { status: dados.status } : {}),
      ...(dados.instrumentos !== undefined && dados.instrumentos.length ? { instrumentos: {
        create: await resolverInstrumentos(dados.instrumentos)
      } } : {}),
      ...(dados.generos !== undefined && dados.generos.length ? { generos: {
        create: await resolverGeneros(dados.generos)
      } } : {}),
      ...(dados.daws !== undefined && dados.daws.length ? { daws: {
        create: await resolverDaws(dados.daws)
      } } : {}),
      ...(dados.disponibilidades !== undefined && dados.disponibilidades.length ? { disponibilidades: {
        create: await resolverDisponibilidades(dados.disponibilidades)
      } } : {}),
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
  const senhaCorreta = await argon2Verify(usuario.senha, senhaAtual)
  if (!senhaCorreta) throw new HttpError(401, 'Senha atual incorreta.')
  const novoHash = await argon2Hash(novaSenha)
  await prisma.usuario.update({ where: { id_usuario }, data: { senha: novoHash } })
}

// ── Esqueci minha senha ──────────────────────────────────────────────────────
const RESET_CODIGO_VALIDADE_MIN = 15

function gerarCodigoNumerico(): string {
  // 6 dígitos, sempre com zero à esquerda quando necessário (ex.: "004821").
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/**
 * Gera um código de redefinição para o e-mail informado e retorna o usuário +
 * o código em texto puro (para o Controller enviar por e-mail).
 * Se o e-mail não existir, retorna null — quem decide a resposta HTTP nesse
 * caso é o Controller (por segurança, a resposta ao cliente deve ser igual
 * em ambos os casos, pra não revelar quais e-mails estão cadastrados).
 */
async function gerarCodigoRedefinicao(email: string): Promise<{ usuario: { id_usuario: number; email: string; nome_completo: string }; codigo: string } | null> {
  const usuario = await prisma.usuario.findUnique({ where: { email }, select: { id_usuario: true, email: true, nome_completo: true } })
  if (!usuario) return null

  const codigo = gerarCodigoNumerico()
  const expiraEm = new Date(Date.now() + RESET_CODIGO_VALIDADE_MIN * 60 * 1000)

  await prisma.usuario.update({
    where: { id_usuario: usuario.id_usuario },
    data: { codigo_reset_senha: codigo, codigo_reset_expira_em: expiraEm },
  })

  return { usuario, codigo }
}

/**
 * Confere o código e, se válido, troca a senha e invalida o código (uso único).
 */
async function redefinirSenhaComCodigo(email: string, codigo: string, novaSenha: string): Promise<void> {
  const usuario = await prisma.usuario.findUnique({ where: { email } })
  // Mesma mensagem genérica tanto pra e-mail inexistente quanto pra código
  // errado/expirado — não dá pra um atacante descobrir por tentativa e erro
  // se o e-mail existe só observando a resposta.
  const codigoInvalido = () => new HttpError(400, 'Código inválido ou expirado.')

  if (!usuario || !usuario.codigo_reset_senha || !usuario.codigo_reset_expira_em) {
    throw codigoInvalido()
  }
  if (usuario.codigo_reset_senha !== codigo) {
    throw codigoInvalido()
  }
  if (usuario.codigo_reset_expira_em.getTime() < Date.now()) {
    throw codigoInvalido()
  }
  const novoHash = await argon2Hash(novaSenha)
  await prisma.usuario.update({
    where: { id_usuario: usuario.id_usuario },
    data: { senha: novoHash, codigo_reset_senha: null, codigo_reset_expira_em: null },
  })
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
  gerarCodigoRedefinicao, redefinirSenhaComCodigo,
  listarInstrumentos, listarGeneros, listarDaws, listarDisponibilidades,
}