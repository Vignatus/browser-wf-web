import { index, integer, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { recordingVersions } from './recording-version.schema';
import { recordings } from './recording.schema';

export const runHistory = pgTable(
  'run_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    versionId: uuid('version_id').references(() => recordingVersions.id, { onDelete: 'set null' }),
    type: varchar('type', { length: 32 }).notNull().default('replay'),
    status: varchar('status', { length: 32 }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),
    environment: jsonb('environment').$type<Record<string, unknown>>().notNull().default({}),
    summary: jsonb('summary').$type<Record<string, unknown>>().notNull().default({}),
    error: jsonb('error').$type<Record<string, unknown>>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('run_history_recording_id_idx').on(table.recordingId),
    index('run_history_version_id_idx').on(table.versionId),
    index('run_history_created_at_idx').on(table.createdAt),
    index('run_history_status_idx').on(table.status),
  ],
);
