import { handleApi, readJsonBody } from '@/server/api-response';
import { login, SESSION_COOKIE_NAME } from '@/server/auth';

export async function POST(request: Request) {
  return handleApi(async () => {
    const result = await login(await readJsonBody(request));

    return Response.json(
      { user: result.user },
      {
        headers: {
          'Set-Cookie': `${SESSION_COOKIE_NAME}=${result.cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
        },
      },
    );
  });
}
