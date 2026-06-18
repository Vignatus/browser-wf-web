import { pgTable, text, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    password: text('password').notNull(),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
);
