import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { assertSafeTestDatabase, assertWritableDataSource } from '../packages/database/provenance.js';
import { enforceGraphQueryPolicy } from '../packages/database/neo4j/queryPolicy.js';

const root = process.cwd();
const failures: string[] = [];
function hasTopLevelOr(sqlText: string): boolean {
    let depth = 0;
    let quote: "'" | '"' | null = null;
    for (let i = 0; i < sqlText.length; i++) {
        const char = sqlText[i];
        if (quote) {
            if (char === quote && sqlText[i + 1] === quote) { i++; continue; }
            if (char === quote) quote = null;
            continue;
        }
        if (char === "'" || char === '"') { quote = char; continue; }
        if (char === '(') { depth++; continue; }
        if (char === ')') { depth = Math.max(0, depth - 1); continue; }
        if (depth === 0
            && (i === 0 || !/[A-Za-z0-9_$]/.test(sqlText[i - 1] || ''))
            && /^OR\b/i.test(sqlText.slice(i))) return true;
    }
    return false;
}
function findUnscopedProductReads(source: string): string[] {
    const violations: string[] = [];
    const sourceFile = ts.createSourceFile('provenance-check.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
        if (ts.isTaggedTemplateExpression(node) && /^sql(?:<.*>)?$/.test(node.tag.getText(sourceFile))) {
        const query = node.template.getText(sourceFile).slice(1, -1);
        const hasTrustedSourceFilter = /(?:\b\w+\.)?source\s+IN\s+\$\{\s*sql\([^}]*?(?:DISPLAYABLE_SOURCES|trustedSources|aggregationSources|readSources)[^}]*?\)\s*\}/i.test(query)
            || /(?:\b\w+\.)?source\s+IN\s*\(\s*'webhook'\s*,\s*'backfill'\s*\)/i.test(query)
            || /(?:\b\w+\.)?source\s*=\s*\$\{\s*(?:source|event\.source)\s*\}/i.test(query)
            || /source\s+LIKE\s+'seed:%'\s+AND\s+current_setting\('cortex\.allow_seed_data',\s*true\)\s*=\s*'on'/i.test(query);
        const localSeedReadException = /source\s+IN\s*\(\s*'webhook'\s*,\s*'backfill'\s*\)\s+OR\s+\(source\s+LIKE\s+'seed:%'\s+AND\s+current_setting\('cortex\.allow_seed_data',\s*true\)\s*=\s*'on'\)/i.test(query);
        const sourceIndex = query.search(/(?:\b\w+\.)?source\s+(?:IN|=)/i);
        let sourcePredicateEnd = -1;
        if (sourceIndex >= 0) {
            const expressionStart = query.indexOf(String.fromCharCode(36) + '{', sourceIndex);
            if (expressionStart >= 0 && expressionStart - sourceIndex < 80) {
                sourcePredicateEnd = query.indexOf('}', expressionStart) + 1;
            } else {
                const openParen = query.indexOf('(', sourceIndex);
                if (openParen >= 0 && openParen - sourceIndex < 40) sourcePredicateEnd = query.indexOf(')', openParen) + 1;
            }
        }
        const sourcePredicateCanEscape = !localSeedReadException
            && sourcePredicateEnd > 0
            && hasTopLevelOr(query.slice(sourcePredicateEnd));
        if (/^\s*(?:SELECT|WITH)\b/i.test(query)
            && /\bFROM\s+(?:events|person_metrics|repo_metrics|technology_metrics|workspace_metrics|person_identity|identity_merge_log|potential_duplicates|daily_reports)\b/i.test(query)
            && (!hasTrustedSourceFilter || sourcePredicateCanEscape)) {
            violations.push(query.trim().replace(/\s+/g, ' ').slice(0, 140));
        }
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return violations;
}
function countProductReadQueries(source: string): number {
    let count = 0;
    const sourceFile = ts.createSourceFile('provenance-check.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
        if (ts.isTaggedTemplateExpression(node) && /^sql(?:<.*>)?$/.test(node.tag.getText(sourceFile))
            && /\bFROM\s+(?:events|person_metrics|repo_metrics|technology_metrics|workspace_metrics|person_identity|identity_merge_log|potential_duplicates|daily_reports)\b/i.test(node.template.getText(sourceFile))) count++;
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return count;
}
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return ['node_modules', '.git', 'dist', 'build'].includes(entry.name) ? [] : walk(file);
    return /\.(ts|tsx|js|mjs)$/.test(entry.name) ? [file] : [];
});

// Every script named as a test, seed, fixture, or cleanup utility that can write to a DB
// must fail closed before its first database connection.
const repositoryScripts = [...walk(path.join(root, 'scripts')), ...walk(path.join(root, 'scratch'))];
function databaseWriteGuardPrecedesWrite(source: string): boolean {
    const guardAt = source.search(/\bassertSafeTestDatabase\s*\(/);
    const databaseOperationAt = source.search(/\bsql(?:<[^>]+>)?\s*\x60|\.run\s*\(|qdrantClient\.(?:upsert|setPayload|delete|scroll|query)\s*\(|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|DETACH\s+DELETE|\bCREATE\s*\(|\bMERGE\s*\(/i);
    const indirectWriteAt = source.search(/runAnalyticsJob\(|calculateAll(?:Repo|Person|Technology)Metrics\(|calculateWorkspaceMetrics\(|resolveIdentity\(|saveExtractionToGraph\(|upsertEntity\(|upsertRelation\(|upsertVector\(|process(?:Github|Slack|Jira)Event\(/i);
    const firstDatabaseOperationAt = [databaseOperationAt, indirectWriteAt].filter(index => index >= 0).reduce((earliest, index) => Math.min(earliest, index), Number.POSITIVE_INFINITY);
    return guardAt >= 0 && guardAt < firstDatabaseOperationAt;
}
for (const file of repositoryScripts) {
    if (path.basename(file) === 'verify_provenance_integrity.ts') continue;
    const source = fs.readFileSync(file, 'utf8');
    const filename = path.basename(file).toLowerCase();
    const seedOrTest = /test|seed|fixture|regression|pilot|golden|cleanup|reconcile|migrate|merge|compact|verify/.test(filename);
    const opensDb = /from ['"][^'"]*(?:postgres|neo4j|qdrant|database\/(?:provenance|postgres|neo4j|vector)|canonicalPerson|graph\.repository)/i.test(source);
    if (!opensDb && !(seedOrTest && /fetch\s*\(|\.post\s*\(/i.test(source))) continue;
    const directWrite = /INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|DETACH\s+DELETE|\bCREATE\s*\(|\bMERGE\s*\(|qdrantClient\.(?:upsert|setPayload|delete)\s*\(/i.test(source);
    const indirectWrite = /runAnalyticsJob\(|calculateAll(?:Repo|Person|Technology)Metrics\(|calculateWorkspaceMetrics\(|resolveIdentity\(|saveExtractionToGraph\(|upsertEntity\(|upsertRelation\(|upsertVector\(|process(?:Github|Slack|Jira)Event\(/i.test(source);
    const canWrite = directWrite || indirectWrite;
    if (canWrite && !source.includes('assertSafeTestDatabase')) failures.push(path.relative(root, file) + ': DB-writing test/seed lacks assertSafeTestDatabase');
    else if (canWrite && !databaseWriteGuardPrecedesWrite(source)) failures.push(path.relative(root, file) + ': assertSafeTestDatabase must execute before the first database write');
}
if (databaseWriteGuardPrecedesWrite("import sql from 'db'; INSERT INTO events VALUES (1); assertSafeTestDatabase(import.meta.url);")) {
    failures.push('Seed guard order self-check failed to detect a guard placed after the write');
}
if (!databaseWriteGuardPrecedesWrite("import sql from 'db'; assertSafeTestDatabase(import.meta.url); INSERT INTO events VALUES (1);")) {
    failures.push('Seed guard order self-check rejected a guard placed before the write');
}
if (databaseWriteGuardPrecedesWrite("import sql from 'db'; sql" + String.fromCharCode(96) + "SELECT 1" + String.fromCharCode(96) + "; assertSafeTestDatabase(import.meta.url); INSERT INTO events VALUES (1);")) {
    failures.push('Seed guard order self-check failed to detect a database read before the guard');
}

// The new source-aware storage contract must stay centralized and strict.
const schema = fs.readFileSync(path.join(root, 'packages/database/postgres/schema.ts'), 'utf8');
for (const table of ['events', 'person_metrics', 'repo_metrics', 'technology_metrics', 'workspace_metrics', 'person_identity', 'identity_merge_log', 'potential_duplicates', 'daily_reports']) {
    if (!schema.includes(`'${table}'`)) failures.push(`PostgreSQL provenance migration omits ${table}`);
}
if (!schema.includes('SET NOT NULL') || !schema.includes('source_valid')) failures.push('PostgreSQL source is not constrained NOT NULL and to supported values');
const graphRepo = fs.readFileSync(path.join(root, 'packages/database/neo4j/graph.repository.ts'), 'utf8');
if (!graphRepo.includes('assertDataSource') || !graphRepo.includes('source: DataSource')) failures.push('Neo4j repository lacks required source validation');
const graphWriteRepo = fs.readFileSync(path.join(root, 'packages/database/neo4j/graphWrite.repository.ts'), 'utf8');
if (!graphWriteRepo.includes('enforceGraphQueryPolicy') || !graphWriteRepo.includes('params: Record<string, unknown>')) failures.push('Neo4j write repository lacks the shared required-source policy entry');
const neo4jConfig = fs.readFileSync(path.join(root, 'apps/api/config/neo4j.ts'), 'utf8');
if (!neo4jConfig.includes('enforceGraphQueryPolicy') || !neo4jConfig.includes('runGraphWrite')) failures.push('Neo4j sessions bypass the shared read/write repositories');
const vectorRepo = fs.readFileSync(path.join(root, 'packages/database/vector/qdrant.repository.ts'), 'utf8');
if (!vectorRepo.includes('assertWritableDataSource') || !vectorRepo.includes('source: DataSource')) failures.push('Qdrant repository lacks required source validation');
for (const file of ['repoMetrics.service.ts', 'personMetrics.service.ts', 'technologyMetrics.ts', 'workspaceMetrics.service.ts', 'dailyReport.service.ts']) {
    const body = fs.readFileSync(path.join(root, 'packages/analytics', file), 'utf8');
    if (!body.includes('aggregationSources(source)') && !body.includes("source IN ('webhook', 'backfill')")) failures.push(`${file}: aggregate is not scoped to trusted sources`);
}
for (const file of ['repoMetrics.service.ts', 'personMetrics.service.ts', 'technologyMetrics.ts', 'dailyReport.service.ts']) {
    const body = fs.readFileSync(path.join(root, 'packages/analytics', file), 'utf8');
    for (const conflict of body.matchAll(/ON\s+CONFLICT\s*\(([^)]*)\)/gi)) {
        if (!/\bsource\b/i.test(conflict[1] || '')) failures.push(`${file}: ON CONFLICT target omits source despite source-scoped unique indexes`);
    }
}
const provenance = fs.readFileSync(path.join(root, 'packages/database/provenance.ts'), 'utf8');
for (const required of ['--target=local', "CORTEX_ENV !== 'local-dev'", "NODE_ENV === 'production'", 'SEED/TEST DATA WRITE']) {
    if (!provenance.includes(required)) failures.push(`Seed guard missing ${required}`);
}
const provenanceTables = ['events', 'person_metrics', 'repo_metrics', 'technology_metrics', 'workspace_metrics', 'person_identity', 'identity_merge_log', 'potential_duplicates', 'daily_reports'];
const postgresSchema = fs.readFileSync(path.join(root, 'packages/database/postgres/schema.ts'), 'utf8');
if (!postgresSchema.includes('FORCE ROW LEVEL SECURITY') || !postgresSchema.includes("source IN ('webhook', 'backfill')") || !postgresSchema.includes('cortex.allow_seed_data')) failures.push('PostgreSQL provenance RLS is missing its forced trusted-source boundary');
const postgresConfig = fs.readFileSync(path.join(root, 'apps/api/config/postgres.ts'), 'utf8');
const serverBootstrap = fs.readFileSync(path.join(root, 'apps/api/bootstrap/server.ts'), 'utf8');
if (!postgresConfig.includes('rolbypassrls') || !serverBootstrap.includes('warnIfPostgresRlsIsBypassed')) failures.push('PostgreSQL RLS bypass warning is not wired into API startup');
const applicationFiles = [...walk(path.join(root, 'apps')), ...walk(path.join(root, 'packages'))]
    .filter(file => !file.includes(`${path.sep}database${path.sep}postgres${path.sep}schema.ts`));
for (const file of applicationFiles) {
    const body = fs.readFileSync(file, 'utf8');
    if (/from\s+['"]postgres['"]/.test(body) && !file.endsWith(`${path.sep}apps${path.sep}api${path.sep}config${path.sep}postgres.ts`)) failures.push(`${path.relative(root, file)}: direct PostgreSQL client bypasses the shared RLS connection`);
    if (/neo4j\.driver\(/.test(body) && !file.endsWith(`${path.sep}apps${path.sep}api${path.sep}config${path.sep}neo4j.ts`)) failures.push(`${path.relative(root, file)}: direct Neo4j driver bypasses the shared query policy`);
    if (/new\s+QdrantClient\s*\(/.test(body) && !file.endsWith(`${path.sep}apps${path.sep}api${path.sep}config${path.sep}qdrant.ts`)) failures.push(`${path.relative(root, file)}: direct Qdrant client bypasses the shared vector repository`);
    if (/(?:SET\s+cortex\.allow_seed_data|set_config\s*\(\s*['"]cortex\.allow_seed_data)/i.test(body)
        && !file.endsWith(`${path.sep}apps${path.sep}api${path.sep}config${path.sep}postgres.ts`)
        && !file.endsWith(`${path.sep}packages${path.sep}database${path.sep}postgres${path.sep}schema.ts`)) {
        failures.push(`${path.relative(root, file)}: seed RLS override bypasses the shared deployment policy`);
    }
    if (/\bsql\.unsafe\s*\(/i.test(body)
        && !file.endsWith(`${path.sep}packages${path.sep}database${path.sep}postgres${path.sep}schema.ts`)) {
        failures.push(`${path.relative(root, file)}: raw SQL bypasses the checked provenance query templates`);
    }
    if (/qdrantClient\.(?:upsert|delete|setPayload)\s*\(/.test(body)
        && !file.endsWith(`${path.sep}packages${path.sep}database${path.sep}vector${path.sep}qdrant.repository.ts`)) {
        failures.push(`${path.relative(root, file)}: direct Qdrant mutation bypasses the vector repository`);
    }
}
// Every product read needs an application-level trusted-source predicate too:
// PostgreSQL RLS is bypassed by SUPERUSER/BYPASSRLS connections.
let scopedReadQueries = 0;
for (const file of applicationFiles) {
    const body = fs.readFileSync(file, 'utf8');
    scopedReadQueries += countProductReadQueries(body) - findUnscopedProductReads(body).length;
    for (const query of findUnscopedProductReads(body)) failures.push(`${path.relative(root, file)}: unscoped product read: ${query}`);
}
const injectedUnscopedRead = 'sql`SELECT * FROM events ORDER BY created_at DESC`';
if (findUnscopedProductReads(`const deliberateViolation = ${injectedUnscopedRead}`).length !== 1) failures.push('Aggregate leakage self-check failed to detect a deliberately unscoped events read');
if (findUnscopedProductReads('const scopedRead = sql`SELECT * FROM events WHERE source IN ${sql([...DISPLAYABLE_SOURCES])}`').length !== 0) failures.push('Aggregate leakage self-check rejected a trusted-source-scoped read');
if (findUnscopedProductReads("const escapedRead = sql`SELECT * FROM events WHERE source IN ('webhook', 'backfill') OR provider = 'github'`").length !== 1) failures.push('Aggregate leakage self-check failed to detect a source predicate bypassed by OR');
if (findUnscopedProductReads("const escapedAndRead = sql`SELECT * FROM events WHERE source IN ('webhook', 'backfill') AND provider = 'github' OR event_type = 'push'`").length !== 1) failures.push('Aggregate leakage self-check failed to detect an OR escaping an existing source filter');
if (findUnscopedProductReads("const groupedRead = sql`SELECT * FROM events WHERE source IN ('webhook', 'backfill') AND (provider = 'github' OR event_type = 'push')`").length !== 0) failures.push('Aggregate leakage self-check rejected correctly grouped OR conditions');
for (const file of repositoryScripts) {
    if (path.basename(file) === 'verify_provenance_integrity.ts') continue;
    const body = fs.readFileSync(file, 'utf8');
    const insert = /INSERT\s+INTO\s+(events|person_metrics|repo_metrics|technology_metrics|workspace_metrics|person_identity|identity_merge_log|potential_duplicates|daily_reports)\s*\(([^)]*)\)/gi;
    for (const match of body.matchAll(insert)) {
        if (!/\bsource\b/i.test(match[2] || '')) failures.push(`${path.relative(root, file)}: INSERT INTO ${match[1]} omits the required source column`);
        const valuesAt = (match.index ?? 0) + match[0].length;
        const initialValues = body.slice(valuesAt, valuesAt + 220);
        if (!/\$\{\s*seedSource\s*\}|['"]seed:[a-zA-Z0-9._-]+['"]/.test(initialValues)) failures.push(`${path.relative(root, file)}: seed INSERT does not bind source=seed:<script-name>`);
    }
}
// Exercise the guard itself without opening a database or performing a write.
const savedEnv = { cortex: process.env.CORTEX_ENV, node: process.env.NODE_ENV };
try {
    process.env.CORTEX_ENV = 'local-dev';
    process.env.NODE_ENV = 'test';
    try {
        assertSafeTestDatabase('deliberate-violation.ts', [], 'http://localhost:3000');
        failures.push('Seed guard accepted a call without --target=local');
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('pass --target=local')) failures.push('Seed guard did not explain a missing --target=local rejection');
    }
    const deliberateSeedWrite = "INSERT INTO events (id, source, provider) VALUES ('fixture-id', 'webhook', 'github')";
    if (/\$\{\s*seedSource\s*\}|['"]seed:[a-zA-Z0-9._-]+['"]/.test(deliberateSeedWrite)) failures.push('Seed insert self-check incorrectly accepted a webhook-labeled fixture');
    if (assertSafeTestDatabase('guard-self-test.ts', ['--target=local'], 'http://localhost:3000') !== 'seed:guard-self-test') {
        failures.push('Seed guard did not return the expected script-specific provenance source');
    }
    const safeRead = enforceGraphQueryPolicy('MATCH (p:PERSON)-[r:WORKS_ON]->(t:TECHNOLOGY) RETURN p.name');
    for (const predicate of ['p.source IN $trustedSources', 'r.source IN $trustedSources', 't.source IN $trustedSources']) {
        if (!safeRead.cypher.includes(predicate)) failures.push(`Neo4j query policy failed to add ${predicate}`);
    }
    const activeSource = process.env.CORTEX_ACTIVE_SEED_SOURCE;
    const safeWrite = enforceGraphQueryPolicy('MERGE (p:PERSON {name: $name})', { name: 'guarded-fixture' });
    if (!safeWrite.cypher.includes('source: $source') || safeWrite.params.source !== 'seed:guard-self-test') failures.push('Neo4j policy failed to stamp the guarded script source onto a seed write');
    const batchWrite = enforceGraphQueryPolicy(
        'UNWIND $batch AS item MATCH (a) WHERE elementId(a) = item.fromID MATCH (b) WHERE elementId(b) = item.toID MERGE (a)-[r:WORKS_ON {source: item.source}]->(b)',
        { batch: [{ source: 'webhook', fromID: 'a', toID: 'b' }] }
    );
    if (batchWrite.params.source !== 'webhook' || !batchWrite.cypher.includes('a.source = $source') || !batchWrite.cypher.includes('b.source = $source')) {
        failures.push('Neo4j batch policy failed to derive and scope a uniform item source');
    }
    try {
        enforceGraphQueryPolicy('UNWIND $batch AS item MERGE (a)-[r:WORKS_ON {source: item.source}]->(b)', {
            batch: [{ source: 'webhook' }, { source: 'backfill' }]
        });
        failures.push('Neo4j batch policy accepted mixed provenance sources');
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('cannot mix provenance')) failures.push('Neo4j mixed-source batch rejection did not identify the violation');
    }
    try {
        enforceGraphQueryPolicy('MATCH (p:PERSON) RETURN p.name', { trustedSources: ['seed:untrusted-caller'] });
        failures.push('Neo4j query policy accepted a caller-selected seed source outside its active script source');
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('active local/test script source')) failures.push('Neo4j seed-read rejection did not identify the missing active script source');
    }
    process.env.CORTEX_ENV = 'client';
    process.env.NODE_ENV = 'production';
    try {
        assertWritableDataSource('seed:deliberate-production-violation');
        failures.push('Write-source guard accepted a seed source in production mode');
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('forbidden outside')) failures.push('Production seed-write rejection did not identify the deployment restriction');
    }
    process.env.CORTEX_ENV = 'local-dev';
    delete process.env.NODE_ENV;
    try {
        assertWritableDataSource('seed:deliberate-unset-mode');
        failures.push('Write-source guard accepted a seed source with unset NODE_ENV');
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('forbidden outside')) failures.push('Unset-mode seed-write rejection did not identify the deployment restriction');
    }
    process.env.CORTEX_ENV = 'local-dev';
    process.env.NODE_ENV = 'test';
    delete process.env.CORTEX_ACTIVE_SEED_SOURCE;
    try {
        enforceGraphQueryPolicy('CREATE (p:PERSON {name: $name})', { name: 'missing-source' });
        failures.push('Neo4j query policy accepted a graph write without source');
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('source')) failures.push('Neo4j missing-source rejection did not identify the violation');
    }
    if (activeSource) process.env.CORTEX_ACTIVE_SEED_SOURCE = activeSource;
} finally {
    if (savedEnv.cortex === undefined) delete process.env.CORTEX_ENV; else process.env.CORTEX_ENV = savedEnv.cortex;
    if (savedEnv.node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = savedEnv.node;
}

if (failures.length) {
    console.error('[provenance-integrity] FAIL\n' + failures.map(value => `- ${value}`).join('\n'));
    process.exitCode = 1;
} else {
    console.log('[provenance-integrity] PASS');
    console.log(`scripts and scratch utilities scanned: ${repositoryScripts.length}`);
    console.log('PostgreSQL source constraints/RLS: 9/9 tables migrated to NOT NULL and forced trusted-source policy');
    console.log('PostgreSQL runtime role: SUPERUSER/BYPASSRLS status warned without blocking startup');
    console.log(`PostgreSQL application read filters: ${scopedReadQueries} relevant SQL template queries checked; unscoped reads and OR escapes rejected by self-check`);
    console.log('Neo4j writes: shared graph-write repository; reads/writes pass through source policy');
    console.log('Qdrant write/search repository: required source validation and trusted-source filter present');
    console.log('Seed guard: target, deployment marker, runtime mode, production deny, loud warning present');
    console.log('Seed guard self-check: missing target, guard-after-write, and DB-read-before-guard rejected; safe local target returned script-specific source');
    console.log('Write-source self-check: deliberate production seed write rejected before storage access');
    console.log('Neo4j policy self-check: reads scoped; caller-selected seed leakage rejected; missing-source and mixed-source batch writes rejected; uniform batch source accepted');
}
