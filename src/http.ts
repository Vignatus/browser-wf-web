import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export function parseBody<T>(schema: ZodSchema<T>, req: Request): T {
  return schema.parse(req.body);
}

export function parseQuery<T>(schema: ZodSchema<T>, req: Request): T {
  return schema.parse(req.query);
}

export function notFound(message = 'Not found'): never {
  throw new HttpError(404, message);
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Invalid request',
        issues: err.issues,
      },
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
      },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: {
      message: 'Internal server error',
    },
  });
}
