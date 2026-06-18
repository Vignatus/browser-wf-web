import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { replayEvents, replays } from '@/db/schema';
import { notFound } from '../errors';
import {
  createReplayEventsSchema,
  createReplaySchema,
  listQuerySchema,
  updateReplaySchema,
} from '@/validation';
import { getRecordingOrThrow } from './recordings.service';

export async function createReplay(recordingId: string, input: unknown) {
  await getRecordingOrThrow(recordingId);
  const body = createReplaySchema.parse(input);

  const [replay] = await db
    .insert(replays)
    .values({
      recordingId,
      status: body.status,
      startedAt: body.startedAt ?? null,
      endedAt: body.endedAt ?? null,
      durationMs: body.durationMs ?? null,
      environment: body.environment,
      summary: body.summary,
      error: body.error ?? null,
      metadata: body.metadata,
    })
    .returning();

  return { replay };
}

export async function listReplays(recordingId: string, input: unknown) {
  const query = listQuerySchema.parse(input);
  await getRecordingOrThrow(recordingId);

  const rows = await db
    .select()
    .from(replays)
    .where(eq(replays.recordingId, recordingId))
    .orderBy(desc(replays.createdAt))
    .limit(query.limit + 1)
    .offset(query.cursor);

  const hasMore = rows.length > query.limit;

  return {
    replays: hasMore ? rows.slice(0, query.limit) : rows,
    nextCursor: hasMore ? query.cursor + query.limit : null,
  };
}

export async function getReplay(replayId: string) {
  const replay = await getReplayOrThrow(replayId);

  return { replay };
}

export async function updateReplay(replayId: string, input: unknown) {
  await getReplayOrThrow(replayId);
  const body = updateReplaySchema.parse(input);

  const [replay] = await db
    .update(replays)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(replays.id, replayId))
    .returning();

  return { replay };
}

export async function createReplayEvents(replayId: string, input: unknown) {
  await getReplayOrThrow(replayId);
  const body = createReplayEventsSchema.parse(input);

  const events = await db
    .insert(replayEvents)
    .values(
      body.events.map((event) => ({
        ...event,
        replayId,
        timestamp: event.timestamp ?? null,
      })),
    )
    .returning();

  return { events };
}

export async function listReplayEvents(replayId: string, input: unknown) {
  const query = listQuerySchema.parse(input);
  await getReplayOrThrow(replayId);

  const rows = await db
    .select()
    .from(replayEvents)
    .where(eq(replayEvents.replayId, replayId))
    .orderBy(asc(replayEvents.sequence))
    .limit(query.limit + 1)
    .offset(query.cursor);

  const hasMore = rows.length > query.limit;

  return {
    events: hasMore ? rows.slice(0, query.limit) : rows,
    nextCursor: hasMore ? query.cursor + query.limit : null,
  };
}

async function getReplayOrThrow(replayId: string) {
  const [replay] = await db.select().from(replays).where(eq(replays.id, replayId)).limit(1);

  if (!replay) {
    notFound('Replay not found');
  }

  return replay;
}
