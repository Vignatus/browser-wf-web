import { handleApi } from '@/server/api-response';
import { requireAuth } from '@/server/auth';
import { listDashboardRecordings } from '@/server/services/dashboard.service';

export function GET(request: Request) {
  return handleApi(async () => {
    const user = await requireAuth(request);
    const recordings = await listDashboardRecordings(user.id);

    return { recordings };
  });
}
