/**
 * Error carrying an explicit HTTP status.
 *
 * Business failures (validation, missing resource, insufficient rights,
 * conflict) must reach the client with a 4xx status so the front-end can show
 * the real reason instead of a generic "server unavailable" message.
 * Technical failures keep the default 500.
 */
export class HttpError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

export function errorStatus(error: any, fallback = 500): number {
  const status = Number(error?.statusCode ?? error?.status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : fallback;
}
