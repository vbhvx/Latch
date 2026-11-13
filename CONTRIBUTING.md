# Contributing

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run migrate
npm run check        # typecheck + lint + format check + full test suite
```

- Every change that touches authorization, SQL, or sessions needs a test in `tests/security` or `tests/integration`.
- SQL must be parameterized. Dynamic identifiers (sort columns, etc.) must come from an allow-list (`src/lib/sort.ts`).
- Schema changes go in a new `db/migrations/NNN_name.sql` with both `-- Up` and `-- Down` sections.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:` ...).
