import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { recordingVersions, recordings } from '@/db/schema';
import { HttpError, notFound } from '../errors';
import {
  createRecordingSchema,
  createVersionSchema,
  importRecordingSchema,
  listQuerySchema,
  listRecordingsQuerySchema,
  updateRecordingSchema,
} from '@/validation';
import { buildVersionInsert, getVersionOrThrow, toVersionSummary } from './versions.service';

export async function createRecording(userId: string, input: unknown) {
  const body = createRecordingSchema.parse(input);
  const [recording] = await db.insert(recordings).values({ ...body, userId }).returning();

  return { recording };
}

export async function importRecording(userId: string, input: unknown) {
  const body = importRecordingSchema.parse(input);

  return db.transaction(async (tx) => {
    const [recording] = await tx.insert(recordings).values({ ...body.recording, userId }).returning();
    const versionInput = buildVersionInsert(recording.id, 1, body.version);
    const [version] = await tx.insert(recordingVersions).values(versionInput).returning();
    const [updatedRecording] = await tx
      .update(recordings)
      .set({ activeVersionId: version.id, updatedAt: new Date() })
      .where(eq(recordings.id, recording.id))
      .returning();

    return { recording: updatedRecording, version };
  });
}

export async function listRecordings(userId: string, input: unknown) {
  const query = listRecordingsQuerySchema.parse(input);
  const filters: SQL[] = [eq(recordings.userId, userId)];

  if (query.status) {
    filters.push(eq(recordings.status, query.status));
  } else {
    filters.push(isNull(recordings.deletedAt));
  }

  if (query.q) {
    filters.push(
      or(ilike(recordings.name, `%${query.q}%`), ilike(recordings.description, `%${query.q}%`))!,
    );
  }

  if (query.tag) {
    filters.push(sql`${recordings.tags} @> ARRAY[${query.tag}]::text[]`);
  }

  const orderBy =
    query.sort === 'name'
      ? asc(recordings.name)
      : query.sort === 'updated_at'
        ? desc(recordings.updatedAt)
        : desc(recordings.createdAt);

  const rows = await db
    .select()
    .from(recordings)
    .where(and(...filters))
    .orderBy(orderBy)
    .limit(query.limit + 1)
    .offset(query.cursor);

  const hasMore = rows.length > query.limit;

  return {
    recordings: hasMore ? rows.slice(0, query.limit) : rows,
    nextCursor: hasMore ? query.cursor + query.limit : null,
  };
}

export async function getRecording(recordingId: string) {
  const recording = await getRecordingOrThrow(recordingId);

  const [activeVersion] = recording.activeVersionId
    ? await db
        .select()
        .from(recordingVersions)
        .where(eq(recordingVersions.id, recording.activeVersionId))
        .limit(1)
    : [];

  const [latestVersion] = await db
    .select()
    .from(recordingVersions)
    .where(eq(recordingVersions.recordingId, recordingId))
    .orderBy(desc(recordingVersions.versionNumber))
    .limit(1);

  return {
    recording,
    activeVersion: activeVersion ? toVersionSummary(activeVersion) : null,
    latestVersion: latestVersion ? toVersionSummary(latestVersion) : null,
  };
}

export async function updateRecording(recordingId: string, input: unknown) {
  await getRecordingOrThrow(recordingId);
  const body = updateRecordingSchema.parse(input);

  const [recording] = await db
    .update(recordings)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(recordings.id, recordingId))
    .returning();

  return { recording };
}

export async function deleteRecording(recordingId: string) {
  await getRecordingOrThrow(recordingId);

  const [recording] = await db
    .update(recordings)
    .set({ status: 'deleted', deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(recordings.id, recordingId))
    .returning();

  return { recording };
}

export async function createRecordingVersion(recordingId: string, input: unknown) {
  const body = createVersionSchema.parse(input);

  return db.transaction(async (tx) => {
    const [recording] = await tx
      .select()
      .from(recordings)
      .where(and(eq(recordings.id, recordingId), isNull(recordings.deletedAt)))
      .limit(1);

    if (!recording) {
      notFound('Recording not found');
    }

    const [versionStats] = await tx
      .select({
        maxVersion: sql<number>`coalesce(max(${recordingVersions.versionNumber}), 0)`,
      })
      .from(recordingVersions)
      .where(eq(recordingVersions.recordingId, recordingId));

    const nextVersionNumber = Number(versionStats?.maxVersion ?? 0) + 1;
    const [version] = await tx
      .insert(recordingVersions)
      .values(buildVersionInsert(recordingId, nextVersionNumber, body))
      .returning();

    const shouldActivate = body.activate || !recording.activeVersionId;

    if (shouldActivate) {
      await tx
        .update(recordings)
        .set({ activeVersionId: version.id, updatedAt: new Date() })
        .where(eq(recordings.id, recordingId));
    }

    return { version, activated: shouldActivate };
  });
}

export async function listRecordingVersions(recordingId: string, input: unknown) {
  const query = listQuerySchema.parse(input);
  await getRecordingOrThrow(recordingId);

  const rows = await db
    .select()
    .from(recordingVersions)
    .where(eq(recordingVersions.recordingId, recordingId))
    .orderBy(desc(recordingVersions.versionNumber))
    .limit(query.limit + 1)
    .offset(query.cursor);

  const hasMore = rows.length > query.limit;

  return {
    versions: (hasMore ? rows.slice(0, query.limit) : rows).map(toVersionSummary),
    nextCursor: hasMore ? query.cursor + query.limit : null,
  };
}

export async function getRecordingVersion(recordingId: string, versionId: string) {
  const version = await getVersionOrThrow(recordingId, versionId);

  return { version };
}

export async function exportRecording(recordingId: string) {
  const recording = await getRecordingOrThrow(recordingId);

  if (!recording.activeVersionId) {
    throw new HttpError(404, 'Recording has no active version');
  }

  const version = await getVersionOrThrow(recordingId, recording.activeVersionId);
  return version.recordingJson;
}

export async function exportRecordingVersion(recordingId: string, versionId: string) {
  const version = await getVersionOrThrow(recordingId, versionId);

  return version.recordingJson;
}

export async function activateRecordingVersion(recordingId: string, versionId: string) {
  await getVersionOrThrow(recordingId, versionId);

  const [recording] = await db
    .update(recordings)
    .set({ activeVersionId: versionId, updatedAt: new Date() })
    .where(eq(recordings.id, recordingId))
    .returning();

  return { recording };
}

export async function deleteRecordingVersion(recordingId: string, versionId: string) {
  await getVersionOrThrow(recordingId, versionId);

  const recording = await getRecordingOrThrow(recordingId);
  if (recording.activeVersionId === versionId) {
    throw new HttpError(409, 'Cannot delete the active version');
  }

  const [version] = await db
    .delete(recordingVersions)
    .where(and(eq(recordingVersions.id, versionId), eq(recordingVersions.recordingId, recordingId)))
    .returning();

  return { version: toVersionSummary(version) };
}

export async function getRecordingOrThrow(recordingId: string) {
  const [recording] = await db
    .select()
    .from(recordings)
    .where(and(eq(recordings.id, recordingId), isNull(recordings.deletedAt)))
    .limit(1);

  if (!recording) {
    notFound('Recording not found');
  }

  return recording;
}
