import { Request, Response, NextFunction } from 'express'
import usuarioService from '../models/UsuarioModel.js'
import { HttpError } from '../errors/HttpError.js'
import bcrypt from 'bcryptjs'

class UsuarioController {
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { field, value } = req.query
      const usuarios = await usuarioService.read(field as string, value)
      res.json(usuarios)
    } catch (error) { next(error) }
  }

  async buscarPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      const usuario = await usuarioService.readById(id)
      res.json(usuario)
    } catch (error) { next(error) }
  }

  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const novoUsuario = await usuarioService.create(req.body)
      res.status(201).json(novoUsuario)
    } catch (error) { next(error) }
  }

  async atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id_usuario = Number(req.params.id)
      const usuarioAtualizado = await usuarioService.update({ id_usuario, ...req.body })
      res.json(usuarioAtualizado)
    } catch (error) { next(error) }
  }

  async remover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      await usuarioService.remove(id)
      res.status(204).send()
    } catch (error) { next(error) }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, senha } = req.body as { email?: string; senha?: string }
      if (!email || !senha) throw new HttpError(400, 'E-mail e senha são obrigatórios.')
      const usuario = await usuarioService.findByEmail(email)
      if (!usuario) throw new HttpError(401, 'E-mail ou senha incorretos.')
      const senhaCorreta = await bcrypt.compare(senha, usuario.senha)
      if (!senhaCorreta) throw new HttpError(401, 'E-mail ou senha incorretos.')
      res.status(200).json(usuario)
    } catch (error) { next(error) }
  }

  // ── Status ────────────────────────────────────────────────────────────────
  async atualizarStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      const { status } = req.body as { status?: string }
      if (!status) throw new HttpError(400, 'O campo status é obrigatório.')
      const usuario = await usuarioService.updateStatus(id, status)
      res.json(usuario)
    } catch (error) { next(error) }
  }

  // ── Configurações ─────────────────────────────────────────────────────────
  async getConfiguracoes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      const config = await usuarioService.getConfiguracoes(id)
      res.json(config)
    } catch (error) { next(error) }
  }

  async updateConfiguracoes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      const config = await usuarioService.updateConfiguracoes(id, req.body)
      res.json(config)
    } catch (error) { next(error) }
  }

  async alterarSenha(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      const { senha_atual, nova_senha, confirmar_senha } = req.body as {
        senha_atual?: string; nova_senha?: string; confirmar_senha?: string
      }
      if (!senha_atual || !nova_senha || !confirmar_senha)
        throw new HttpError(400, 'Preencha todos os campos de senha.')
      if (nova_senha !== confirmar_senha)
        throw new HttpError(400, 'A nova senha e a confirmação não coincidem.')
      await usuarioService.alterarSenha(id, senha_atual, nova_senha)
      res.json({ mensagem: 'Senha alterada com sucesso.' })
    } catch (error) { next(error) }
  }

  // ── Catálogos ─────────────────────────────────────────────────────────────
  async listarEstados(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'])
    } catch (error) { next(error) }
  }

  async listarAreas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(['Produção Musical','Mixagem','Masterização','Composição','Arranjo','Performance'])
    } catch (error) { next(error) }
  }

  async listarInstrumentos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json(await usuarioService.listarInstrumentos()) }
    catch (error) { next(error) }
  }

  async listarGeneros(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json(await usuarioService.listarGeneros()) }
    catch (error) { next(error) }
  }

  async listarDaws(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json(await usuarioService.listarDaws()) }
    catch (error) { next(error) }
  }

  async listarDisponibilidades(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json(await usuarioService.listarDisponibilidades()) }
    catch (error) { next(error) }
  }
}

export default new UsuarioController()