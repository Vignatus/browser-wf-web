'use client';

import { useEffect, useState } from 'react';

export type DashboardReplayView = {
  id: string;
  recordingId: string;
  recordingName: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  error: Record<string, unknown> | null;
  summary: Record<string, unknown>;
  createdAt: string;
};

type DashboardReplaysProps = {
  initialReplays?: DashboardReplayView[];
};

export function DashboardReplays({ initialReplays = [] }: DashboardReplaysProps) {
  const [replays, setReplays] = useState(initialReplays);
  const [isLoading, setIsLoading] = useState(!initialReplays.length);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadReplays() {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/dashboard/replays', {
        cache: 'no-store',
      });

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setError('Unable to load replays.');
        setIsLoading(false);
        return;
      }

      const data = (await response.json()) as { replays?: DashboardReplayView[] };
      setReplays(data.replays ?? []);
      setIsLoading(false);
    }

    void loadReplays();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="recordings-card">
      <div className="recordings-card-header">
        <h2>Replay History</h2>
      </div>

      <div className="recordings-table-wrap">
        <table className="recordings-table replays-table">
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Replayed At <span aria-hidden="true">↓</span></th>
              <th>Result</th>
              <th>Duration / Notes</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="empty-state" colSpan={4}>
                  Loading replays...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="empty-state" colSpan={4}>
                  {error}
                </td>
              </tr>
            ) : replays.length ? (
              replays.map((replay) => (
                <tr key={replay.id}>
                  <td>
                    <div className="recording-name">
                      <PlayCircleIcon />
                      <strong>{replay.recordingName}</strong>
                    </div>
                  </td>
                  <td>{formatDateTime(replay.startedAt ?? replay.createdAt)}</td>
                  <td>
                    <StatusBadge status={replay.status} />
                  </td>
                  <td>
                    <div className="replay-duration-cell">
                      <span>{formatDuration(replay.durationMs)}</span>
                      {getNote(replay) ? (
                        <span className="replay-note">{getNote(replay)}</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-state" colSpan={4}>
                  No replays available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getNote(replay: DashboardReplayView): string | null {
  if (replay.error && typeof replay.error.message === 'string') {
    return replay.error.message;
  }
  return null;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized === 'success' || normalized === 'pass'
    ? 'success'
    : normalized === 'partial'
      ? 'partial'
      : normalized === 'failed' || normalized === 'fail' || normalized === 'error'
        ? 'failed'
        : 'neutral';

  return (
    <span className={`status-badge ${tone}`}>
      <span />
      {titleCase(status)}
    </span>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min} min ${sec} sec`;
  return `${sec} sec`;
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function PlayCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8 6 4-6 4z" />
    </svg>
  );
}
