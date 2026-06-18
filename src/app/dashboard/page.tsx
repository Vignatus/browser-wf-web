import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession, SESSION_COOKIE_NAME } from '@/server/auth';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const user = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!user) {
    redirect('/');
  }

  return <main className="dashboard-page" />;
}
