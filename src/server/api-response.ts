import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from './errors';

export async function handleApi<T>(handler: () => Promise<T>, status = 200) {
  try {
    const result = await handler();
    if (result instanceof Response) {
      return result;
    }

    return NextResponse.json(result, { status });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            message: 'Invalid request',
            issues: err.issues,
          },
        },
        { status: 400 },
      );
    }

    if (err instanceof HttpError) {
      return NextResponse.json(
        {
          error: {
            message: err.message,
          },
        },
        { status: err.statusCode },
      );
    }

    console.error(err);
    return NextResponse.json(
      {
        error: {
          message: 'Internal server error',
        },
      },
      { status: 500 },
    );
  }
}

export async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

export function queryFromUrl(url: string) {
  return Object.fromEntries(new URL(url).searchParams.entries());
}
