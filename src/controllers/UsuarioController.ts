import { Request, Response, NextFunction } from 'express'
import usuarioService from '../models/UsuarioModel.js'
import { HttpError } from '../errors/HttpError.js'

class UsuarioController {
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { field, value } = req.query
      const usuarios = await usuarioService.read(field as string, value)
      res.json(usuarios)
    } catch (error) {
      next(error)
    }
  }

  async buscarPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      const usuario = await usuarioService.readById(id)
      res.json(usuario)
    } catch (error) {
      next(error)
    }
  }

  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const novoUsuario = await usuarioService.create(req.body)
      res.status(201).json(novoUsuario)
    } catch (error) {
      next(error)
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id_usuario = Number(req.params.id)
      const { status, ...rest } = req.body;
      const usuarioAtualizado = await usuarioService.update({ id_usuario, status, ...rest });
      res.json(usuarioAtualizado)
    } catch (error) {
      next(error)
    }
  }

  async remover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      await usuarioService.remove(id)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, senha } = req.body as { email?: string; senha?: string }
      if (!email || !senha) throw new HttpError(400, 'Email e senha são obrigatórios.')
      const usuario = await usuarioService.findByEmail(email)
      if (!usuario || usuario.senha !== senha) throw new HttpError(401, 'Email ou senha incorretos.')
      res.status(200).json(usuario)
    } catch (error) {
      next(error)
    }
  }

  async listarEstados(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'])
    } catch (error) {
      next(error)
    }
  }

  async listarAreas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(['Produção Musical', 'Mixagem', 'Masterização', 'Composição', 'Arranjo', 'Performance'])
    } catch (error) {
      next(error)
    }
  }

  async listarInstrumentos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const instrumentos = await usuarioService.listarInstrumentos()
      res.json(instrumentos)
    } catch (error) {
      next(error)
    }
  }

  async listarGeneros(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const generos = await usuarioService.listarGeneros()
      res.json(generos)
    } catch (error) {
      next(error)
    }
  }

  async listarDaws(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const daws = await usuarioService.listarDaws()
      res.json(daws)
    } catch (error) {
      next(error)
    }
  }

  async listarDisponibilidades(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const disponibilidades = await usuarioService.listarDisponibilidades()
      res.json(disponibilidades)
    } catch (error) {
      next(error)
    }
  }
}

export default new UsuarioController()