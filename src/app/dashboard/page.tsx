import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession, SESSION_COOKIE_NAME } from '@/server/auth';
import { listDashboardRecordings } from '@/server/services/dashboard.service';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const user = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!user) {
    redirect('/');
  }

  const dashboardRecordings = await listDashboardRecordings(user.id);
  const initials = getInitials(user.name);

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand">
          <div className="brand-mark">D</div>
          <span>Workflow Capture</span>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <a className="nav-item active" href="/dashboard">
            <DocumentIcon />
            <span>Recordings</span>
          </a>
          <a className="nav-item" href="/dashboard">
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
          </div>
        </header>

        <div className="recordings-card">
          <div className="recordings-card-header">
            <h2>My Recordings</h2>
          </div>

          <div className="recordings-table-wrap">
            <table className="recordings-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Steps</th>
                  <th>Updated <span aria-hidden="true">↓</span></th>
                  <th>Last Replay</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {dashboardRecordings.length ? (
                  dashboardRecordings.map((recording) => (
                    <tr key={recording.id}>
                      <td>
                        <div className="recording-name">
                          <DocumentIcon />
                          <strong>{recording.name}</strong>
                        </div>
                      </td>
                      <td>{recording.stepCount}</td>
                      <td>{formatDateTime(recording.updatedAt)}</td>
                      <td>{recording.lastReplayAt ? formatDateTime(recording.lastReplayAt) : 'Not run'}</td>
                      <td>
                        <StatusBadge status={recording.status} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <a className="secondary-action" href={`/api/recordings/${recording.id}/export`}>
                            <EyeIcon />
                            View
                          </a>
                          <a className="secondary-action" href={`/dashboard?recording=${recording.id}`}>
                            <PencilIcon />
                            Edit
                          </a>
                          <button className="primary-action" type="button">
                            <PlayIcon />
                            Replay in Extension
                          </button>
                          <button className="more-action" type="button" aria-label={`More actions for ${recording.name}`}>
                            ...
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="empty-state" colSpan={6}>
                      No recordings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes('fail')
    ? 'failed'
    : normalized.includes('partial')
      ? 'partial'
      : normalized.includes('success') || normalized.includes('pass') || normalized === 'active'
        ? 'success'
        : 'neutral';
  const label = normalized === 'active' ? 'Success' : titleCase(status);

  return (
    <span className={`status-badge ${tone}`}>
      <span />
      {label}
    </span>
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
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

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l11-11-4-4L4 16z" />
      <path d="m13 7 4 4" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 5 11 7-11 7z" />
    </svg>
  );
}
