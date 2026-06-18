'use client';

import { useEffect, useMemo, useState } from 'react';

export type DashboardStep = Record<string, unknown>;

export type DashboardRecordingView = {
  id: string;
  name: string;
  description: string | null;
  stepCount: number;
  updatedAt: string;
  lastReplayAt: string | null;
  status: string;
  steps: DashboardStep[];
};

type DashboardRecordingsProps = {
  initialRecordings?: DashboardRecordingView[];
};

export function DashboardRecordings({ initialRecordings = [] }: DashboardRecordingsProps) {
  const [recordings, setRecordings] = useState(initialRecordings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialRecordings.length);
  const [error, setError] = useState('');
  const selectedRecording = useMemo(
    () => recordings.find((recording) => recording.id === selectedId) ?? null,
    [recordings, selectedId],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadRecordings() {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/dashboard/recordings', {
        cache: 'no-store',
      });

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setError('Unable to load recordings.');
        setIsLoading(false);
        return;
      }

      const data = (await response.json()) as { recordings?: DashboardRecordingView[] };
      setRecordings((data.recordings ?? []).map(normalizeRecording));
      setIsLoading(false);
    }

    void loadRecordings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function deleteRecording(recordingId: string) {
    const response = await fetch(`/api/recordings/${recordingId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      return;
    }

    setRecordings((current) => current.filter((recording) => recording.id !== recordingId));
    setSelectedId((current) => (current === recordingId ? null : current));
  }

  return (
    <>
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
              {isLoading ? (
                <tr>
                  <td className="empty-state" colSpan={6}>
                    Loading recordings...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="empty-state" colSpan={6}>
                    {error}
                  </td>
                </tr>
              ) : recordings.length ? (
                recordings.map((recording) => (
                  <tr
                    key={recording.id}
                    className="recording-row"
                    onClick={() => setSelectedId(recording.id)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedId(recording.id);
                      }
                    }}
                  >
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
                        <a
                          className="secondary-action"
                          href={`/dashboard?recording=${recording.id}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <PencilIcon />
                          Edit
                        </a>
                        <button
                          className="primary-action"
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <PlayIcon />
                          Replay
                        </button>
                        <button
                          className="delete-action"
                          type="button"
                          aria-label={`Delete ${recording.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteRecording(recording.id);
                          }}
                        >
                          <TrashIcon />
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

      {selectedRecording ? (
        <div className="side-panel-layer" onMouseDown={() => setSelectedId(null)}>
          <aside
            className="steps-panel"
            aria-label={`${selectedRecording.name} steps`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="steps-panel-header">
              <div>
                <span>Recording steps</span>
                <h3>{selectedRecording.name}</h3>
                <p>{selectedRecording.description?.trim() || 'No description provided.'}</p>
              </div>
              <button type="button" aria-label="Close steps panel" onClick={() => setSelectedId(null)}>
                ×
              </button>
            </div>

            {selectedRecording.steps.length ? (
              <ol className="steps-list">
                {selectedRecording.steps.map((step, index) => (
                  <li key={getStepKey(step, index)}>
                    <div className="step-index">{index + 1}</div>
                    <div className="step-body">
                      <div className="step-title-row">
                        <span className="step-type">{getStepType(step)}</span>
                        <strong>{getStepLabel(step)}</strong>
                      </div>
                      <StepMeta label="Selector" value={getString(step.selector) ?? getString(getTarget(step)?.primarySelector)} />
                      <StepMeta label="URL" value={getString(step.url)} />
                      <StepMeta label="Value" value={getString(step.value)} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="steps-empty">No steps were saved for this recording.</p>
            )}
          </aside>
        </div>
      ) : null}
    </>
  );
}

function normalizeRecording(recording: DashboardRecordingView): DashboardRecordingView {
  return {
    ...recording,
    steps: Array.isArray(recording.steps) ? recording.steps.filter(isStepObject) : [],
  };
}

function isStepObject(step: unknown): step is DashboardStep {
  return Boolean(step) && typeof step === 'object' && !Array.isArray(step);
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

function getStepKey(step: DashboardStep, index: number) {
  return getString(step.id) ?? `${getStepType(step)}-${index}`;
}

function getStepType(step: DashboardStep) {
  return titleCase(getString(step.stepType) ?? getString(step.type) ?? 'step');
}

function getStepLabel(step: DashboardStep) {
  return getString(step.label) ?? getString(step.text) ?? getString(step.name) ?? getStepType(step);
}

function getTarget(step: DashboardStep) {
  const target = step.target;
  return target && typeof target === 'object' && !Array.isArray(target)
    ? (target as Record<string, unknown>)
    : null;
}

function getString(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  return value.trim();
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 15h10l1-15" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
