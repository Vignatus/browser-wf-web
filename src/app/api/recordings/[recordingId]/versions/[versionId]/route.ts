import { handleApi } from '@/server/api-response';
import { requireAuth } from '@/server/auth';
import {
  deleteRecordingVersion,
  getRecordingVersion,
} from '@/server/services/recordings.service';
import { recordingVersionParamsSchema } from '@/validation';

type Context = {
  params: Promise<{ recordingId: string; versionId: string }>;
};

export async function GET(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = recordingVersionParamsSchema.parse(await context.params);
    return getRecordingVersion(params.recordingId, params.versionId);
  });
}

export async function DELETE(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = recordingVersionParamsSchema.parse(await context.params);
    return deleteRecordingVersion(params.recordingId, params.versionId);
  });
}
