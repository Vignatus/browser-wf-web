import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { recordings, replays } from '@/db/schema';

export type DashboardReplay = {
  id: string;
  recordingId: string;
  recordingName: string;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
  durationMs: number | null;
  error: Record<string, unknown> | null;
  summary: Record<string, unknown>;
  createdAt: Date;
};

export async function listDashboardReplays(userId: string): Promise<DashboardReplay[]> {
  return db
    .select({
      id: replays.id,
      recordingId: replays.recordingId,
      recordingName: recordings.name,
      status: replays.status,
      startedAt: replays.startedAt,
      endedAt: replays.endedAt,
      durationMs: replays.durationMs,
      error: replays.error,
      summary: replays.summary,
      createdAt: replays.createdAt,
    })
    .from(replays)
    .innerJoin(recordings, eq(replays.recordingId, recordings.id))
    .where(eq(recordings.userId, userId))
    .orderBy(desc(replays.createdAt));
}

export type DashboardRecording = {
  id: string;
  name: string;
  description: string | null;
  stepCount: number;
  updatedAt: Date;
  lastReplayAt: Date | null;
  status: string;
  steps: unknown[];
};

export async function listDashboardRecordings(userId: string, search?: string) {
  const filters: SQL[] = [eq(recordings.userId, userId)];

  if (search) {
    filters.push(
      or(ilike(recordings.name, `%${search}%`), ilike(recordings.description, `%${search}%`))!,
    );
  }

  const rows = await db
    .select()
    .from(recordings)
    .where(and(...filters))
    .orderBy(desc(recordings.updatedAt));

  return Promise.all(
    rows.map(async (recording): Promise<DashboardRecording> => {
      const [latestReplay] = await db
        .select()
        .from(replays)
        .where(eq(replays.recordingId, recording.id))
        .orderBy(desc(replays.createdAt))
        .limit(1);

      return {
        id: recording.id,
        name: recording.name,
        description: recording.description || getDescription(recording.recordingJson),
        stepCount: recording.stepCount,
        updatedAt: recording.updatedAt,
        lastReplayAt: latestReplay?.endedAt ?? latestReplay?.createdAt ?? null,
        status: latestReplay?.status ?? recording.status,
        steps: getSteps(recording.recordingJson),
      };
    }),
  );
}

function getSteps(recordingJson: Record<string, unknown> | undefined) {
  if (!recordingJson || !Array.isArray(recordingJson.steps)) {
    return [];
  }

  return recordingJson.steps;
}

function getDescription(recordingJson: Record<string, unknown> | undefined) {
  return typeof recordingJson?.description === 'string' && recordingJson.description.trim()
    ? recordingJson.description
    : null;
}
