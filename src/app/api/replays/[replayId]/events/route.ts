import { handleApi, queryFromUrl, readJsonBody } from '@/server/api-response';
import { requireAuth } from '@/server/auth';
import { createReplayEvents, listReplayEvents } from '@/server/services/replays.service';
import { replayParamsSchema } from '@/validation';

type Context = {
  params: Promise<{ replayId: string }>;
};

export async function GET(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = replayParamsSchema.parse(await context.params);
    return listReplayEvents(params.replayId, queryFromUrl(request.url));
  });
}

export async function POST(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = replayParamsSchema.parse(await context.params);
    return createReplayEvents(params.replayId, await readJsonBody(request));
  }, 201);
}
