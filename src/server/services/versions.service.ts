import { and, eq } from 'drizzle-orm';
import { recordingVersions } from '@/db/schema';
import { db } from '@/db';
import { notFound } from '../errors';
import { getStepCount, omit } from '@/utils';
import { createVersionSchema } from '@/validation';

export async function getVersionOrThrow(recordingId: string, versionId: string) {
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

export function buildVersionInsert(
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

export function toVersionSummary(version: typeof recordingVersions.$inferSelect) {
  return omit(version, ['recordingJson']);
}
