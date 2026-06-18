import { and, desc, eq, ilike, isNull, or, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { recordingVersions, recordings, replays } from '@/db/schema';

export type DashboardRecording = {
  id: string;
  name: string;
  stepCount: number;
  updatedAt: Date;
  lastReplayAt: Date | null;
  status: string;
};

export async function listDashboardRecordings(userId: string, search?: string) {
  const filters: SQL[] = [eq(recordings.userId, userId), isNull(recordings.deletedAt)];

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
      const [version] = recording.activeVersionId
        ? await db
            .select()
            .from(recordingVersions)
            .where(eq(recordingVersions.id, recording.activeVersionId))
            .limit(1)
        : await db
            .select()
            .from(recordingVersions)
            .where(eq(recordingVersions.recordingId, recording.id))
            .orderBy(desc(recordingVersions.versionNumber))
            .limit(1);

      const [latestReplay] = await db
        .select()
        .from(replays)
        .where(eq(replays.recordingId, recording.id))
        .orderBy(desc(replays.createdAt))
        .limit(1);

      return {
        id: recording.id,
        name: recording.name,
        stepCount: version?.stepCount ?? 0,
        updatedAt: recording.updatedAt,
        lastReplayAt: latestReplay?.endedAt ?? latestReplay?.createdAt ?? null,
        status: latestReplay?.status ?? recording.status,
      };
    }),
  );
}
