import 'dotenv/config';
import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import express from 'express';
import { db, pool } from './db';
import { recordingVersions, recordings, runEvents, runHistory } from './db/schema';
import { asyncHandler, errorHandler, HttpError, notFound, parseBody, parseQuery } from './http';
import { getStepCount, omit } from './utils';
import {
  createRecordingSchema,
  createRunEventsSchema,
  createRunSchema,
  createVersionSchema,
  importRecordingSchema,
  listQuerySchema,
  listRecordingsQuerySchema,
  recordingParamsSchema,
  recordingVersionParamsSchema,
  runParamsSchema,
  updateRecordingSchema,
  updateRunSchema,
} from './validation';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post(
  '/recordings',
  asyncHandler(async (req, res) => {
    const body = parseBody(createRecordingSchema, req);
    const [recording] = await db.insert(recordings).values(body).returning();

    res.status(201).json({ recording });
  }),
);

app.post(
  '/recordings/import',
  asyncHandler(async (req, res) => {
    const body = parseBody(importRecordingSchema, req);

    const result = await db.transaction(async (tx) => {
      const [recording] = await tx.insert(recordings).values(body.recording).returning();
      const versionInput = buildVersionInsert(recording.id, 1, body.version);
      const [version] = await tx.insert(recordingVersions).values(versionInput).returning();
      const [updatedRecording] = await tx
        .update(recordings)
        .set({ activeVersionId: version.id, updatedAt: new Date() })
        .where(eq(recordings.id, recording.id))
        .returning();

      return { recording: updatedRecording, version };
    });

    res.status(201).json(result);
  }),
);

app.get(
  '/recordings',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listRecordingsQuerySchema, req);
    const filters: SQL[] = [];

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
    const data = hasMore ? rows.slice(0, query.limit) : rows;

    res.json({
      recordings: data,
      nextCursor: hasMore ? query.cursor + query.limit : null,
    });
  }),
);

app.get(
  '/recordings/:recordingId',
  asyncHandler(async (req, res) => {
    const { recordingId } = recordingParamsSchema.parse(req.params);
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

    res.json({
      recording,
      activeVersion: activeVersion ? toVersionSummary(activeVersion) : null,
      latestVersion: latestVersion ? toVersionSummary(latestVersion) : null,
    });
  }),
);

app.patch(
  '/recordings/:recordingId',
  asyncHandler(async (req, res) => {
    const { recordingId } = recordingParamsSchema.parse(req.params);
    await getRecordingOrThrow(recordingId);
    const body = parseBody(updateRecordingSchema, req);

    const [recording] = await db
      .update(recordings)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(recordings.id, recordingId))
      .returning();

    res.json({ recording });
  }),
);

app.delete(
  '/recordings/:recordingId',
  asyncHandler(async (req, res) => {
    const { recordingId } = recordingParamsSchema.parse(req.params);
    await getRecordingOrThrow(recordingId);

    const [recording] = await db
      .update(recordings)
      .set({ status: 'deleted', deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(recordings.id, recordingId))
      .returning();

    res.json({ recording });
  }),
);

app.post(
  '/recordings/:recordingId/versions',
  asyncHandler(async (req, res) => {
    const { recordingId } = recordingParamsSchema.parse(req.params);
    const body = parseBody(createVersionSchema, req);

    const result = await db.transaction(async (tx) => {
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

    res.status(201).json(result);
  }),
);

app.get(
  '/recordings/:recordingId/versions',
  asyncHandler(async (req, res) => {
    const { recordingId } = recordingParamsSchema.parse(req.params);
    const query = parseQuery(listQuerySchema, req);
    await getRecordingOrThrow(recordingId);

    const rows = await db
      .select()
      .from(recordingVersions)
      .where(eq(recordingVersions.recordingId, recordingId))
      .orderBy(desc(recordingVersions.versionNumber))
      .limit(query.limit + 1)
      .offset(query.cursor);

    const hasMore = rows.length > query.limit;
    const versions = (hasMore ? rows.slice(0, query.limit) : rows).map(toVersionSummary);

    res.json({
      versions,
      nextCursor: hasMore ? query.cursor + query.limit : null,
    });
  }),
);

app.get(
  '/recordings/:recordingId/export',
  asyncHandler(async (req, res) => {
    const { recordingId } = recordingParamsSchema.parse(req.params);
    const recording = await getRecordingOrThrow(recordingId);

    if (!recording.activeVersionId) {
      throw new HttpError(404, 'Recording has no active version');
    }

    const version = await getVersionOrThrow(recordingId, recording.activeVersionId);
    res.json(version.recordingJson);
  }),
);

app.get(
  '/recordings/:recordingId/versions/:versionId',
  asyncHandler(async (req, res) => {
    const { recordingId, versionId } = recordingVersionParamsSchema.parse(req.params);
    const version = await getVersionOrThrow(recordingId, versionId);

    res.json({ version });
  }),
);

app.get(
  '/recordings/:recordingId/versions/:versionId/export',
  asyncHandler(async (req, res) => {
    const { recordingId, versionId } = recordingVersionParamsSchema.parse(req.params);
    const version = await getVersionOrThrow(recordingId, versionId);

    res.json(version.recordingJson);
  }),
);

app.post(
  '/recordings/:recordingId/versions/:versionId/activate',
  asyncHandler(async (req, res) => {
    const { recordingId, versionId } = recordingVersionParamsSchema.parse(req.params);
    await getVersionOrThrow(recordingId, versionId);

    const [recording] = await db
      .update(recordings)
      .set({ activeVersionId: versionId, updatedAt: new Date() })
      .where(eq(recordings.id, recordingId))
      .returning();

    res.json({ recording });
  }),
);

app.delete(
  '/recordings/:recordingId/versions/:versionId',
  asyncHandler(async (req, res) => {
    const { recordingId, versionId } = recordingVersionParamsSchema.parse(req.params);
    await getVersionOrThrow(recordingId, versionId);

    const recording = await getRecordingOrThrow(recordingId);
    if (recording.activeVersionId === versionId) {
      throw new HttpError(409, 'Cannot delete the active version');
    }

    const [version] = await db
      .delete(recordingVersions)
      .where(and(eq(recordingVersions.id, versionId), eq(recordingVersions.recordingId, recordingId)))
      .returning();

    res.json({ version: toVersionSummary(version) });
  }),
);

app.post(
  '/recordings/:recordingId/runs',
  asyncHandler(async (req, res) => {
    const { recordingId } = recordingParamsSchema.parse(req.params);
    await getRecordingOrThrow(recordingId);
    const body = parseBody(createRunSchema, req);

    if (body.versionId) {
      await getVersionOrThrow(recordingId, body.versionId);
    }

    const [run] = await db
      .insert(runHistory)
      .values({
        recordingId,
        versionId: body.versionId ?? null,
        type: body.type,
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

    res.status(201).json({ run });
  }),
);

app.get(
  '/recordings/:recordingId/runs',
  asyncHandler(async (req, res) => {
    const { recordingId } = recordingParamsSchema.parse(req.params);
    const query = parseQuery(listQuerySchema, req);
    await getRecordingOrThrow(recordingId);

    const rows = await db
      .select()
      .from(runHistory)
      .where(eq(runHistory.recordingId, recordingId))
      .orderBy(desc(runHistory.createdAt))
      .limit(query.limit + 1)
      .offset(query.cursor);

    const hasMore = rows.length > query.limit;

    res.json({
      runs: hasMore ? rows.slice(0, query.limit) : rows,
      nextCursor: hasMore ? query.cursor + query.limit : null,
    });
  }),
);

app.get(
  '/runs/:runId',
  asyncHandler(async (req, res) => {
    const { runId } = runParamsSchema.parse(req.params);
    const run = await getRunOrThrow(runId);

    res.json({ run });
  }),
);

app.patch(
  '/runs/:runId',
  asyncHandler(async (req, res) => {
    const { runId } = runParamsSchema.parse(req.params);
    await getRunOrThrow(runId);
    const body = parseBody(updateRunSchema, req);

    const [run] = await db
      .update(runHistory)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(runHistory.id, runId))
      .returning();

    res.json({ run });
  }),
);

app.post(
  '/runs/:runId/events',
  asyncHandler(async (req, res) => {
    const { runId } = runParamsSchema.parse(req.params);
    await getRunOrThrow(runId);
    const body = parseBody(createRunEventsSchema, req);

    const events = await db
      .insert(runEvents)
      .values(
        body.events.map((event) => ({
          ...event,
          runId,
          timestamp: event.timestamp ?? null,
        })),
      )
      .returning();

    res.status(201).json({ events });
  }),
);

app.get(
  '/runs/:runId/events',
  asyncHandler(async (req, res) => {
    const { runId } = runParamsSchema.parse(req.params);
    const query = parseQuery(listQuerySchema, req);
    await getRunOrThrow(runId);

    const rows = await db
      .select()
      .from(runEvents)
      .where(eq(runEvents.runId, runId))
      .orderBy(asc(runEvents.sequence))
      .limit(query.limit + 1)
      .offset(query.cursor);

    const hasMore = rows.length > query.limit;

    res.json({
      events: hasMore ? rows.slice(0, query.limit) : rows,
      nextCursor: hasMore ? query.cursor + query.limit : null,
    });
  }),
);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  server.close(() => {
    pool.end().catch((err: unknown) => {
      console.error(err);
    });
  });
}

async function getRecordingOrThrow(recordingId: string) {
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

async function getVersionOrThrow(recordingId: string, versionId: string) {
  const [version] = await db
    .select()
    .from(recordingVersions)
    .where(and(eq(recordingVersions.id, versionId), eq(recordingVersions.recordingId, recordingId)))
    .limit(1);

  if (!version) {
    notFound('Recording version not found');
  }

  return version;
}

async function getRunOrThrow(runId: string) {
  const [run] = await db.select().from(runHistory).where(eq(runHistory.id, runId)).limit(1);

  if (!run) {
    notFound('Run not found');
  }

  return run;
}

function buildVersionInsert(
  recordingId: string,
  versionNumber: number,
  body: ReturnType<typeof createVersionSchema.parse>,
) {
  const recordingJson = body.recordingJson ?? omit(body as Record<string, unknown>, ['activate']);

  return {
    recordingId,
    versionNumber,
    source: body.source,
    schemaVersion: body.schemaVersion,
    title: body.title ?? null,
    startUrl: body.startUrl ?? null,
    stepCount: getStepCount(recordingJson, body.steps),
    recordingJson,
    rawEventSummary: body.rawEventSummary,
    validation: body.validation,
    metadata: body.metadata,
  };
}

function toVersionSummary(version: typeof recordingVersions.$inferSelect) {
  return omit(version, ['recordingJson']);
}
