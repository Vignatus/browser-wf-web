import { handleApi, queryFromUrl, readJsonBody } from '@/server/api-response';
import { requireAuth } from '@/server/auth';
import {
  createRecordingVersion,
  listRecordingVersions,
} from '@/server/services/recordings.service';
import { recordingParamsSchema } from '@/validation';

type Context = {
  params: Promise<{ recordingId: string }>;
};

export async function GET(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = recordingParamsSchema.parse(await context.params);
    return listRecordingVersions(params.recordingId, queryFromUrl(request.url));
  });
}

export async function POST(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = recordingParamsSchema.parse(await context.params);
    return createRecordingVersion(params.recordingId, await readJsonBody(request));
  }, 201);
}
