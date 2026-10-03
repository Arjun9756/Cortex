import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function getMasterKey(): Buffer {
    const rawSecret = process.env.ENCRYPTION_KEY || 
                      process.env.SERVER_SECRET || 
                      process.env.JWT_SECRET || 
                      'cortex-default-enterprise-master-key-32b';
    return crypto.createHash('sha256').update(rawSecret).digest();
}

/**
 * Encrypts a sensitive string (token, secret, API key) using AES-256-GCM.
 * Safe to call on already-encrypted strings (idempotent).
 */
export function encryptSecret(plaintext: string | null | undefined): string | null {
    if (!plaintext || typeof plaintext !== 'string') return plaintext as any;
    const trimmed = plaintext.trim();
    if (!trimmed) return plaintext;
    if (trimmed.startsWith(PREFIX)) return trimmed; // already encrypted

    try {
        const key = getMasterKey();
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(trimmed, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err: any) {
        console.error('[Encryption] Error encrypting token/secret:', err?.message);
        return plaintext; // fallback
    }
}

/**
 * Decrypts an AES-256-GCM envelope string.
 * Gracefully returns unencrypted strings as-is for backward compatibility.
 */
export function decryptSecret(ciphertext: string | null | undefined): string | null {
    if (!ciphertext || typeof ciphertext !== 'string') return ciphertext as any;
    const trimmed = ciphertext.trim();
    if (!trimmed || !trimmed.startsWith(PREFIX)) {
        return trimmed; // not encrypted, return legacy plaintext
    }

    try {
        const parts = trimmed.slice(PREFIX.length).split(':');
        const ivHex = parts[0];
        const authTagHex = parts[1];
        const encryptedHex = parts[2];
        if (!ivHex || !authTagHex || !encryptedHex) {
            console.warn('[Encryption] Invalid encrypted token envelope structure');
            return trimmed;
        }

        const key = getMasterKey();
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        const dec1 = decipher.update(encryptedHex, 'hex', 'utf8');
        const dec2 = decipher.final('utf8');

        return `${dec1}${dec2}`;
    } catch (err: any) {
        console.error('[Encryption] Failed to decrypt token/secret:', err?.message);
        return trimmed;
    }
}
