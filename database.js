/* =============================================
   SKILLOX — Vercel Postgres Database Module
   ============================================= */

const { sql } = require('@vercel/postgres');

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
                login_count INTEGER DEFAULT 1
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS otp_requests (
                email VARCHAR(255) PRIMARY KEY,
                otp VARCHAR(10) NOT NULL,
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

        // Handle migration if table existed before without name/password_hash columns
        try { await sql`ALTER TABLE users ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'User'`; } catch (e) {}
        try { await sql`ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT 'none'`; } catch (e) {}
        // Migration: Add attempts column to otp_requests
        try { await sql`ALTER TABLE otp_requests ADD COLUMN attempts INTEGER DEFAULT 0`; } catch (e) {}

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
            INSERT INTO users (name, email, password_hash, created_at, last_login, login_count)
            VALUES (${name}, ${email}, ${passwordHash}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
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
            SELECT id, name, email, created_at, last_login, login_count
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
        const result = await sql`
            INSERT INTO contact_messages (name, email, subject, message)
            VALUES (${name}, ${email}, ${subject}, ${message})
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
        return result.rows;
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
    markMessageRead
};
