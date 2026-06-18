import { handleApi, readJsonBody } from '@/server/api-response';
import { requireAuth } from '@/server/auth';
import { getReplay, updateReplay } from '@/server/services/replays.service';
import { replayParamsSchema } from '@/validation';

type Context = {
  params: Promise<{ replayId: string }>;
};

export async function GET(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = replayParamsSchema.parse(await context.params);
    return getReplay(params.replayId);
  });
}

export async function PATCH(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = replayParamsSchema.parse(await context.params);
    return updateReplay(params.replayId, await readJsonBody(request));
  });
}
