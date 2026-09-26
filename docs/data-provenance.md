# Data provenance

Cortex is single-tenant per deployment. Each BYOC deployment owns its PostgreSQL, Neo4j, and Qdrant stores; do not add `tenant_id` or cross-client routing.

Every persisted entity carries one required `source`:

- `webhook`: accepted external provider delivery.
- `backfill`: explicitly run historical provider import.
- `seed:<script-name>`: local test, fixture, or demonstration data.

Product aggregates and search surfaces use webhook/backfill records only. Seed rows stay isolated by source and are not evidence of a client's activity. Historical rows whose origin cannot be established are tagged `seed:legacy-unverified` during PostgreSQL migration and therefore excluded. No timestamp, UUID format, or provider name is sufficient evidence to promote an unknown row.

PostgreSQL product reads also include an explicit trusted-source predicate in application queries. This is required even with forced RLS because PostgreSQL `SUPERUSER` and `BYPASSRLS` roles skip row policies. The integrity verifier parses TypeScript SQL templates across `apps/` and `packages/`, checks reads from all provenance tables, and rejects missing filters and source predicates bypassed by an ungrouped `OR`. Current verifier output records the number of checked query templates.

PostgreSQL applies a forced row-level security policy to each provenance table. It exposes `webhook` and `backfill` rows by default. The database connection sets `cortex.allow_seed_data=on` only when `CORTEX_ENV=local-dev` and `NODE_ENV` is exactly `development` or `test`; an unset or unexpected runtime mode stays closed. PostgreSQL superusers and roles with `BYPASSRLS` ignore row policies. API startup warns if the connected role has either attribute, without blocking service startup. Client deployments should use a non-superuser, non-`BYPASSRLS` runtime role. Neo4j sessions pass through one query policy that injects trusted-source predicates into graph reads and sends mutations through the graph-write repository. Neo4j and Qdrant reject seed writes unless the deployment is explicitly marked `CORTEX_ENV=local-dev` with `NODE_ENV=development` or `test`. Qdrant writes and searches pass through its repository, which validates write provenance and filters searches to trusted sources.

Client deployment settings: set `NODE_ENV=production`, leave `CORTEX_ENV` unset, and configure `POSTGRES_USER` as a login role with `NOSUPERUSER NOBYPASSRLS` and the required application schema/table privileges. Startup reports an RLS bypass warning for a superuser or `BYPASSRLS` role, but keeps the API available. For disposable development/test only, set `CORTEX_ENV=local-dev` and `NODE_ENV=development` or `test`.

All seed, fixture, and database-writing test scripts must call `assertSafeTestDatabase(import.meta.url)` before opening a database connection. Invocation requires `--target=local`, `CORTEX_ENV=local-dev`, and `NODE_ENV=development` or `test`; production mode is rejected. API fixture clients must target loopback or an origin explicitly listed in `CORTEX_TEST_API_ORIGINS`. The guard prints the script and provenance label before writes.

Set `CORTEX_ENV=local-dev` only for a disposable local development deployment. Client deployments must omit this marker and use `NODE_ENV=production`. Fresh installs do not load demo data; scheduled aggregation leaves metric tables empty until a trusted event exists. The seed guard still requires `--target=local`, and API fixture clients must target loopback or an origin explicitly listed in `CORTEX_TEST_API_ORIGINS`.

Run `npm run test:provenance` for the repository integrity scan. The same scan runs in GitHub Actions on pushes and pull requests. Database-backed fixture suites additionally require an explicitly marked local/test database. This checkout has no backend deployment packaging configuration; whether seed/test source files are omitted from a client artifact is not established, so the runtime/database guards remain necessary.
