import { handleApi, queryFromUrl, readJsonBody } from '@/server/api-response';
import { requireAuth } from '@/server/auth';
import { createRecording, listRecordings } from '@/server/services/recordings.service';

export function GET(request: Request) {
  return handleApi(async () => {
    const user = await requireAuth(request);
    return listRecordings(user.id, queryFromUrl(request.url));
  });
}

export function POST(request: Request) {
  return handleApi(async () => {
    const user = await requireAuth(request);
    return createRecording(user.id, await readJsonBody(request));
  }, 201);
}
