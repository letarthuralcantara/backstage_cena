import { Request, Response, NextFunction } from 'express'
import { HttpError } from '../errors/HttpError.js'

/**
 * Middleware global de tratamento de erros.
 * Deve ser registrado após todas as rotas no server.ts.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ erro: err.message })
    return
  }
  const message = err instanceof Error ? err.message : 'Erro interno.'
  console.error(err)
  res.status(500).json({ erro: message })
}
