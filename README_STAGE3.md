# AmeerTech Data Hub — Stage 3

This package adds server-side customer registration, login, logout, and a private customer session to the demo project.

## Important architecture change

GitHub Pages only hosts static files; it cannot run Express, SQLite, or authentication APIs. This Stage 3 app is designed to run as one Node.js web service that serves both the website (`public/`) and API from the same origin. This keeps the HttpOnly session cookie first-party and avoids putting passwords or secrets in browser code.

## Files

- `public/` — website pages, styles, browser scripts, PWA files
- `index.js` — Express API and server-side authentication
- `store.js` — SQLite database for customers, sessions, and preview orders
- `package.json` — server dependencies and start command
- `.env.example` — example environment settings; do not put real secrets in GitHub

## Local run

1. Install Node.js 20 or newer on a computer.
2. Copy `.env.example` to `.env` and set `SESSION_PEPPER` to a random secret at least 32 characters long.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

## Production deployment checklist

- Deploy this Node.js project to a trusted Node.js host that supports persistent disk storage for SQLite, or change the database to a managed database before scaling.
- Set `NODE_ENV=production`.
- Set `SESSION_PEPPER` as a private environment variable; never commit `.env`.
- Ensure HTTPS is enabled.
- Keep `VTU_LIVE_ENABLED=false` and payments disabled until provider/payment integrations have been implemented and tested.
- Test registration, sign-in, sign-out, session expiry, and database backups before inviting customers.

## Current limits

Customer account authentication is implemented in the server package, but the live account page will not work on GitHub Pages by itself. The website must be deployed through the Node.js service. Wallet funding, payments, live airtime/data delivery, password reset, email verification, and admin tools are not included yet. Do not accept customer money in this demo.
