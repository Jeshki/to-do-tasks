# AGENTS

Sis repozitoriumas turi du katalogus: `src` ir `to-do-tasks`. Pagrindine aplikacija yra `to-do-tasks`, nebent uzduotis tiesiogiai susijusi su `src`.

## Darbo gaires
- Komandas vykdyk is `to-do-tasks`, jei nenurodyta kitaip.
- Naudok `pnpm` skriptams ir priklausomybiu valdymui.
- Jei keiti DB schema ar Prisma klienta, atnaujink Prisma generacija.

## Testai ir patikra (`to-do-tasks`)
- Unit testai: `pnpm test`
- E2E (Playwright): `pnpm test:e2e`
- Lint: `pnpm lint`
- Cypress: `pnpm test:cypress`

## E2E paruosimas
- Nukopijuok `.env.e2e.example` -> `.env.e2e` ir uzpildyk kredencialus.
- Vartotojai turi egzistuoti DB.
- Vienakart paleisk `npx playwright install`.
- Jei Next.js paleistas rankiniu budu, naudok `PLAYWRIGHT_SKIP_WEB_SERVER=true`.
