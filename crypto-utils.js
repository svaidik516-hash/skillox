const crypto = require('crypto');
require('dotenv').config();

// Derive a steady 32-byte (256-bit) encryption key from environment secret
function getEncryptionKey() {
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('FATAL: No encryption key configured. Set ENCRYPTION_KEY or JWT_SECRET in your environment.');
    }
    return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a string using AES-256-GCM (Authenticated Encryption)
 * @param {string} text - Plaintext string to encrypt
 * @returns {string} Encrypted string in format "ENC:iv:ciphertext:tag" or original text if empty
 */
function encryptField(text) {
    if (!text || typeof text !== 'string' || text.startsWith('ENC:')) return text;
    try {
        const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
        const key = getEncryptionKey();
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        
        let ciphertext = cipher.update(text, 'utf8', 'base64');
        ciphertext += cipher.final('base64');
        const tag = cipher.getAuthTag().toString('base64');

        return `ENC:${iv.toString('base64')}:${ciphertext}:${tag}`;
    } catch (err) {
        console.error('Encryption error:', err);
        return text;
    }
}

/**
 * Decrypts an AES-256-GCM encrypted string
 * @param {string} encryptedText - Formatted string "ENC:iv:ciphertext:tag"
 * @returns {string} Decrypted cleartext or original text if not encrypted/tampered
 */
function decryptField(encryptedText) {
    if (!encryptedText || typeof encryptedText !== 'string' || !encryptedText.startsWith('ENC:')) {
        return encryptedText;
    }

    const parts = encryptedText.split(':');
    if (parts.length < 4) return encryptedText;

    const iv = Buffer.from(parts[1], 'base64');
    const ciphertext = parts[2];
    const tag = Buffer.from(parts[3], 'base64');

    // Attempt decryption with a specific secret
    const attemptDecrypt = (secret) => {
        if (!secret) return null;
        try {
            const key = crypto.createHash('sha256').update(secret).digest();
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(tag);
            let cleartext = decipher.update(ciphertext, 'base64', 'utf8');
            cleartext += decipher.final('utf8');
            return cleartext;
        } catch (err) {
            return null;
        }
    };

    // Try primary ENCRYPTION_KEY first
    let result = attemptDecrypt(process.env.ENCRYPTION_KEY);
    
    // If it fails, fallback to JWT_SECRET (for older records)
    if (!result && process.env.JWT_SECRET) {
        result = attemptDecrypt(process.env.JWT_SECRET);
    }

    if (result) return result;

    console.warn('Decryption failed for record. Both keys failed.');
    return '[Encrypted Security Record]';
}

module.exports = {
    encryptField,
    decryptField
};
