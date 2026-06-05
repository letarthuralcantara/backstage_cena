/**
 * HttpError — erro HTTP padronizado.
 * Lançado pelos models e controllers,
 * capturado pelo middleware errorHandler.
 */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'HttpError'
  }
}
