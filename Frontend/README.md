# Secure Share - Frontend

A minimal React frontend for the Secure Share backend.

## Quick start

1. Copy `.env.example` to `.env` and set `VITE_API_URL` to your backend API base (e.g. `http://localhost:5000/api`).
2. Install dependencies: `npm install` (this will now install Tailwind CSS, Headless UI, Heroicons)
3. Start dev server: `npm run dev`

Note: If you don't see Tailwind styles, restart the dev server after installing dependencies.
## Implemented features

- Login & registration
- Auth token stored in localStorage and attached to requests
- Upload file (select receiver)
- File sharing and download (per-user conversation pages)

Make sure your backend is running on the URL you set in `VITE_API_URL`.
