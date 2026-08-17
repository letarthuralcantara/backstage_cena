import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  try {
    const { authorization } = req.headers
    if (!authorization) {
      res.status(401).json({ erro: 'Token não informado.' })
      return
    }

    const [scheme, token] = authorization.split(' ')
    if (!/^Bearer$/i.test(scheme) || !token) {
      res.status(401).json({ erro: 'Formato de token inválido.' })
      return
    }

    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET não configurado.')

    const payload = jwt.verify(token, secret) as { userId: number }
    req.userId = payload.userId
    next()
  } catch (error) {
    res.status(401).json({ erro: 'Token inválido ou expirado.' })
  }
}

export function isOwner(req: Request, res: Response, next: NextFunction): void {
  const id = Number(req.params.id)
  if (req.userId !== id) {
    res.status(403).json({ erro: 'Você não tem permissão para acessar este recurso.' })
    return
  }
  next()
}