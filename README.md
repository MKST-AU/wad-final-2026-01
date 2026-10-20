# Online Course Service

Next.js API, React/Vite frontend, and MongoDB. Database: `wad_final_2026`.

## Student Information

- Name: Myo Kyi Sim Thar
- Student ID: 6715004
- Section: 542

## Test accounts

Existing accounts supplied by the project owner. Log in using email.

| Role    | Email                | Password    |
| ------- | -------------------- | ----------- |
| Teacher | teacher1@example.com | Teacher123! |
| Teacher | teacher2@example.com | Teacher123! |
| Teacher | teacher3@example.com | Teacher123! |
| Student | student1@example.com | Student123! |
| Student | student2@example.com | Student123! |
| Student | student3@example.com | Student123! |

## Run locally

Prerequisites: Node.js 22.12+ and npm, and access to MongoDB containing the test accounts.

1. Copy `next-backend/.env.example` to `next-backend/.env.local`. Set `MONGODB_URI` and a long random `JWT_SECRET`. Keep `FRONTEND_URL=http://localhost:5173` for local development. Preserve your existing environment file if already configured.
2. In `next-backend`, run `npm ci`, then `npm run dev`. API: `http://localhost:3000`.
3. Copy `react-frontend/.env.example` to `react-frontend/.env`. Set `VITE_API_URL=http://localhost:3000`.
4. In a second terminal, in `react-frontend`, run `npm ci`, then `npm run dev`. Open `http://localhost:5173`.

## Testing walkthrough

1. Log in as teacher1. Create an Open course with a name, positive duration in days, comma-separated topics, price, and maximum students. View details and edit it. Create another course and delete it before anyone enrolls.
2. Log in as teacher2. Verify teacher1's courses are absent. Direct API requests to view, update, or delete another teacher's course must be rejected.
3. Log in as student1. Search using part of a course name or teacher username, view details, and enroll. Check My Enrolled Courses. Duplicate enrollment must be rejected.
4. Log in as teacher1. View the course details and verify student1's username and email appear. Deleting the enrolled course must be rejected.
5. Set the course to Close: students can see it but cannot enroll. Set it to Cancel: it disappears from both student lists and rejects enrollment.
6. Create an Open course with one seat. Enroll student1, then try student2: the second enrollment must fail as full.
7. Refresh while logged in to verify session persistence. Log out and verify protected API operations reject unauthenticated requests. Student attempts to create, update, or delete courses must be rejected.

## Build and lint

Authenticated users can retrieve their own profile using `GET /api/user/<their-user-id>`. Other users' profiles are forbidden, and password hashes are never returned.

Run `npm run lint` and `npm run build` in each project directory. Run `npm run start` for the built backend. Run `npm run preview` for the built frontend; set backend `FRONTEND_URL` to the preview origin (normally `http://localhost:4173`) before starting it.

## Deployment

Deploy two projects with root directories `next-backend` and `react-frontend`.

- Backend: use the Next.js preset. Set `MONGODB_URI`, `JWT_SECRET`, and `FRONTEND_URL` to the exact frontend HTTPS origin without a trailing slash.
- Frontend: use the Vite preset, build command `npm run build`, output directory `dist`. Set `VITE_API_URL` to the backend HTTPS origin without a trailing slash.
- Redeploy after environment changes. Production cookies use Secure and SameSite=None. Browser third-party-cookie restrictions can affect separate sites; domains under the same site avoid that limitation.
- Verify login, refresh, course management, and enrollment through the deployed frontend.
