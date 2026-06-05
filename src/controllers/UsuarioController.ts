import { Request, Response, NextFunction } from 'express'
import UsuarioModel from '../models/UsuarioModel.js'
import { HttpError } from '../errors/HttpError.js'

/**
 * UsuarioController — trata as requisições HTTP.
 * Não contém SQL. Chama o Model e devolve respostas padronizadas.
 * Erros são passados ao middleware errorHandler via next(err).
 */
export class UsuarioController {

  // GET /api/usuarios
  static async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { disponibilidade } = req.query
      const resultado = await UsuarioModel.read(
        disponibilidade ? 'disponibilidade' : undefined,
        disponibilidade ?? undefined
      )
      res.status(200).json(resultado)
    } catch (err) { next(err) }
  }

  // GET /api/usuarios/estados
  static async listarEstados(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const usuarios = await UsuarioModel.read()
      const estados = [...new Set(usuarios.map(u => u.estado).filter(Boolean))].sort()
      res.status(200).json(estados)
    } catch (err) { next(err) }
  }

  // GET /api/usuarios/areas
  static async listarAreas(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const usuarios = await UsuarioModel.read()
      const areas = [...new Set(
        usuarios.flatMap(u => Array.isArray(u.area_atuacao) ? u.area_atuacao : u.area_atuacao ? [u.area_atuacao] : [])
      )].sort()
      res.status(200).json(areas)
    } catch (err) { next(err) }
  }

  // GET /api/usuarios/instrumentos
  static async listarInstrumentos(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await UsuarioModel.listarInstrumentos()) }
    catch (err) { next(err) }
  }

  // GET /api/usuarios/generos
  static async listarGeneros(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await UsuarioModel.listarGeneros()) }
    catch (err) { next(err) }
  }

  // GET /api/usuarios/daws
  static async listarDaws(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await UsuarioModel.listarDaws()) }
    catch (err) { next(err) }
  }

  // GET /api/usuarios/disponibilidades
  static async listarDisponibilidades(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await UsuarioModel.listarDisponibilidades()) }
    catch (err) { next(err) }
  }

  // GET /api/usuarios/:id
  static async buscarPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      if (isNaN(id)) throw new HttpError(400, 'ID inválido.')
      res.status(200).json(await UsuarioModel.readById(id))
    } catch (err) { next(err) }
  }

  // POST /api/usuarios/login
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, senha } = req.body as { email?: string; senha?: string }
      if (!email || !senha) throw new HttpError(400, 'Email e senha são obrigatórios.')
      const usuarios = await UsuarioModel.read()
      const usuario = usuarios.find(u => u.email === email && u.senha === senha)
      if (!usuario) throw new HttpError(401, 'Email ou senha incorretos.')
      res.status(200).json(usuario)
    } catch (err) { next(err) }
  }

  // POST /api/usuarios
  static async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const novoMusico = await UsuarioModel.create(req.body)
      res.status(201).json(novoMusico)
    } catch (err) { next(err) }
  }

  // PUT /api/usuarios/:id
  static async atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      if (isNaN(id)) throw new HttpError(400, 'ID inválido.')
      res.status(200).json(await UsuarioModel.update({ ...req.body, id_usuario: id }))
    } catch (err) { next(err) }
  }

  // DELETE /api/usuarios/:id
  static async remover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      if (isNaN(id)) throw new HttpError(400, 'ID inválido.')
      await UsuarioModel.remove(id)
      res.status(200).json({ mensagem: 'Conta removida com sucesso.' })
    } catch (err) { next(err) }
  }
}
