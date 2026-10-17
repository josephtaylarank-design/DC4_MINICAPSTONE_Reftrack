# RefTrack

RefTrack is a referee-management mini capstone built as a React SPA with a Laravel REST API and a MySQL database.

## Requirements

- PHP 8.2+, Composer, and MySQL/MariaDB
- Node.js 20.19+ and npm

## Start the backend

1. Create a MySQL database named `reftrack`.
2. In `backend`, copy `.env.example` to `.env` and set your database credentials and a new `REFTRACK_ADMIN_PASSWORD`.
3. In a terminal:

   ```powershell
   cd backend
   composer install
   php artisan key:generate
   php artisan migrate --seed
   php artisan serve
   ```

The API starts at `http://127.0.0.1:8000/api`. The sample seeder creates the admin account, 12 referee profiles, 3 venues, 20 games, and example assignments. The development admin login is controlled by `REFTRACK_ADMIN_EMAIL` and `REFTRACK_ADMIN_PASSWORD` in `backend/.env`; change the sample password before sharing or deploying the app.

## Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the local Vite URL printed in the terminal (normally `http://localhost:5173`). Set `VITE_API_URL` in `frontend/.env` if the API uses another URL.

## Browser drafts

Unsubmitted form entries and filter values are saved in the current browser so they survive a refresh. Drafts are kept separately per signed-in user and cleared after a successful save or form reset. Passwords and password confirmations are never saved. Drafts stay in this browser's local storage until cleared; clear this site's browser data to remove them.

## Checks

```powershell
cd backend
php artisan test
vendor/bin/pint --test
```

```powershell
cd frontend
npm run build
```

The backend tests use an in-memory SQLite database; the application `.env.example` configures the required MySQL database. Backend API routes, authentication, role checks, data model, and seed instructions are documented in [backend/README.md](./backend/README.md).
