import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { replays } from './replay.schema';

export const replayEvents = pgTable(
  'replay_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    replayId: uuid('replay_id')
      .notNull()
      .references(() => replays.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    type: varchar('type', { length: 64 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('replay_events_replay_id_sequence_idx').on(table.replayId, table.sequence),
    index('replay_events_replay_id_idx').on(table.replayId),
  ],
);
