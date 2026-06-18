import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { runHistory } from './run-history.schema';

export const runEvents = pgTable(
  'run_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    runId: uuid('run_id')
      .notNull()
      .references(() => runHistory.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    type: varchar('type', { length: 64 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('run_events_run_id_sequence_idx').on(table.runId, table.sequence),
    index('run_events_run_id_idx').on(table.runId),
  ],
);
