import { SignJWT, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { HttpError } from './errors';
import { loginSchema } from '@/validation';

export const SESSION_COOKIE_NAME = 'browser_wf_session';

const JWT_ALG = 'HS256';
const JWT_EXPIRY = '30d';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env var is required');
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export async function login(input: unknown) {
  const body = loginSchema.parse(input);
  const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);

  if (!user || user.password !== body.password) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const sessionUser: SessionUser = { id: user.id, name: user.name, email: user.email };

  return {
    user: sessionUser,
    cookieValue: encodeSession(sessionUser),
  };
}

export async function createExtensionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ name: user.name, email: user.email })
    .setProtectedHeader({ alg: JWT_ALG })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJwtSecret());
}

export async function requireAuth(request: Request): Promise<SessionUser> {
  // 1. Try Bearer JWT (used by extension)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      if (!payload.sub) throw new Error('Missing subject');
      return {
        id: payload.sub,
        name: payload['name'] as string,
        email: payload['email'] as string,
      };
    } catch {
      throw new HttpError(401, 'Invalid or expired token');
    }
  }

  // 2. Fall back to session cookie (used by web dashboard)
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const cookieValue = parseCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  const user = decodeSession(cookieValue);
  if (!user) throw new HttpError(401, 'Unauthorized');
  return user;
}

function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k.trim() === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function encodeSession(user: SessionUser) {
  return Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');
}

export function decodeSession(value: string | undefined): SessionUser | null {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    return JSON.parse(decoded) as SessionUser;
  } catch {
    return null;
  }
}
