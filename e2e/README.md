E2E setup

1) Copy `.env.e2e.example` to `.env.e2e` and fill credentials.
2) Make sure the users exist in the DB.
3) Run `npx playwright install` (once).
4) Run `npm run test:e2e`.

Notes:
- Use `PLAYWRIGHT_SKIP_WEB_SERVER=true` if you start Next.js manually.
