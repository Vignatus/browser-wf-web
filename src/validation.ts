import { z } from 'zod';

const jsonObject = z.record(z.string(), z.unknown());
const uuidParam = z.string().uuid();
const nullableJsonObject = jsonObject.nullable();

export const recordingParamsSchema = z.object({
  recordingId: uuidParam,
});

export const recordingVersionParamsSchema = z.object({
  recordingId: uuidParam,
  versionId: uuidParam,
});

export const replayParamsSchema = z.object({
  replayId: uuidParam,
});

export const listRecordingsQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.coerce.number().int().min(0).default(0),
  sort: z.enum(['created_at', 'updated_at', 'name']).default('created_at'),
});

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.coerce.number().int().min(0).default(0),
});

export const createRecordingSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(64)).default([]),
  status: z.string().trim().min(1).max(32).default('active'),
  metadata: jsonObject.default({}),
});

export const updateRecordingSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(64)).optional(),
    status: z.string().trim().min(1).max(32).optional(),
    metadata: jsonObject.optional(),
  })
  .strict();

export const createVersionSchema = z
  .object({
    activate: z.boolean().default(false),
    source: z.string().trim().min(1).max(64).default('extension'),
    schemaVersion: z.string().trim().min(1).max(32),
    title: z.string().trim().max(255).nullable().optional(),
    startUrl: z.string().trim().max(4096).nullable().optional(),
    steps: z.array(z.unknown()).optional(),
    recordingJson: jsonObject.optional(),
    rawEventSummary: jsonObject.default({}),
    validation: jsonObject.default({}),
    metadata: jsonObject.default({}),
  })
  .passthrough();

export const importRecordingSchema = z.object({
  recording: createRecordingSchema,
  version: createVersionSchema,
});

export const createReplaySchema = z.object({
  versionId: z.string().uuid().nullable().optional(),
  status: z.string().trim().min(1).max(32),
  startedAt: z.coerce.date().nullable().optional(),
  endedAt: z.coerce.date().nullable().optional(),
  durationMs: z.number().int().nonnegative().nullable().optional(),
  environment: jsonObject.default({}),
  summary: jsonObject.default({}),
  error: nullableJsonObject.optional(),
  metadata: jsonObject.default({}),
});

export const updateReplaySchema = z
  .object({
    status: z.string().trim().min(1).max(32).optional(),
    startedAt: z.coerce.date().nullable().optional(),
    endedAt: z.coerce.date().nullable().optional(),
    durationMs: z.number().int().nonnegative().nullable().optional(),
    environment: jsonObject.optional(),
    summary: jsonObject.optional(),
    error: nullableJsonObject.optional(),
    metadata: jsonObject.optional(),
  })
  .strict();

export const createReplayEventsSchema = z.object({
  events: z
    .array(
      z.object({
        sequence: z.number().int().nonnegative(),
        type: z.string().trim().min(1).max(64),
        timestamp: z.coerce.date().nullable().optional(),
        payload: jsonObject.default({}),
      }),
    )
    .min(1),
});

export const loginSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1),
});
