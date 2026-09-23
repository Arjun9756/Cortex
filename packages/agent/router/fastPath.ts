import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

interface FastPathIntent {
    id: string;
    description: string;
    patterns: string[];
    executionPlan: {
        tool: string;
        [key: string]: any;
    };
}

let loadedIntents: FastPathIntent[] = [];

try {
    const yamlPath = path.resolve('packages/agent/router/intents.config.yaml');
    if (fs.existsSync(yamlPath)) {
        const fileContent = fs.readFileSync(yamlPath, 'utf8');
        const parsed = yaml.parse(fileContent);
        if (parsed && Array.isArray(parsed.intents)) {
            loadedIntents = parsed.intents;
        }
    }
} catch (e: any) {
    console.warn(`[FastPathRouter] Failed to load intents.config.yaml: ${e?.message}`);
}

/**
 * Cheap first-pass intent classifier for very common exact queries (latency optimization).
 * Returns matched tool plan if exact match found, or null to fall through to full agent loop.
 */
export function matchFastPathIntent(query: string): { tool: string; args: Record<string, any> } | null {
    if (!query || typeof query !== 'string' || loadedIntents.length === 0) {
        return null;
    }

    const normalized = query.trim().toLowerCase();

    for (const intent of loadedIntents) {
        for (const pattern of intent.patterns) {
            const p = pattern.trim().toLowerCase();
            // Strict match to prevent false positives — only match if pattern is exact or substantial prefix
            if (normalized === p || normalized === p + '?' || normalized.startsWith(p + ' ')) {
                const plan = intent.executionPlan;
                if (!plan || !plan.tool) continue;

                // Map legacy intent plans to new core tools where applicable
                if (intent.id === 'REPOSITORIES_BY_BUS_FACTOR') {
                    return { tool: 'get_bus_factor', args: { repo: 'ALL' } };
                }
                if (intent.id === 'REPOSITORY_RISK_AND_METRICS_QUERY') {
                    return { tool: 'get_bus_factor', args: {} };
                }

                return { tool: plan.tool, args: { ...plan } };
            }
        }
    }

    return null;
}
