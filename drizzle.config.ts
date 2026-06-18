import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const dbUrl = (globalThis as any).process?.env?.DATABASE_URL ?? '';

export default defineConfig({
  schema: './src/db/schema/*',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
});
