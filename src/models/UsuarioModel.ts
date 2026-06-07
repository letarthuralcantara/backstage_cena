import Database from '../database/database.js'
import { HttpError } from '../errors/HttpError.js'
import type { Usuario, CreateUsuarioInput, UpdateUsuarioInput } from '../types/index.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseArea(raw: string | null): string[] {
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

type DbConn = Awaited<ReturnType<typeof Database.connect>>

// ── Relacionamentos ───────────────────────────────────────────────────────────

async function carregarRelacionamentos(db: DbConn, u: Usuario): Promise<void> {
  const [insts, gens, disps, daws] = await Promise.all([
    db.all('SELECT i.nome FROM instrumento i JOIN usuario_instrumento ui ON i.id_instrumento=ui.id_instrumento WHERE ui.id_usuario=?', [u.id_usuario]),
    db.all('SELECT g.nome FROM genero g JOIN usuario_genero ug ON g.id_genero=ug.id_genero WHERE ug.id_usuario=?', [u.id_usuario]),
    db.all('SELECT d.descricao FROM disponibilidade d JOIN usuario_disponibilidade ud ON d.id_disponibilidade=ud.id_disponibilidade WHERE ud.id_usuario=?', [u.id_usuario]),
    db.all('SELECT dw.nome FROM daw dw JOIN usuario_daw udw ON dw.id_daw=udw.id_daw WHERE udw.id_usuario=?', [u.id_usuario]),
  ])
  u.instrumentos     = (insts as { nome: string }[]).map(r => r.nome)
  u.generos          = (gens  as { nome: string }[]).map(r => r.nome)
  u.disponibilidades = (disps as { descricao: string }[]).map(r => r.descricao)
  u.daws             = (daws  as { nome: string }[]).map(r => r.nome)
  try { u.redes_sociais = u.redes_sociais ? JSON.parse(u.redes_sociais as unknown as string) : {} }
  catch { u.redes_sociais = {} }
  u.area_atuacao      = parseArea(u.area_atuacao as string | null)
  u.cadastro_completo = calcularCompleto(u)
}

async function inserirRelacionamentos(db: DbConn, id: number, dados: CreateUsuarioInput): Promise<void> {
  const cats = [
    { lista: dados.instrumentos,     tabela: 'usuario_instrumento',     ref: 'id_instrumento',     busca: 'instrumento',     campo: 'nome' },
    { lista: dados.generos,          tabela: 'usuario_genero',          ref: 'id_genero',          busca: 'genero',          campo: 'nome' },
    { lista: dados.disponibilidades, tabela: 'usuario_disponibilidade', ref: 'id_disponibilidade', busca: 'disponibilidade', campo: 'descricao' },
    { lista: dados.daws,             tabela: 'usuario_daw',             ref: 'id_daw',             busca: 'daw',             campo: 'nome' },
  ]
  for (const cat of cats) {
    for (const nome of cat.lista ?? []) {
      const item = await db.get(`SELECT ${cat.ref} FROM ${cat.busca} WHERE ${cat.campo}=?`, [nome])
      if (item) await db.run(`INSERT OR IGNORE INTO ${cat.tabela} (id_usuario,${cat.ref}) VALUES (?,?)`, [id, item[cat.ref]])
    }
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

async function read(field?: string, value?: unknown): Promise<Usuario[]> {
  const db = await Database.connect()
  let sql = 'SELECT * FROM usuario WHERE cadastro_completo = 1'
  const params: unknown[] = []
  if (field && value !== undefined && value !== null && value !== '') {
    sql += ` AND ${field} = ?`
    params.push(value)
  }
  const rows = await db.all(sql, params) as Usuario[]
  for (const u of rows) await carregarRelacionamentos(db, u)
  await db.close()
  return rows
}

async function readById(id: number): Promise<Usuario> {
  const db = await Database.connect()
  const row = await db.get('SELECT * FROM usuario WHERE id_usuario=?', [id]) as Usuario | undefined
  if (!row) { await db.close(); throw new HttpError(404, `Usuário com id ${id} não encontrado.`) }
  await carregarRelacionamentos(db, row)
  await db.close()
  return row
}

async function findByEmail(email: string): Promise<Usuario | null> {
  const db = await Database.connect()
  const row = await db.get('SELECT * FROM usuario WHERE email=?', [email]) as Usuario | undefined
  if (!row) { await db.close(); return null }
  await carregarRelacionamentos(db, row)
  await db.close()
  return row
}

async function create(dados: CreateUsuarioInput): Promise<Usuario> {
  if (!dados.nome_completo || !dados.email || !dados.senha)
    throw new HttpError(400, 'Nome completo, email e senha são obrigatórios.')

  const db = await Database.connect()
  const existente = await db.get('SELECT id_usuario FROM usuario WHERE email=?', [dados.email])
  if (existente) { await db.close(); throw new HttpError(400, 'Email já cadastrado.') }

  const { lastID } = await db.run(
    `INSERT INTO usuario (nome_completo,nome_artistico,email,senha,telefone,cidade,estado,bairro,area_atuacao,anos_experiencia,biografia,cadastro_completo,redes_sociais)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      dados.nome_completo, dados.nome_artistico ?? dados.nome_completo,
      dados.email, dados.senha, dados.telefone ?? null,
      dados.cidade ?? null, dados.estado ?? null, dados.bairro ?? null,
      serializeArea(dados.area_atuacao), dados.anos_experiencia ?? 0,
      dados.biografia ?? null, 0,
      dados.redes_sociais ? JSON.stringify(dados.redes_sociais) : null,
    ]
  )
  await inserirRelacionamentos(db, lastID!, dados)
  await db.close()
  return readById(lastID!)
}

async function update({ id_usuario, ...dados }: UpdateUsuarioInput): Promise<Usuario> {
  const db = await Database.connect()
  const existe = await db.get('SELECT id_usuario FROM usuario WHERE id_usuario=?', [id_usuario])
  if (!existe) { await db.close(); throw new HttpError(404, `Usuário com id ${id_usuario} não encontrado.`) }

  await db.run(
    `UPDATE usuario SET nome_completo=?,nome_artistico=?,email=?,telefone=?,cidade=?,estado=?,bairro=?,area_atuacao=?,anos_experiencia=?,biografia=?,redes_sociais=? WHERE id_usuario=?`,
    [dados.nome_completo, dados.nome_artistico, dados.email, dados.telefone,
     dados.cidade, dados.estado, dados.bairro, serializeArea(dados.area_atuacao),
     dados.anos_experiencia ?? 0, dados.biografia,
     dados.redes_sociais ? JSON.stringify(dados.redes_sociais) : null, id_usuario]
  )

  const cats = [
    { lista: dados.instrumentos,     tabela: 'usuario_instrumento',     ref: 'id_instrumento',     busca: 'instrumento',     campo: 'nome' },
    { lista: dados.generos,          tabela: 'usuario_genero',          ref: 'id_genero',          busca: 'genero',          campo: 'nome' },
    { lista: dados.disponibilidades, tabela: 'usuario_disponibilidade', ref: 'id_disponibilidade', busca: 'disponibilidade', campo: 'descricao' },
    { lista: dados.daws,             tabela: 'usuario_daw',             ref: 'id_daw',             busca: 'daw',             campo: 'nome' },
  ]
  for (const cat of cats) {
    if (cat.lista !== undefined) {
      await db.run(`DELETE FROM ${cat.tabela} WHERE id_usuario=?`, [id_usuario])
      for (const nome of cat.lista ?? []) {
        const item = await db.get(`SELECT ${cat.ref} FROM ${cat.busca} WHERE ${cat.campo}=?`, [nome])
        if (item) await db.run(`INSERT OR IGNORE INTO ${cat.tabela} (id_usuario,${cat.ref}) VALUES (?,?)`, [id_usuario, item[cat.ref]])
      }
    }
  }
  await db.close()
  return readById(id_usuario)
}

async function remove(id: number): Promise<void> {
  const db = await Database.connect()
  const u = await db.get('SELECT id_usuario FROM usuario WHERE id_usuario=?', [id])
  if (!u) { await db.close(); throw new HttpError(404, `Usuário com id ${id} não encontrado.`) }
  await db.run('DELETE FROM usuario WHERE id_usuario=?', [id])
  await db.close()
}

// ── Catálogos ─────────────────────────────────────────────────────────────────

async function listarInstrumentos():    Promise<string[]> { const db = await Database.connect(); const r = await db.all('SELECT nome FROM instrumento ORDER BY nome'); await db.close(); return (r as {nome:string}[]).map(x=>x.nome) }
async function listarGeneros():         Promise<string[]> { const db = await Database.connect(); const r = await db.all('SELECT nome FROM genero ORDER BY nome'); await db.close(); return (r as {nome:string}[]).map(x=>x.nome) }
async function listarDaws():            Promise<string[]> { const db = await Database.connect(); const r = await db.all('SELECT nome FROM daw ORDER BY nome'); await db.close(); return (r as {nome:string}[]).map(x=>x.nome) }
async function listarDisponibilidades():Promise<string[]> { const db = await Database.connect(); const r = await db.all('SELECT descricao FROM disponibilidade'); await db.close(); return (r as {descricao:string}[]).map(x=>x.descricao) }

export default { read, readById, findByEmail, create, update, remove, listarInstrumentos, listarGeneros, listarDaws, listarDisponibilidades }