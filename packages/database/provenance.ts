import path from 'node:path';

/** Origin of persisted data. Seed sources are deliberately excluded from product reads. */
export type DataSource = 'webhook' | 'backfill' | `seed:${string}`;

export const DISPLAYABLE_SOURCES = ['webhook', 'backfill'] as const satisfies readonly DataSource[];

/** Product aggregates include live/backfilled data; guarded local tests may aggregate only their own seed. */
export function aggregationSources(source: DataSource): readonly string[] {
    return source.startsWith('seed:') ? [source] : DISPLAYABLE_SOURCES;
}

export function assertDataSource(source: unknown): asserts source is DataSource {
    if (source !== 'webhook' && source !== 'backfill' && !(typeof source === 'string' && /^seed:[a-zA-Z0-9._-]+$/.test(source))) {
        throw new Error(`Invalid provenance source: ${String(source)}`);
    }
}

/** Seed labels are writeable only in an explicitly disposable, non-production deployment. */
export function assertWritableDataSource(source: unknown): asserts source is DataSource {
    assertDataSource(source);
    if (typeof source === 'string' && source.startsWith('seed:')
        && (process.env.CORTEX_ENV !== 'local-dev' || !['development', 'test'].includes(process.env.NODE_ENV || ''))) {
        throw new Error('[Provenance] Seed data writes are forbidden outside non-production CORTEX_ENV=local-dev.');
    }
}

export function seedSourceFor(scriptPath: string): DataSource {
    const filename = path.basename(scriptPath).replace(/\.[^.]+$/, '');
    const source: DataSource = `seed:${filename}`;
    assertDataSource(source);
    return source;
}

/** Must be the first operation in a DB-writing seed/test/fixture script. */
export function assertSafeTestDatabase(scriptPath: string, argv = process.argv, targetUrl?: string): DataSource {
    const source = seedSourceFor(scriptPath);
    const problems: string[] = [];
    if (!argv.includes('--target=local')) problems.push('pass --target=local');
    if (process.env.CORTEX_ENV !== 'local-dev') problems.push('set CORTEX_ENV=local-dev for an explicitly disposable development deployment');
    if (!['development', 'test'].includes(process.env.NODE_ENV || '')) problems.push('set NODE_ENV=development or NODE_ENV=test');
    if (process.env.NODE_ENV === 'production') problems.push('seed execution is forbidden when NODE_ENV=production');
    if (targetUrl) {
        try {
            const target = new URL(targetUrl);
            const loopback = ['localhost', '127.0.0.1', '::1'].includes(target.hostname);
            const allowedOrigins = (process.env.CORTEX_TEST_API_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
            if (!loopback && !allowedOrigins.includes(target.origin)) problems.push(`API target ${target.origin} is not loopback or listed in CORTEX_TEST_API_ORIGINS`);
        } catch {
            problems.push('the configured test API target is not a valid URL');
        }
    }
    if (problems.length) {
        throw new Error(`[UNSAFE DATABASE TARGET] Refusing to run ${path.basename(scriptPath)}: ${problems.join('; ')}. This guard is required even when databases run in a client cloud.`);
    }
    console.warn(`\n[SEED/TEST DATA WRITE] ${path.basename(scriptPath)} will write source=${source} to the explicitly marked local-dev deployment.\n`);
    process.env.CORTEX_ACTIVE_SEED_SOURCE = source;
    return source;
}

/** A local fixture request may mark webhook-shaped payloads as seed data only in local-dev. */
export function sourceForWebhookRequest(seedHeader: unknown): DataSource {
    if (seedHeader == null || seedHeader === '') return 'webhook';
    if (process.env.CORTEX_ENV !== 'local-dev' || !['development', 'test'].includes(process.env.NODE_ENV || '')) {
        throw new Error('Seed source headers are accepted only in a non-production CORTEX_ENV=local-dev deployment');
    }
    assertDataSource(seedHeader);
    if (!seedHeader.startsWith('seed:')) throw new Error('Fixture request source must use seed:<script-name>');
    return seedHeader;
}
