import { handleApi, readJsonBody } from '@/server/api-response';
import { createExtensionToken, login } from '@/server/auth';

// POST /api/auth/token — exchange credentials for a JWT bearer token (used by extension)
export async function POST(request: Request) {
  return handleApi(async () => {
    const result = await login(await readJsonBody(request));
    const token = await createExtensionToken(result.user);
    return { user: result.user, token };
  });
}
