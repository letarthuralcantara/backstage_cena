/**
 * HttpError — erro HTTP padronizado.
 * Lançado pelos models e controllers,
 * capturado pelo middleware errorHandler.
 */

export class HttpError extends Error {
  code: number
  issues?: unknown[]

  constructor(code: number, message: string, issues?: unknown[]) {
    super(message)
    this.code = code
    this.issues = issues
  }
}
