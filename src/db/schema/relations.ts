import { relations } from 'drizzle-orm';
import { recordingVersions } from './recording-version.schema';
import { recordings } from './recording.schema';
import { runEvents } from './run-event.schema';
import { runHistory } from './run-history.schema';

export const recordingsRelations = relations(recordings, ({ many, one }) => ({
  versions: many(recordingVersions),
  runs: many(runHistory),
  activeVersion: one(recordingVersions, {
    fields: [recordings.activeVersionId],
    references: [recordingVersions.id],
  }),
}));

export const recordingVersionsRelations = relations(recordingVersions, ({ one, many }) => ({
  recording: one(recordings, {
    fields: [recordingVersions.recordingId],
    references: [recordings.id],
  }),
  runs: many(runHistory),
}));

export const runHistoryRelations = relations(runHistory, ({ one, many }) => ({
  recording: one(recordings, {
    fields: [runHistory.recordingId],
    references: [recordings.id],
  }),
  version: one(recordingVersions, {
    fields: [runHistory.versionId],
    references: [recordingVersions.id],
  }),
  events: many(runEvents),
}));

export const runEventsRelations = relations(runEvents, ({ one }) => ({
  run: one(runHistory, {
    fields: [runEvents.runId],
    references: [runHistory.id],
  }),
}));
