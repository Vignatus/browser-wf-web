import { handleApi, readJsonBody } from '@/server/api-response';
import { requireAuth } from '@/server/auth';
import { importRecording } from '@/server/services/recordings.service';

export function POST(request: Request) {
  return handleApi(async () => {
    const user = await requireAuth(request);
    return importRecording(user.id, await readJsonBody(request));
  }, 201);
}
