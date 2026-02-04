E2E setup

1) Copy `.env.e2e.example` to `.env.e2e` and fill credentials.
2) Make sure the users exist in the DB.
3) Run `npx playwright install` (once).
4) Run `npm run test:e2e`.

Notes:
- Use `PLAYWRIGHT_SKIP_WEB_SERVER=true` if you start Next.js manually.
- Set `E2E_PHOTO_COUNTS=10,50,100` to control batch photo upload tests (default: `10,50,100`). Requires `BLOB_READ_WRITE_TOKEN`.
- Batch photo upload tests clean up created blobs after the run.

Examples:
```powershell
# Run only 100-photo batch
$env:E2E_PHOTO_COUNTS="100"
pnpm test:e2e:photos

# Run 10 and 50
$env:E2E_PHOTO_COUNTS="10,50"
pnpm test:e2e:photos
```
