import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const recordings = pgTable(
  'recordings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    tags: text('tags').array().notNull().default([]),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    source: varchar('source', { length: 64 }).notNull().default('extension'),
    startUrl: text('start_url'),
    stepCount: integer('step_count').notNull().default(0),
    recordingJson: jsonb('recording_json').$type<Record<string, unknown>>().notNull(),
    rawEventSummary: jsonb('raw_event_summary').$type<Record<string, unknown>>().notNull().default({}),
    validation: jsonb('validation').$type<Record<string, unknown>>().notNull().default({}),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('recordings_user_id_idx').on(table.userId),
    index('recordings_status_idx').on(table.status),
    index('recordings_created_at_idx').on(table.createdAt),
  ],
);
