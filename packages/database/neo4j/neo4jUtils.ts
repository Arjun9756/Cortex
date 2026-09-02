import neo4j from 'neo4j-driver';

/**
 * Converts a Neo4j Integer ({low, high}), a plain JS number, or any value
 * that represents a millisecond timestamp into a readable ISO 8601 date string.
 * Returns null if the value is null/undefined.
 */
export function toReadableTimestamp(value: any): string | null {
    if (value == null) return null;
    if (neo4j.isInt(value)) {
        return new Date(value.toNumber()).toISOString();
    }
    if (typeof value === 'number') {
        return new Date(value).toISOString();
    }
    if (typeof value === 'object' && 'low' in value && 'high' in value) {
        // Manual reconstruction for cases where neo4j.isInt() returns false
        const low = value.low as number;
        const high = value.high as number;
        const ms = high * 4294967296 + (low >>> 0);
        return new Date(ms).toISOString();
    }
    return String(value);
}

/**
 * Unwraps a single Neo4j value. If it's an Integer, turns it into a JS number or ISO timestamp.
 */
export function sanitizeNeo4jValue(value: any, keyName?: string): any {
    if (value == null) return value;
    
    // Check if it's a Neo4j Integer or {low, high} object
    if (neo4j.isInt(value) || (typeof value === 'object' && 'low' in value && 'high' in value)) {
        const num = neo4j.isInt(value) 
            ? value.toNumber() 
            : (value.high * 4294967296 + (value.low >>> 0));
        
        // If key name implies a date/time or value is in epoch milliseconds range (> 1000000000000)
        const isTimeKey = keyName && /created|updated|timestamp|date|time/i.test(keyName);
        if (isTimeKey || num > 1000000000000) {
            try {
                return new Date(num).toISOString();
            } catch {
                return num;
            }
        }
        return num;
    }

    if (Array.isArray(value)) {
        return value.map((item, idx) => sanitizeNeo4jValue(item, keyName));
    }

    if (typeof value === 'object' && value.constructor === Object) {
        const cleaned: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
            cleaned[k] = sanitizeNeo4jValue(v, k);
        }
        return cleaned;
    }

    return value;
}

/**
 * Recursively cleans a properties map from Neo4j, converting all {low, high} Integers
 * to proper JS numbers or ISO date strings.
 */
export function sanitizeNeo4jProperties(props: any): any {
    if (!props || typeof props !== 'object') return props;
    return sanitizeNeo4jValue(props);
}

