import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession, SESSION_COOKIE_NAME } from '@/server/auth';
import { DashboardRecordings } from './dashboard-recordings';
import { DashboardReplays } from './dashboard-replays';
import { LogoutButton } from './logout-button';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const cookieStore = await cookies();
  const user = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!user) {
    redirect('/');
  }

  const params = await searchParams;
  const activeTab = params.tab === 'replays' ? 'replays' : 'recordings';

  const initials = getInitials(user.name);

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand">
          <div className="brand-mark">D</div>
          <span>Workflow Capture</span>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <a className={`nav-item${activeTab === 'recordings' ? ' active' : ''}`} href="/dashboard">
            <DocumentIcon />
            <span>Recordings</span>
          </a>
          <a className={`nav-item${activeTab === 'replays' ? ' active' : ''}`} href="/dashboard?tab=replays">
            <PlayCircleIcon />
            <span>Replays</span>
          </a>
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <h1>Workflow Dashboard</h1>

          <div className="header-actions">
            <button className="icon-button" aria-label="Notifications">
              <BellIcon />
            </button>
            <div className="user-menu">
              <div className="avatar">{initials}</div>
              <strong>{user.name}</strong>
              <span aria-hidden="true">⌄</span>
            </div>
            <LogoutButton />
          </div>
        </header>

        {activeTab === 'recordings' ? <DashboardRecordings /> : <DashboardReplays />}
      </section>
    </main>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
      <path d="M10 12h5M10 16h7" />
    </svg>
  );
}

function PlayCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8 6 4-6 4z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}
