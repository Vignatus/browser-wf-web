import { handleApi } from '@/server/api-response';
import { requireAuth } from '@/server/auth';
import { activateRecordingVersion } from '@/server/services/recordings.service';
import { recordingVersionParamsSchema } from '@/validation';

type Context = {
  params: Promise<{ recordingId: string; versionId: string }>;
};

export async function POST(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = recordingVersionParamsSchema.parse(await context.params);
    return activateRecordingVersion(params.recordingId, params.versionId);
  });
}
