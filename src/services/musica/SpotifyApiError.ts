export class SpotifyApiError extends Error {
  status: number;
  retryAfter?: string;
  code?: string;

  constructor(message: string, status: number, options: { retryAfter?: string; code?: string } = {}) {
    super(message);
    this.status = status;
    this.retryAfter = options.retryAfter;
    this.code = options.code;
  }
}
