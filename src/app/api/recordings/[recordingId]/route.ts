import { handleApi, readJsonBody } from '@/server/api-response';
import { requireAuth } from '@/server/auth';
import {
  deleteRecording,
  getRecording,
  updateRecording,
} from '@/server/services/recordings.service';
import { recordingParamsSchema } from '@/validation';

type Context = {
  params: Promise<{ recordingId: string }>;
};

export async function GET(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = recordingParamsSchema.parse(await context.params);
    return getRecording(params.recordingId);
  });
}

export async function PATCH(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = recordingParamsSchema.parse(await context.params);
    return updateRecording(params.recordingId, await readJsonBody(request));
  });
}

export async function DELETE(request: Request, context: Context) {
  return handleApi(async () => {
    await requireAuth(request);
    const params = recordingParamsSchema.parse(await context.params);
    return deleteRecording(params.recordingId);
  });
}
