import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { recordings } from './recording.schema';

export const recordingVersions = pgTable(
  'recording_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    source: varchar('source', { length: 64 }).notNull().default('extension'),
    schemaVersion: varchar('schema_version', { length: 32 }).notNull(),
    title: varchar('title', { length: 255 }),
    startUrl: text('start_url'),
    stepCount: integer('step_count').notNull().default(0),
    recordingJson: jsonb('recording_json').$type<Record<string, unknown>>().notNull(),
    rawEventSummary: jsonb('raw_event_summary').$type<Record<string, unknown>>().notNull().default({}),
    validation: jsonb('validation').$type<Record<string, unknown>>().notNull().default({}),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('recording_versions_recording_id_version_number_idx').on(
      table.recordingId,
      table.versionNumber,
    ),
    index('recording_versions_recording_id_idx').on(table.recordingId),
    index('recording_versions_created_at_idx').on(table.createdAt),
  ],
);
