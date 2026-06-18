import { handleApi } from '@/server/api-response';
import { requireAuth } from '@/server/auth';
import { exportRecording } from '@/server/services/recordings.service';
import { recordingParamsSchema } from '@/validation';

type Context = {
  params: Promise<{ recordingId: string }>;
};

export async function GET(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = recordingParamsSchema.parse(await context.params);
    return exportRecording(params.recordingId);
  });
}
