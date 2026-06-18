export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function notFound(message = 'Not found'): never {
  throw new HttpError(404, message);
}
