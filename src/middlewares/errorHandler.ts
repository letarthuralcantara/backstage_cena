import { Request, Response, NextFunction } from 'express'
import { HttpError } from '../errors/HttpError.js'
import multer from 'multer'

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
    res.status(err.code).json({
      erro: err.message,
      ...(err.issues ? { issues: err.issues } : {}),
    })
    return
  }
  if (err instanceof multer.MulterError) {
    res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
      erro: err.code === 'LIMIT_FILE_SIZE' ? 'O arquivo excede o limite permitido.' : 'Falha no upload.',
    })
    return
  }
  console.error(err)
  res.status(500).json({ erro: 'Erro interno do servidor.' })
}
