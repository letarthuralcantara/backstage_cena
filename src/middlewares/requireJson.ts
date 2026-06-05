import { Request, Response, NextFunction } from 'express'

/**
 * Exige Content-Type: application/json em POST e PUT.
 * Retorna 415 Unsupported Media Type se não atender.
 */
export function requireJson(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (['POST', 'PUT'].includes(req.method) && !req.is('application/json')) {
    res.status(415).json({ erro: 'Content-Type deve ser application/json.' })
    return
  }
  next()
}
