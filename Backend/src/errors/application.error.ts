export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>,
    public readonly messageKey?: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
