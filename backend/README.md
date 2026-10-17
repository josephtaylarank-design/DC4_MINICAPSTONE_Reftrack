# RefTrack API

Laravel 12 REST API for RefTrack. It uses Sanctum bearer tokens and MySQL. The React app runs separately and calls this API at `http://127.0.0.1:8000/api`.

## Local setup

1. Create a MySQL database named `reftrack`.
2. Copy `.env.example` to `.env` and set the MySQL username/password, `APP_KEY`, and `REFTRACK_ADMIN_PASSWORD`. Change the sample admin password before seeding a shared or deployed environment.
3. Install dependencies and seed sample data:

   ```powershell
   composer install
   php artisan key:generate
   php artisan migrate --seed
   ```

4. Start the API:

   ```powershell
   php artisan serve
   ```

The seed creates one admin (`REFTRACK_ADMIN_EMAIL` / `REFTRACK_ADMIN_PASSWORD`), 12 referees, 3 venues, 20 games, and sample assignments.

## API conventions

- Protected routes require `Authorization: Bearer <token>` and `Accept: application/json`.
- Paginated collections return Laravel `data`, `links`, and `meta` objects, 10 records per page.
- Validation errors return HTTP 422 with a field-keyed `errors` object.
- Create endpoints return 201; deletes return 204; unauthenticated and unauthorized calls return 401 and 403.

### Authentication

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/register` | Public; registers only referees |
| POST | `/api/login` | Public |
| POST | `/api/logout` | Authenticated |
| GET | `/api/user` | Authenticated |
| GET | `/api/dashboard` | Authenticated; response is role-specific |

### Games and venues

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/games?search=&status=&category=&venue_id=&date=&page=` | Authenticated |
| GET | `/api/games/{game}` | Authenticated |
| POST / PUT / DELETE | `/api/games`, `/api/games/{game}` | Admin |
| PATCH | `/api/games/{game}/status` | Admin; completes or cancels a scheduled game |
| GET | `/api/venues`, `/api/venues/{venue}` | Authenticated |
| POST / PUT / DELETE | `/api/venues`, `/api/venues/{venue}` | Admin |

Games require a future start and an end after the start. A venue with games cannot be deleted.

### Referees and assignments

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/referees?search=&license_level=&status=&page=` | Admin |
| GET | `/api/referees/{referee}` | Admin |
| PATCH | `/api/referees/{referee}/status` | Admin |
| GET / PATCH | `/api/profile` | Referee |
| GET | `/api/my-assignments?status=&page=` | Referee |
| POST | `/api/games/{game}/assignments` | Admin |
| PATCH | `/api/assignments/{assignment}/status` | Assigned referee accepts/declines; admin completes |
| DELETE | `/api/assignments/{assignment}` | Admin |

Assignment positions are Crew Chief, Referee 1, and Referee 2. The API returns 422 if the referee already has an overlapping pending/accepted assignment, is unavailable during the game, is inactive, or the selected position is filled. Referees can only accept or decline their own pending assignments; admins can complete accepted assignments.

### Availability

| Method | Endpoint | Access |
| --- | --- | --- |
| GET / POST | `/api/availabilities` | Referee |
| DELETE | `/api/availabilities/{availability}` | Owning referee |

Availability records are date/time blocks and can be marked available or unavailable. Admin routes are protected server-side; hiding them in the frontend is not an authorization control.

## Validation

Run backend tests (SQLite in-memory):

```powershell
php artisan test
```

Run formatting checks:

```powershell
vendor/bin/pint --test
```
