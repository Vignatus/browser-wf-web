'use client';

import { useEffect, useMemo, useState } from 'react';

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

type ReplayEventView = {
  id: string;
  replayId: string;
  sequence: number;
  type: string;
  timestamp: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export function DashboardReplays({ initialReplays = [] }: DashboardReplaysProps) {
  const [replays, setReplays] = useState(initialReplays);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<ReplayEventView[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState('');
  const [isLoading, setIsLoading] = useState(!initialReplays.length);
  const [error, setError] = useState('');
  const selectedReplay = useMemo(
    () => replays.find((replay) => replay.id === selectedId) ?? null,
    [replays, selectedId],
  );

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

  useEffect(() => {
    if (!selectedId) {
      setEvents([]);
      setEventsError('');
      setEventsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadReplayEvents() {
      setEvents([]);
      setEventsError('');
      setEventsLoading(true);

      const response = await fetch(`/api/replays/${selectedId}/events?limit=100`, {
        cache: 'no-store',
      });

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setEventsError('Unable to load replay events.');
        setEventsLoading(false);
        return;
      }

      const data = (await response.json()) as { events?: ReplayEventView[] };
      setEvents(data.events ?? []);
      setEventsLoading(false);
    }

    void loadReplayEvents();

    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  return (
    <>
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
                  <tr
                    key={replay.id}
                    className="recording-row"
                    onClick={() => setSelectedId(replay.id)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedId(replay.id);
                      }
                    }}
                  >
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

      {selectedReplay ? (
        <div className="side-panel-layer" onMouseDown={() => setSelectedId(null)}>
          <aside
            className="steps-panel"
            aria-label={`${selectedReplay.recordingName} replay events`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="steps-panel-header">
              <div>
                <span>Replay events</span>
                <h3>{selectedReplay.recordingName}</h3>
                <p>
                  {formatDateTime(selectedReplay.startedAt ?? selectedReplay.createdAt)}
                  {' · '}
                  {formatDuration(selectedReplay.durationMs)}
                </p>
              </div>
              <button type="button" aria-label="Close replay events panel" onClick={() => setSelectedId(null)}>
                ×
              </button>
            </div>

            {eventsLoading ? (
              <p className="steps-empty">Loading replay events...</p>
            ) : eventsError ? (
              <p className="steps-empty">{eventsError}</p>
            ) : events.length ? (
              <ol className="steps-list">
                {events.map((event) => (
                  <li key={event.id}>
                    <div className="step-index">{event.sequence + 1}</div>
                    <div className="step-body">
                      <div className="step-title-row">
                        <span className="step-type">{titleCase(event.type)}</span>
                        <strong>{getEventLabel(event)}</strong>
                      </div>
                      <StepMeta label="Status" value={getPayloadString(event.payload, 'status')} />
                      <StepMeta label="Detail" value={getPayloadString(event.payload, 'detail')} />
                      <StepMeta label="Timestamp" value={event.timestamp ? formatDateTime(event.timestamp) : undefined} />
                      <StepMeta label="Payload" value={getExtraPayload(event.payload)} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="steps-empty">No events were saved for this replay.</p>
            )}
          </aside>
        </div>
      ) : null}
    </>
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

function StepMeta({ label, value }: { label: string; value: string | undefined }) {
  if (!value) {
    return null;
  }

  return (
    <p className="step-meta">
      <span>{label}</span>
      <code>{value}</code>
    </p>
  );
}

function getEventLabel(event: ReplayEventView) {
  return getPayloadString(event.payload, 'label') ?? titleCase(event.type);
}

function getPayloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  return value.trim();
}

function getExtraPayload(payload: Record<string, unknown>) {
  const extra = Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => (
      !['label', 'status', 'detail'].includes(key) && value !== undefined && value !== null
    )),
  );

  return Object.keys(extra).length ? JSON.stringify(extra) : undefined;
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
