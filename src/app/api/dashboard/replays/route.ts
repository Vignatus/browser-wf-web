import { handleApi } from '@/server/api-response';
import { requireAuth } from '@/server/auth';
import { listDashboardReplays } from '@/server/services/dashboard.service';

export function GET(request: Request) {
  return handleApi(async () => {
    const user = await requireAuth(request);
    const replays = await listDashboardReplays(user.id);

    return { replays };
  });
}
