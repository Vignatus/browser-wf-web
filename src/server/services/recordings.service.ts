import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { recordings } from '@/db/schema';
import { notFound } from '../errors';
import {
  createRecordingSchema,
  importRecordingSchema,
  listRecordingsQuerySchema,
  updateRecordingSchema,
} from '@/validation';
import { getStepCount, omit } from '@/utils';

export async function createRecording(userId: string, input: unknown) {
  const body = createRecordingSchema.parse(input);
  const [recording] = await db.insert(recordings).values(buildRecordingInsert(userId, body)).returning();

  return { recording };
}

export async function importRecording(userId: string, input: unknown) {
  const body = importRecordingSchema.parse(input);
  const [recording] = await db.insert(recordings).values(buildRecordingInsert(userId, body)).returning();

  return { recording };
}

export async function listRecordings(userId: string, input: unknown) {
  const query = listRecordingsQuerySchema.parse(input);
  const filters: SQL[] = [eq(recordings.userId, userId)];

  if (query.status) {
    filters.push(eq(recordings.status, query.status));
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

  return { recording };
}

export async function updateRecording(recordingId: string, input: unknown) {
  await getRecordingOrThrow(recordingId);
  const body = updateRecordingSchema.parse(input);
  const values = buildPartialRecordingUpdate(body);

  const [recording] = await db
    .update(recordings)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(recordings.id, recordingId))
    .returning();

  return { recording };
}

export async function deleteRecording(userId: string, recordingId: string) {
  const existingRecording = await getRecordingOrThrow(recordingId);

  if (existingRecording.userId !== userId) {
    notFound('Recording not found');
  }

  const [recording] = await db
    .delete(recordings)
    .where(eq(recordings.id, recordingId))
    .returning();

  return { recording };
}

export async function exportRecording(recordingId: string) {
  const recording = await getRecordingOrThrow(recordingId);

  return recording.recordingJson;
}

export async function getRecordingOrThrow(recordingId: string) {
  const [recording] = await db.select().from(recordings).where(eq(recordings.id, recordingId)).limit(1);

  if (!recording) {
    notFound('Recording not found');
  }

  return recording;
}

function buildRecordingInsert(
  userId: string,
  body: ReturnType<typeof createRecordingSchema.parse>,
) {
  const recordingJson = body.recordingJson ?? omit(body as Record<string, unknown>, []);

  return {
    userId,
    name: body.name,
    description: body.description ?? null,
    tags: body.tags,
    status: body.status,
    source: body.source,
    startUrl: body.startUrl ?? null,
    stepCount: getStepCount(recordingJson, body.steps),
    recordingJson,
    rawEventSummary: body.rawEventSummary,
    validation: body.validation,
    metadata: body.metadata,
  };
}

function buildPartialRecordingUpdate(body: ReturnType<typeof updateRecordingSchema.parse>) {
  const recordingJson = body.recordingJson ?? (body.steps ? omit(body as Record<string, unknown>, []) : undefined);

  return {
    ...('name' in body ? { name: body.name } : {}),
    ...('description' in body ? { description: body.description ?? null } : {}),
    ...('tags' in body ? { tags: body.tags } : {}),
    ...('status' in body ? { status: body.status } : {}),
    ...('source' in body ? { source: body.source } : {}),
    ...('startUrl' in body ? { startUrl: body.startUrl ?? null } : {}),
    ...(recordingJson ? { recordingJson, stepCount: getStepCount(recordingJson, body.steps) } : {}),
    ...('rawEventSummary' in body ? { rawEventSummary: body.rawEventSummary } : {}),
    ...('validation' in body ? { validation: body.validation } : {}),
    ...('metadata' in body ? { metadata: body.metadata } : {}),
  };
}
