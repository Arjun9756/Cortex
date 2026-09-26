import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'cortex_store.json');
function getDefaultConnectors() {
    const baseUrl = process.env.DEPLOYMENT_WEBHOOK_BASE_URL || 'http://localhost:3000';
    const now = Date.now();
    return {
        github: {
            provider: 'github',
            name: 'GitHub',
            status: 'not_connected',
            accessToken: null,
            refreshToken: null,
            tokenExpiresAt: null,
            lastTokenCheck: null,
            lastError: null,
            scopeRules: {
                allMonitored: true,
                monitoredItems: ['*'],
            },
            webhookConfig: {
                registered: false,
                webhookUrl: `${baseUrl}/api/github/webhook`,
                signatureHeader: 'x-hub-signature-256',
                secretMasked: '••••••••',
            },
            eventCount: 0,
            updatedAt: now,
        },
        slack: {
            provider: 'slack',
            name: 'Slack',
            status: 'not_connected',
            accessToken: null,
            refreshToken: null,
            tokenExpiresAt: null,
            lastTokenCheck: null,
            lastError: null,
            scopeRules: {
                allMonitored: true,
                monitoredItems: ['*'],
            },
            webhookConfig: {
                registered: false,
                webhookUrl: `${baseUrl}/api/slack/webhook`,
                signatureHeader: 'x-slack-signature',
                secretMasked: '••••••••',
            },
            eventCount: 0,
            updatedAt: now,
        },
        jira: {
            provider: 'jira',
            name: 'Jira',
            status: 'not_connected',
            accessToken: null,
            refreshToken: null,
            tokenExpiresAt: null,
            lastTokenCheck: null,
            lastError: null,
            scopeRules: {
                allMonitored: true,
                monitoredItems: ['*'],
            },
            webhookConfig: {
                registered: false,
                webhookUrl: `${baseUrl}/api/jira/webhook`,
                signatureHeader: 'x-jira-webhook-secret',
                secretMasked: '••••••••',
            },
            eventCount: 0,
            updatedAt: now,
        },
    };
}
class Store {
    state;
    constructor() {
        this.state = this.loadFromDisk();
    }
    loadFromDisk() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const raw = fs.readFileSync(DATA_FILE, 'utf-8');
                const parsed = JSON.parse(raw);
                // Ensure all default providers exist
                const defaults = getDefaultConnectors();
                parsed.connectors = { ...defaults, ...(parsed.connectors || {}) };
                parsed.persons = parsed.persons || {};
                parsed.events = parsed.events || [];
                parsed.auditLogs = parsed.auditLogs || [];
                return parsed;
            }
        }
        catch (err) {
            console.warn('[Store] Warning loading data file, initializing fresh store:', err?.message);
        }
        return {
            connectors: getDefaultConnectors(),
            persons: {},
            events: [],
            auditLogs: [],
        };
    }
    saveToDisk() {
        try {
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }
            fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('[Store] Failed to write data to disk:', err?.message);
        }
    }
    resetAll() {
        this.state = {
            connectors: getDefaultConnectors(),
            persons: {},
            events: [],
            auditLogs: [],
        };
        this.saveToDisk();
    }
    // ─── Connector Methods ───────────────────────────────────────────────
    getConnector(provider) {
        if (!this.state.connectors[provider]) {
            this.state.connectors[provider] = getDefaultConnectors()[provider];
        }
        return this.state.connectors[provider];
    }
    getAllConnectors() {
        return this.state.connectors;
    }
    hasAnyConnected() {
        return Object.values(this.state.connectors).some((c) => c.status === 'connected' || c.status === 'needs_reauth');
    }
    updateConnector(provider, patch) {
        const current = this.getConnector(provider);
        this.state.connectors[provider] = {
            ...current,
            ...patch,
            updatedAt: Date.now(),
        };
        this.saveToDisk();
        return this.state.connectors[provider];
    }
    incrementEventCount(provider) {
        const current = this.getConnector(provider);
        current.eventCount = (current.eventCount || 0) + 1;
        this.saveToDisk();
    }
    // ─── Person & Identity Methods ───────────────────────────────────────
    getPerson(personId) {
        return this.state.persons[personId] || null;
    }
    getAllPersons() {
        return Object.values(this.state.persons);
    }
    findPersonByEmail(email) {
        if (!email)
            return null;
        const clean = email.trim().toLowerCase();
        for (const p of Object.values(this.state.persons)) {
            if (p.verifiedEmail && p.verifiedEmail.trim().toLowerCase() === clean) {
                return p;
            }
            for (const id of p.identities) {
                if (id.email && id.email.trim().toLowerCase() === clean) {
                    return p;
                }
            }
        }
        return null;
    }
    findPersonByUsername(username) {
        if (!username)
            return null;
        const clean = username.trim().toLowerCase();
        for (const p of Object.values(this.state.persons)) {
            for (const id of p.identities) {
                if (id.username && id.username.trim().toLowerCase() === clean) {
                    return p;
                }
            }
        }
        return null;
    }
    savePerson(person) {
        this.state.persons[person.id] = person;
        this.saveToDisk();
    }
    deletePerson(personId) {
        if (this.state.persons[personId]) {
            delete this.state.persons[personId];
            this.saveToDisk();
        }
    }
    // ─── Event Ingestion Records ─────────────────────────────────────────
    addEvent(record) {
        this.state.events.unshift(record); // newest first
        if (this.state.events.length > 200) {
            this.state.events.pop(); // keep last 200
        }
        this.saveToDisk();
    }
    getEvents(limit = 50) {
        return this.state.events.slice(0, limit);
    }
    // ─── Audit Logs ──────────────────────────────────────────────────────
    addAuditLog(entry) {
        const fullEntry = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            timestamp: Date.now(),
            ...entry,
        };
        this.state.auditLogs.unshift(fullEntry);
        if (this.state.auditLogs.length > 200) {
            this.state.auditLogs.pop();
        }
        this.saveToDisk();
        return fullEntry;
    }
    getAuditLogs(limit = 50) {
        return this.state.auditLogs.slice(0, limit);
    }
}
export const store = new Store();
