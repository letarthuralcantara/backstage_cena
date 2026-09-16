import { Request, Response, NextFunction } from 'express'
import type { ZodType } from 'zod'
import { HttpError } from '../errors/HttpError.js'

/**
 * Recebe um schema Zod e devolve um middleware Express. O schema valida
 * body, query e params de uma vez só — por isso cada schema declara as
 * chaves que a rota realmente usa.
 */
export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    })

    if (!result.success) {
      next(new HttpError(400, 'Erro de validação', result.error.issues))
      return
    }

    const data = result.data as {
      body?: unknown
      query?: unknown
      params?: unknown
    }
    req.body = data.body ?? {}
    req.query = (data.query ?? {}) as Request['query']
    req.params = (data.params ?? {}) as Request['params']
    next()
  }
}