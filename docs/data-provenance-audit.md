# Data Provenance Audit — Part 1 Inventory (2026-09-26)

## Initial Part 1 status and stop gate

Part 1 read-only inventory is complete to the extent supported by this checkout and its configured databases. The stop threshold was met: all 20 repository metric rows, with a summed 118 commits, lacked provenance fields. The user then supplied explicit direction that all records were test-only and authorized a backup followed by clearing the named development stores, resolving the stop gate.

UNKNOWN means the required evidence linking an entity to an actual webhook delivery or historical API backfill is absent. It does not assert that every record is synthetic. Synthetic-data indicators exist, but no row-level source tags or retained script-run log allow safe attribution of every record to a specific writer.

## Read-only database evidence

Queries ran against the configured PostgreSQL database Cortex, Neo4j database, and Qdrant collection cortex_events. PostgreSQL required TLS; the successful query output below is from the TLS connection. No host, credential, or payload PII is recorded here.

PostgreSQL table counts:

~~~json
{"events":81,"person_metrics":11,"workspace_metrics":1,"person_identity":53,"technology_metrics":89,"identity_merge_log":17,"potential_duplicates":1,"daily_reports":3,"repo_metrics":20}
~~~

PostgreSQL event groups:

~~~json
[{"provider":"github","event_type":"pull_request","count":22,"distinct_external_ids":22,"first_at":"2026-09-23T14:22:10.748Z","last_at":"2026-09-23T14:22:15.333Z"},{"provider":"github","event_type":"push","count":18,"distinct_external_ids":18,"first_at":"2026-09-23T14:22:06.077Z","last_at":"2026-09-23T14:22:10.528Z"},{"provider":"jira","event_type":"jira:issue_created","count":20,"distinct_external_ids":20,"first_at":"2026-09-23T14:22:15.557Z","last_at":"2026-09-23T14:22:19.947Z"},{"provider":"jira","event_type":"jira:issue_updated","count":1,"distinct_external_ids":1,"first_at":"2026-09-23T14:22:18.858Z","last_at":"2026-09-23T14:22:18.858Z"},{"provider":"slack","event_type":"message","count":20,"distinct_external_ids":20,"first_at":"2026-09-23T14:22:20.151Z","last_at":"2026-09-23T14:22:24.232Z"}]
~~~

The event table has no source/delivery-provenance column. Its external IDs are UUIDs, but their existence and uniqueness do not prove real external deliveries. None of the nine public PostgreSQL tables has a source column.

## Authorized development-store reset

Before clearing, all rows and graph/vector properties were exported to `C:\Users\Arjun\AppData\Local\Temp\cortex-provenance-reset-backup` (outside the repository). Captured raw counts were PostgreSQL: events 81, person_metrics 11, workspace_metrics 1, person_identity 53, technology_metrics 89, identity_merge_log 17, potential_duplicates 1, daily_reports 3, repo_metrics 20; Neo4j: 279 nodes and 385 relationships; Qdrant cortex_events: 80 points. The reset ran only after the target database was confirmed as Cortex and `NODE_ENV=development`.

Post-reset direct count output:

~~~json
{"postgres":{"events":0,"person_metrics":0,"person_identity":0,"repo_metrics":0,"technology_metrics":0,"workspace_metrics":0,"identity_merge_log":0,"potential_duplicates":0,"daily_reports":0},"neo4jNodes":0,"neo4jRelationships":0,"qdrantPoints":0,"deletedNeo4j":279}
~~~

The current database remains empty unless the application has been started since this reset. No post-reset application boot or database-backed verifier has been run yet.

Raw repo metric aggregate:

~~~json
{"repo_rows":20,"commit_sum":118,"nonempty_repos":17,"null_commit_counts":0}
~~~

This is the current repo_metrics sum, not a provenance-clean total. The historical 92-vs-128 comparison is not verified by this inventory.

Neo4j label counts:

~~~json
[{"labels":["FILE"],"count":49},{"labels":["ISSUE"],"count":25},{"labels":["ORGANIZATION"],"count":2},{"labels":["PERSON"],"count":71},{"labels":["PULL_REQUEST"],"count":22},{"labels":["REPOSITORY"],"count":20},{"labels":["TEAM"],"count":1},{"labels":["TECHNOLOGY"],"count":89}]
~~~

A read-only property-coverage query returned zero nodes with source across 279 nodes. Relationships total 385; zero have source. Some have sourceEventId, but those IDs are not linked to verified webhook delivery evidence.

Qdrant returned status green, points_count 80, payload_schema empty. A read-only scroll returned all 80 points. Payload keys: author, channel, description, entities, eventID, eventType, issueKey, provider, relationships, repository, status, summary, text, timestamp. All 80 lack source. Sampled payloads contain elaborate demo PR descriptions, a synthetic-data indicator but not a delivery ledger.

## Entity provenance counts

| Store / entity | Count | REAL verified | BACKFILLED verified | SEEDED individually proven | UNKNOWN |
|---|---:|---:|---:|---:|---:|
| PostgreSQL events | 81 | 0 | 0 | 0 | 81 |
| PostgreSQL repo_metrics | 20 | 0 | 0 | 0 | 20 |
| PostgreSQL person_metrics | 11 | 0 | 0 | 0 | 11 |
| PostgreSQL technology_metrics | 89 | 0 | 0 | 0 | 89 |
| PostgreSQL person_identity | 53 | 0 | 0 | 0 | 53 |
| PostgreSQL workspace_metrics | 1 | 0 | 0 | 0 | 1 |
| PostgreSQL identity_merge_log | 17 | 0 | 0 | 0 | 17 |
| PostgreSQL potential_duplicates | 1 | 0 | 0 | 0 | 1 |
| PostgreSQL daily_reports | 3 | 0 | 0 | 0 | 3 |
| Neo4j nodes | 279 | 0 | 0 | 0 | 279 |
| Neo4j relationships | 385 | 0 | 0 | 0 | 385 |
| Qdrant points | 80 | 0 | 0 | 0 | 80 |

Zero means no entity met the audit evidence standard, not that synthetic records were proved absent. Provider names, external IDs, graph sourceEventId references, and timestamps alone do not establish origin. The 20 repositories and 118 aggregate commits meet the 50% UNKNOWN stop trigger.

## Write-path inventory

No seed/fixture path found a database-host/database-name allowlist guard. Prefix-based deletion and cleanup are not environment safety guards. test_end_to_end_ingestion.mjs defaults its HTTP target to localhost, but BASE_URL is overrideable and it does not validate the database behind that server. No script-run ledger was found, so historical execution of individual scripts against this configured database is not verified. Current matching timestamps/data and Git history are risk evidence, not proof of which process performed each write.

| Path(s) | Writes / effect | Guard and execution evidence |
|---|---|---|
| apps/api/modules/github/controller.ts, jira/controller.ts, slack/controller.ts | Incoming provider payloads to PostgreSQL events; downstream ingestion | No source tag. Request secrets do not distinguish fixture requests from real deliveries. |
| packages/ingestion/github/processGithubEvent.ts; packages/database/neo4j/graph.repository.ts | Neo4j entity nodes and relationships | No required source property. Some relationships carry sourceEventId without verified delivery linkage. |
| packages/database/vector/qdrant.repository.ts | Qdrant collection and vector upserts | All current points lack source. |
| packages/database/postgres/schema.ts; scripts/migrate_analytics_constraints.sql | Tables, columns, indexes, triggers/constraints | No source model; confirmed absent in current PostgreSQL tables. |
| packages/analytics/repoMetrics.service.ts, personMetrics.service.ts, technologyMetrics.ts, workspaceMetrics.service.ts | Upsert/delete repo, person, technology, workspace metric rows | No source lineage on derived rows. |
| packages/analytics/dailyReport.service.ts, integrityGuard.service.ts, metricsInvalidator.service.ts; packages/workers/scheduler.worker.ts | Persist reports and/or mutate/delete derived or expired records | No source lineage carried through derived records. |
| packages/identity/canonicalPerson.service.ts | Mutates person_identity, person_metrics, potential_duplicates, identity_merge_log and graph identity/edges | Provider/external identity is not provenance; no target DB guard. |
| scripts/seed_realistic_pr_data.ts | Deletes cortex_pr_real_* events and inserts realistic PR fixtures | No local/test DB allowlist. Git history includes commit 3de6ee8 dated 2026-09-23; DB event burst is also 2026-09-23, correlation only. |
| scripts/seed_and_verify_complex_data.ts | Direct Neo4j repo/person/technology/commit/issue nodes and relationships; runs analytics writes | No DB allowlist. File describes itself as a direct graph seeder. Historical run here is unproven. |
| scripts/test_end_to_end_ingestion.mjs | Posts fabricated GitHub/Jira/Slack payloads to webhook endpoints, causing PostgreSQL/Neo4j/Qdrant writes | BASE_URL defaults localhost but is overrideable; no backing DB allowlist. Contains synthetic personas and random UUID delivery IDs. Git history includes the dataset in 3de6ee8 on 2026-09-23; the current burst of 81 events at that date is consistent with execution, but is not a run log. |
| scripts/verify_metrics_golden_dataset.ts | Deletes/inserts 35 synthetic PR events in PostgreSQL events | Prefix cleanup only; no local/test DB allowlist. Not run in this audit. |
| scripts/test_worst_case_pr_resilience.ts, test_metrics_stress_scenarios.ts, hardcore_regression_suite.ts | Insert/delete adversarial events; hardcore suite also writes graph/identity/metric fixtures | Prefix/cleanup in places; no universal DB guard. Not run. |
| scripts/test_future_data_integrity.ts, test_full_hardening_suite.ts, test_unfamiliar_dataset_suite.ts, verify_pilot_bar.ts | Test events, repo_metrics, Neo4j nodes/edges; unfamiliar suite also writes Qdrant | Test names/cleanup do not restrict database target. Not run. |
| scripts/test_p1_edge_cases.ts, test_fix3_ambiguity.ts, test_prove_lifecycle.ts, test_reassignment_edge_case.ts, test_verify_pending_work_fix.ts, test_strict_ingestion_and_duplicates.ts | Neo4j people/repos/issues/commits/edges; strict-ingestion suite also writes PostgreSQL events/identities/metrics | No demonstrated DB allowlist. Not run. |
| scripts/test_identity_resolution.ts, scripts/reconcile_person_identities.ts | Mutate PostgreSQL identity/duplicate/merge-log/metric rows; reconciliation also alters Neo4j | No local/test DB guard found. Not run. |
| scripts/cleanup_test_data.ts, compact_commits_to_contributions.ts, merge_slack_persons.ts, migrate_merge_duplicate_tech_nodes.ts | Delete test/duplicate rows; compact/merge Neo4j graph nodes and edges | No local/test DB allowlist found. Not run. |
| scripts/test_enterprise_hardening.ts and tests invoking ingestion/graph helpers | Indirect writes through repositories/controllers | Indirect writes are not found by SQL/Cypher text search alone. No universal test DB guard. |

The repository-wide search also matched non-write false positives: packages/agent/graph/nodes/retrievalPlanner.node.ts, packages/analytics/successor.service.ts, packages/ingestion/github/normalize.ts, packages/llm/providers/groq.ts, scripts/generate-github-webhook-request.mjs, documentation prose, and web/src/components/IntegrationsModal.tsx. These are request/model/map creation or explanatory text, not direct database writes. The search covered the checkout excluding node_modules, .git, and build output; helper-mediated writes are separately noted above.

## Authorized follow-up and implementation status

The user confirmed the historical data was test-only, authorized the captured backup and development-store wipe, and then authorized the broader PostgreSQL/Neo4j repository refactor. The three stores returned zero records immediately after the reset (raw counts above). The prior stop trigger therefore did not block this authorized work.

Implemented in the checkout: required source values and forced trusted-source RLS for nine PostgreSQL tables; shared Neo4j session query filtering and required write provenance; Qdrant source validation, trusted-source search filtering, and legacy/invalid-source quarantine; script-specific loud local/test guards; trusted-source analytics filters; a static provenance scan wired to `npm test` and `.github/workflows/provenance-integrity.yml`; and the model documentation in `docs/data-provenance.md`.

Follow-up hardening adds a dedicated Neo4j graph-write repository used by the shared session, rejects caller-selected seed reads that do not match the active local script source, and rejects Neo4j/Qdrant seed writes when `CORTEX_ENV` is not `local-dev` or `NODE_ENV` is production. Batch relation writes are grouped by source, reject mixed-source batches, and scope matched nodes to the same source. The only production seed-label mutation allowed is the narrowly scoped `seed:legacy-unverified` quarantine for records with no source. `rollbackEventRelations` now requires and scopes its source argument.

Static evidence: the latest `npm run test:provenance` exited 0 and printed `[provenance-integrity] PASS`, scanned 162 script/scratch files, checked 9/9 PostgreSQL tables, and reported its seed-guard and Neo4j query-policy self-checks. Its deliberate missing `--target=local`, caller-selected seed read, mixed-source graph batch, and production seed-write cases were rejected before storage access. This does not prove every migration or policy against a live database.

PostgreSQL read-path follow-up: direct `source IN ('webhook','backfill')` filtering was added to dashboard, analytics, graph, chat/tool, PR-risk, identity resolution, successor, and ingestion-event lookup queries. The verifier uses the TypeScript AST and currently reports 130 PostgreSQL SQL-template reads from provenance tables checked; its self-check rejects an unscoped query and a predicate escaped through an ungrouped `OR`. This is source inspection/CI evidence, not live request evidence. `sql.unsafe` remains limited to PostgreSQL schema migration code in this checkout.

Seed guard-order follow-up: the script inventory check now rejects a DB-writing test/seed/fixture script if it lacks `assertSafeTestDatabase` or invokes it only after a database query/write. Self-checks include a delayed guard after an INSERT and a DB read before the guard; both are rejected. The check scans 162 scripts/scratch files.

Latest read-only configured-store query output (2026-09-26):

~~~json
{"database":"Cortex","postgres":{"events":0,"person_metrics":0,"workspace_metrics":0,"person_identity":0,"technology_metrics":0,"identity_merge_log":0,"potential_duplicates":0,"daily_reports":0,"repo_metrics":0},"neo4jDatabase":"89d67a45","graph":{"trustedNodes":0,"trustedRelationships":0},"qdrantCollection":"cortex_events","qdrantPoints":0}
~~~

PostgreSQL counts were read under the app connection's forced RLS policy; Neo4j counts were filtered to `webhook`/`backfill`; Qdrant `points_count` is the collection total. The earlier immediate post-reset output also showed total graph node/relationship counts at zero. These queries were read-only.

Production frontend evidence: `npm run build --prefix web` completed successfully. `npm run verify:web:artifact` scanned 10 files in `web/dist` and passed. A temporary `test-fixture.js` violation made it fail with `seed/test/fixture artifact filename`; after removing that temporary file, the same check passed clean. This checks the frontend bundle only; there is still no backend packaging manifest in this checkout.

Runtime-role finding: the configured PostgreSQL session query returned `seed_access_setting="off"`, `is_superuser=false`, and `bypasses_rls=true`. Therefore FORCE RLS did not protect this configured role. API startup now warns on SUPERUSER/BYPASSRLS status and continues, so functionality is not taken offline. Client deployment role provisioning and an actual production-mode startup with a non-bypass role remain not verified.

The checkout contains no backend deployment manifest, container recipe, or production packaging configuration to establish which source files ship to client deployments. The workflow checks source integrity but does not build/inspect a production deployment artifact. Test and seed scripts therefore rely on runtime guards; artifact exclusion remains **not verified**.

## Not verified

- Current PostgreSQL/Neo4j/Qdrant counts after the code changes. The recorded zero counts are the direct output immediately after the authorized reset. No application boot, schema migration, or post-change database-backed verifier was run. The configured endpoints resolve to hosted services and could not independently be confirmed as disposable, so no further database command was issued.
- Runtime enforcement of Neo4j write policy and Qdrant seed-write policy against the configured services.
- Provenance-clean repository, commit, PR, SPOF, healthy, scaffold, and dashboard values. As of the recorded reset, all three stores were empty, so no historical value can be re-derived from current records.
- Historical 92-vs-128 explanation, named repository pairs, and core-platform-gateway count. They remain **not verified** because the records were cleared after the user's test-only authorization and the earlier records had no trustworthy provenance.
- Invariant and golden-dataset verifiers against a local disposable database; post-change direct store counts; runtime RLS/query-policy enforcement; deliberate aggregate leakage injection and cleanup; production artifact exclusion; full TypeScript build. The provenance scan passed, but the repository-wide TypeScript check still exits nonzero on errors in other existing and modified files. The repo-metrics JSON typing and optional-index diagnostics previously observed were fixed; this does not establish a clean full build.
- Which exact historical script wrote each old row, genuine external delivery identity, and backfill lineage.
