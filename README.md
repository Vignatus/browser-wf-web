# browser-wf-web

Next.js backend and dashboard for BrowserWFCapture.

## Prerequisites

- Node.js 18+
- PostgreSQL database

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in this directory:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/browser_wf
   JWT_SECRET=your-secret-key
   ```

3. Run database migrations:
   ```bash
   npm run db:migrate
   ```

## Running

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

The server starts on `http://localhost:3000` by default.

## Database

To generate new migrations after schema changes:
```bash
npm run db:generate
npm run db:migrate
```
