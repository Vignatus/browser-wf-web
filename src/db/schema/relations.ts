import { relations } from 'drizzle-orm';
import { recordings } from './recording.schema';
import { replayEvents } from './replay-event.schema';
import { replays } from './replay.schema';
import { users } from './user.schema';

export const usersRelations = relations(users, ({ many }) => ({
  recordings: many(recordings),
}));

export const recordingsRelations = relations(recordings, ({ many, one }) => ({
  user: one(users, {
    fields: [recordings.userId],
    references: [users.id],
  }),
  replays: many(replays),
}));

export const replaysRelations = relations(replays, ({ one, many }) => ({
  recording: one(recordings, {
    fields: [replays.recordingId],
    references: [recordings.id],
  }),
  events: many(replayEvents),
}));

export const replayEventsRelations = relations(replayEvents, ({ one }) => ({
  replay: one(replays, {
    fields: [replayEvents.replayId],
    references: [replays.id],
  }),
}));
