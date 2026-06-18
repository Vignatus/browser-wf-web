import { handleApi, queryFromUrl, readJsonBody } from '@/server/api-response';
import { requireAuth } from '@/server/auth';
import { createReplay, listReplays } from '@/server/services/replays.service';
import { recordingParamsSchema } from '@/validation';

type Context = {
  params: Promise<{ recordingId: string }>;
};

export async function GET(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = recordingParamsSchema.parse(await context.params);
    return listReplays(params.recordingId, queryFromUrl(request.url));
  });
}

export async function POST(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = recordingParamsSchema.parse(await context.params);
    return createReplay(params.recordingId, await readJsonBody(request));
  }, 201);
}
