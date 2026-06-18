# Backend API Paths

## Auth

| Method | Path |
| --- | --- |
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |
| POST | `/api/auth/token` |

## Dashboard

| Method | Path |
| --- | --- |
| GET | `/api/dashboard/recordings` |
| GET | `/api/dashboard/replays` |

## Health

| Method | Path |
| --- | --- |
| GET | `/api/health` |

## Recordings

| Method | Path |
| --- | --- |
| GET | `/api/recordings` |
| POST | `/api/recordings` |
| GET | `/api/recordings/:recordingId` |
| PATCH | `/api/recordings/:recordingId` |
| DELETE | `/api/recordings/:recordingId` |
| GET | `/api/recordings/:recordingId/export` |
| POST | `/api/recordings/import` |
| GET | `/api/recordings/:recordingId/replays` |
| POST | `/api/recordings/:recordingId/replays` |

## Replays

| Method | Path |
| --- | --- |
| GET | `/api/replays/:replayId` |
| PATCH | `/api/replays/:replayId` |
| GET | `/api/replays/:replayId/events` |
| POST | `/api/replays/:replayId/events` |
