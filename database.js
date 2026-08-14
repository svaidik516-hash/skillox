/* =============================================
   SKILLOX — Vercel Postgres Database Module
   ============================================= */

const { sql } = require('@vercel/postgres');
const { encryptField, decryptField } = require('./crypto-utils');

/**
 * Initialize the database tables if they don't exist
 */
async function initDb() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                login_count INTEGER DEFAULT 1,
                status VARCHAR(20) DEFAULT 'active'
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS otp_requests (
                email VARCHAR(255) PRIMARY KEY,
                otp VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                password VARCHAR(255),
                type VARCHAR(20) NOT NULL,
                expires_at BIGINT NOT NULL,
                attempts INTEGER DEFAULT 0
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS login_logs (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                ip_address VARCHAR(45),
                status VARCHAR(20) NOT NULL CHECK(status IN ('success', 'failed')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await sql`CREATE INDEX IF NOT EXISTS idx_login_logs_email ON login_logs(email);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_login_logs_created ON login_logs(created_at);`;

        await sql`
            CREATE TABLE IF NOT EXISTS contact_messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'unread',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_contact_msgs_created ON contact_messages(created_at);`;

        await sql`
            CREATE TABLE IF NOT EXISTS user_messages (
                id SERIAL PRIMARY KEY,
                recipient_email VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'unread',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_user_messages_email ON user_messages(recipient_email);`;

        // Handle migration if table existed before without name/password_hash columns
        try { await sql`ALTER TABLE users ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'User'`; } catch (e) {}
        try { await sql`ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT 'none'`; } catch (e) {}
        // Migration: Add attempts column to otp_requests
        try { await sql`ALTER TABLE otp_requests ADD COLUMN attempts INTEGER DEFAULT 0`; } catch (e) {}
        // Migration: Expand OTP column to hold bcrypt hashes
        try { await sql`ALTER TABLE otp_requests ALTER COLUMN otp TYPE VARCHAR(255)`; } catch (e) {}
        // Migration: Add status column to users
        try { await sql`ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'`; } catch (e) {}
        // Migration: Add two_factor_enabled column to users
        try { await sql`ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false`; } catch (e) {}
        // Migration: Add two_factor_email column to users
        try { await sql`ALTER TABLE users ADD COLUMN two_factor_email VARCHAR(255)`; } catch (e) {}
        // Migration: Add TOTP authentication columns to users
        try { await sql`ALTER TABLE users ADD COLUMN totp_secret VARCHAR(255)`; } catch (e) {}
        try { await sql`ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN DEFAULT false`; } catch (e) {}

        // Table: High-Security Active Sessions Tracking
        await sql`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id VARCHAR(255) PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                device_info VARCHAR(255),
                ip_address VARCHAR(45),
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(user_email);`;

        console.log('✓ Vercel Postgres Database initialized');
    } catch (error) {
        if (error.message && error.message.includes('VercelPostgresError')) {
            console.warn('⚠️ Vercel Postgres not configured locally (missing POSTGRES_URL). Skipping DB init.');
        } else {
            console.error('Failed to initialize database tables:', error);
        }
    }
}

/**
 * Create a new user (Signup)
 */
async function createUser(name, email, passwordHash) {
    try {
        const result = await sql`
            INSERT INTO users (name, email, password_hash, created_at, last_login, login_count, status)
            VALUES (${name}, ${email}, ${passwordHash}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 'active')
            RETURNING id, name, email;
        `;
        return result.rows[0];
    } catch (error) {
        if (error.code === '23505') { // unique_violation
            throw new Error('Email already exists');
        }
        console.error('Error in createUser:', error);
        throw error;
    }
}

/**
 * Get user by email (For Login verification)
 */
async function getUserByEmail(email) {
    try {
        const result = await sql`
            SELECT * FROM users WHERE email = ${email}
        `;
        return result.rows[0];
    } catch (error) {
        console.error('Error in getUserByEmail:', error);
        throw error;
    }
}

/**
 * Update user password
 */
async function updateUserPassword(email, newPasswordHash) {
    try {
        await sql`
            UPDATE users SET password_hash = ${newPasswordHash}
            WHERE email = ${email}
        `;
    } catch (error) {
        console.error('Error in updateUserPassword:', error);
        throw error;
    }
}

/**
 * Update user login stats
 */
async function recordLoginSuccess(email) {
    try {
        await sql`
            UPDATE users SET 
                last_login = CURRENT_TIMESTAMP,
                login_count = login_count + 1
            WHERE email = ${email}
        `;
    } catch (error) {
        console.error('Error in recordLoginSuccess:', error);
    }
}

/**
 * Log a login attempt (success or failure).
 */
async function logLogin(email, ipAddress, status) {
    try {
        const result = await sql`
            INSERT INTO login_logs (email, ip_address, status, created_at)
            VALUES (${email}, ${ipAddress || 'unknown'}, ${status}, CURRENT_TIMESTAMP)
            RETURNING *;
        `;
        return result.rows[0];
    } catch (error) {
        console.error('Error in logLogin:', error);
        throw error;
    }
}

/**
 * Get all registered users.
 */
async function getAllUsers() {
    try {
        const result = await sql`
            SELECT id, name, email, created_at, last_login, login_count, status
            FROM users
            ORDER BY last_login DESC
        `;
        return result.rows;
    } catch (error) {
        console.error('Error in getAllUsers:', error);
        throw error;
    }
}

/**
 * Get login logs, most recent first.
 */
async function getLoginLogs(limit = 200) {
    try {
        const result = await sql`
            SELECT id, email, ip_address, status, created_at
            FROM login_logs
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
        return result.rows;
    } catch (error) {
        console.error('Error in getLoginLogs:', error);
        throw error;
    }
}

/**
 * Delete a specific login log by ID.
 */
async function deleteLoginLog(id) {
    try {
        await sql`DELETE FROM login_logs WHERE id = ${id}`;
        return true;
    } catch (error) {
        console.error('Error in deleteLoginLog:', error);
        throw error;
    }
}

/**
 * Get summary statistics.
 */
async function getStats() {
    try {
        const totalUsers = await sql`SELECT COUNT(*) FROM users`;
        const totalAttempts = await sql`SELECT COUNT(*) FROM login_logs`;
        const successfulLogins = await sql`SELECT COUNT(*) FROM login_logs WHERE status = 'success'`;
        const failedLogins = await sql`SELECT COUNT(*) FROM login_logs WHERE status = 'failed'`;
        const loginsToday = await sql`SELECT COUNT(*) FROM login_logs WHERE DATE(created_at) = CURRENT_DATE`;

        return {
            total_users: parseInt(totalUsers.rows[0].count || 0),
            total_attempts: parseInt(totalAttempts.rows[0].count || 0),
            successful_logins: parseInt(successfulLogins.rows[0].count || 0),
            failed_logins: parseInt(failedLogins.rows[0].count || 0),
            logins_today: parseInt(loginsToday.rows[0].count || 0)
        };
    } catch (error) {
        console.error('Error in getStats:', error);
        throw error;
    }
}

/**
 * Save OTP request (Serverless safe)
 */
async function saveOtpRequest(email, otp, name, password, type, expiresAt) {
    try {
        await sql`
            INSERT INTO otp_requests (email, otp, name, password, type, expires_at, attempts)
            VALUES (${email}, ${otp}, ${name || ''}, ${password || ''}, ${type}, ${expiresAt}, 0)
            ON CONFLICT (email) DO UPDATE 
            SET otp = EXCLUDED.otp, 
                name = EXCLUDED.name, 
                password = EXCLUDED.password, 
                type = EXCLUDED.type, 
                expires_at = EXCLUDED.expires_at,
                attempts = 0;
        `;
    } catch (error) {
        console.error('Error in saveOtpRequest:', error);
        throw error;
    }
}

/**
 * Get OTP request
 */
async function getOtpRequest(email, type) {
    try {
        const result = await sql`
            SELECT * FROM otp_requests WHERE email = ${email} AND type = ${type}
        `;
        return result.rows[0];
    } catch (error) {
        console.error('Error in getOtpRequest:', error);
        throw error;
    }
}

/**
 * Delete OTP request
 */
async function deleteOtpRequest(email) {
    try {
        await sql`DELETE FROM otp_requests WHERE email = ${email}`;
    } catch (error) {
        console.error('Error in deleteOtpRequest:', error);
    }
}

/**
 * Increment OTP attempt counter. Returns the new attempt count.
 */
async function incrementOtpAttempts(email) {
    try {
        const result = await sql`
            UPDATE otp_requests SET attempts = attempts + 1
            WHERE email = ${email}
            RETURNING attempts;
        `;
        return result.rows[0]?.attempts || 0;
    } catch (error) {
        console.error('Error in incrementOtpAttempts:', error);
        return 0;
    }
}

/* =============================================
   CONTACT MESSAGES
   ============================================= */

async function saveContactMessage(name, email, subject, message) {
    try {
        const encryptedMessage = encryptField(message);
        const result = await sql`
            INSERT INTO contact_messages (name, email, subject, message)
            VALUES (${name}, ${email}, ${subject}, ${encryptedMessage})
            RETURNING id;
        `;
        return result.rows[0].id;
    } catch (error) {
        console.error('Error in saveContactMessage:', error);
        throw error;
    }
}

async function getContactMessages(limit = 100) {
    try {
        const result = await sql`
            SELECT * FROM contact_messages 
            ORDER BY created_at DESC 
            LIMIT ${limit};
        `;
        return result.rows.map(row => ({
            ...row,
            message: decryptField(row.message)
        }));
    } catch (error) {
        console.error('Error in getContactMessages:', error);
        throw error;
    }
}

async function markMessageRead(id) {
    try {
        await sql`
            UPDATE contact_messages 
            SET status = 'read' 
            WHERE id = ${id};
        `;
    } catch (error) {
        console.error('Error in markMessageRead:', error);
        throw error;
    }
}

/* =============================================
   ADMIN USER CONTROLS
   ============================================= */

async function banUser(email) {
    try {
        await sql`UPDATE users SET status = 'banned' WHERE email = ${email}`;
    } catch (error) {
        console.error('Error in banUser:', error);
        throw error;
    }
}

async function unbanUser(email) {
    try {
        await sql`UPDATE users SET status = 'active' WHERE email = ${email}`;
    } catch (error) {
        console.error('Error in unbanUser:', error);
        throw error;
    }
}

async function deleteUser(email) {
    try {
        await sql`DELETE FROM users WHERE email = ${email}`;
        await sql`DELETE FROM login_logs WHERE email = ${email}`;
        await sql`DELETE FROM otp_requests WHERE email = ${email}`;
        await sql`DELETE FROM user_messages WHERE recipient_email = ${email}`;
        try { await sql`DELETE FROM user_sessions WHERE user_email = ${email}`; } catch (e) {}
    } catch (error) {
        console.error('Error in deleteUser:', error);
        throw error;
    }
}

async function saveUserMessage(recipientEmail, title, message) {
    try {
        const encryptedMessage = encryptField(message);
        const result = await sql`
            INSERT INTO user_messages (recipient_email, title, message, status, created_at)
            VALUES (${recipientEmail}, ${title}, ${encryptedMessage}, 'unread', CURRENT_TIMESTAMP)
            RETURNING id;
        `;
        return result.rows[0];
    } catch (error) {
        console.error('Error in saveUserMessage:', error);
        throw error;
    }
}

async function getUserMessages(email) {
    try {
        const result = await sql`
            SELECT id, recipient_email, title, message, status, created_at 
            FROM user_messages 
            WHERE recipient_email = ${email} OR recipient_email = 'ALL' 
            ORDER BY created_at DESC LIMIT 50;
        `;
        return result.rows.map(row => ({
            ...row,
            message: decryptField(row.message)
        }));
    } catch (error) {
        console.error('Error in getUserMessages:', error);
        return [];
    }
}

async function markUserMessageRead(id) {
    try {
        await sql`UPDATE user_messages SET status = 'read' WHERE id = ${id}`;
    } catch (error) {
        console.error('Error in markUserMessageRead:', error);
        throw error;
    }
}

/**
 * Update user 2FA setting
 */
async function updateUser2FA(email, enabled, twoFactorEmail = null) {
    try {
        if (twoFactorEmail) {
            await sql`UPDATE users SET two_factor_enabled = ${enabled}, two_factor_email = ${twoFactorEmail} WHERE email = ${email}`;
        } else {
            await sql`UPDATE users SET two_factor_enabled = ${enabled} WHERE email = ${email}`;
        }
    } catch (error) {
        console.error('Error in updateUser2FA:', error);
        throw error;
    }
}

/**
 * Update user profile name
 */
async function updateUserProfile(email, name) {
    try {
        await sql`UPDATE users SET name = ${name} WHERE email = ${email}`;
    } catch (error) {
        console.error('Error in updateUserProfile:', error);
        throw error;
    }
}

/* =============================================
   HIGH-SECURITY: TOTP & SESSION MANAGEMENT
   ============================================= */

async function updateUserTOTP(email, secret, enabled) {
    try {
        const encryptedSecret = secret ? encryptField(secret) : null;
        await sql`UPDATE users SET totp_secret = ${encryptedSecret}, totp_enabled = ${enabled} WHERE email = ${email}`;
    } catch (error) {
        console.error('Error in updateUserTOTP:', error);
        throw error;
    }
}

async function getDecodedUserTOTP(email) {
    try {
        const result = await sql`SELECT totp_secret, totp_enabled FROM users WHERE email = ${email}`;
        const user = result.rows[0];
        if (!user) return null;
        return {
            totp_enabled: user.totp_enabled || false,
            totp_secret: user.totp_secret ? decryptField(user.totp_secret) : null
        };
    } catch (error) {
        console.error('Error in getDecodedUserTOTP:', error);
        return null;
    }
}

async function saveUserSession(id, email, deviceInfo, ipAddress) {
    try {
        await sql`
            INSERT INTO user_sessions (id, user_email, device_info, ip_address, last_active, created_at)
            VALUES (${id}, ${email}, ${deviceInfo || 'Desktop Browser'}, ${ipAddress || '127.0.0.1'}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET last_active = CURRENT_TIMESTAMP;
        `;
    } catch (error) {
        console.error('Error in saveUserSession:', error);
    }
}

async function getUserSessions(email) {
    try {
        const result = await sql`
            SELECT id, device_info, ip_address, last_active, created_at
            FROM user_sessions
            WHERE user_email = ${email}
            ORDER BY last_active DESC;
        `;
        return result.rows;
    } catch (error) {
        console.error('Error in getUserSessions:', error);
        return [];
    }
}

async function revokeUserSession(id, email) {
    try {
        await sql`DELETE FROM user_sessions WHERE id = ${id} AND user_email = ${email}`;
    } catch (error) {
        console.error('Error in revokeUserSession:', error);
    }
}

async function revokeOtherUserSessions(currentSessionId, email) {
    try {
        if (currentSessionId) {
            await sql`DELETE FROM user_sessions WHERE user_email = ${email} AND id != ${currentSessionId}`;
        } else {
            await sql`DELETE FROM user_sessions WHERE user_email = ${email}`;
        }
    } catch (error) {
        console.error('Error in revokeOtherUserSessions:', error);
    }
}

module.exports = {
    initDb,
    createUser,
    getUserByEmail,
    updateUserPassword,
    recordLoginSuccess,
    logLogin,
    getAllUsers,
    getLoginLogs,
    getStats,
    saveOtpRequest,
    getOtpRequest,
    deleteOtpRequest,
    incrementOtpAttempts,
    saveContactMessage,
    getContactMessages,
    markMessageRead,
    banUser,
    unbanUser,
    deleteUser,
    saveUserMessage,
    getUserMessages,
    markUserMessageRead,
    updateUser2FA,
    updateUserProfile,
    updateUserTOTP,
    getDecodedUserTOTP,
    saveUserSession,
    getUserSessions,
    revokeUserSession,
    revokeOtherUserSessions,
    deleteLoginLog
};
