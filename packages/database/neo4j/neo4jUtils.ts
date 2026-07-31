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
