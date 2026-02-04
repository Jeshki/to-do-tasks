E2E setup

1) Copy `.env.e2e.example` to `.env.e2e` and fill credentials.
2) Make sure the users exist in the DB.
3) Run `npx playwright install` (once).
4) Run `npm run test:e2e`.

Notes:
- Use `PLAYWRIGHT_SKIP_WEB_SERVER=true` if you start Next.js manually.
- Set `E2E_PHOTO_COUNTS=10,50,100` to control batch photo upload tests (default: `10,50,100`). Requires `BLOB_READ_WRITE_TOKEN`.
- Batch photo upload tests clean up created blobs after the run.
