const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const { initDb, createUser, getUserByEmail, updateUserPassword, recordLoginSuccess, logLogin, getAllUsers, getLoginLogs, getStats, saveOtpRequest, getOtpRequest, deleteOtpRequest } = require('./database');

const app = express();

// Initialize Vercel Postgres tables (safe to call multiple times)
initDb();

// CORS — allow Vercel frontend + local development
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowed = [
            /^https?:\/\/localhost(:\d+)?$/,
            /\.vercel\.app$/,
            /\.ngrok-free\.app$/,
            /\.ngrok\.io$/
        ];
        if (allowed.some(pattern => pattern.test(origin))) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true
}));

app.use(express.json());
// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Health check — verify the backend is reachable
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        server: 'Skillox Backend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

const PORT = process.env.PORT || 3000;

// Helper to get client IP
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.socket?.remoteAddress
        || 'unknown';
}

// Removed in-memory otpStore to support Serverless environments

// Helper to create Nodemailer transport
async function createTransporter() {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false, 
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    } else {
        const testAccount = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
    }
}

// Endpoint to Request Signup (Sends OTP)
app.post('/api/signup-request', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    try {
        // Check if user already exists
        const existing = await getUserByEmail(email);
        if (existing) {
            return res.status(400).json({ error: 'An account with this email already exists' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        await saveOtpRequest(email, otp, name, password, 'signup', expiresAt);

        const transporter = await createTransporter();
        const info = await transporter.sendMail({
            from: '"Skillox Accounts" <noreply@skillox.com>',
            to: email,
            subject: 'Your Skillox Signup Verification Code',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fff7ed; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h2 style="margin: 12px 0 0; color: #1e1e1e; font-size: 22px;">Skillox</h2>
                    </div>
                    <div style="background: white; border-radius: 12px; padding: 28px; text-align: center; border: 1px solid rgba(0,0,0,0.06);">
                        <p style="color: #6b7280; margin: 0 0 20px; font-size: 15px;">Your signup verification code is:</p>
                        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #e8740c; margin: 16px 0; font-family: monospace;">${otp}</div>
                        <p style="color: #9ca3af; margin: 20px 0 0; font-size: 13px;">This code will expire in 5 minutes.</p>
                    </div>
                </div>
            `
        });

        console.log(`📧 Signup OTP sent to ${email}`);
        res.json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
        console.error('Signup Request error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// Endpoint to Verify Signup (Creates Account)
app.post('/api/signup-verify', async (req, res) => {
    const { email, otp } = req.body;
    const ip = getClientIP(req);

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const record = await getOtpRequest(email, 'signup');

    if (!record) {
        return res.status(400).json({ error: 'No signup request found for this email or it has expired' });
    }

    if (Date.now() > Number(record.expires_at)) {
        await deleteOtpRequest(email);
        return res.status(400).json({ error: 'OTP has expired' });
    }

    if (record.otp === otp) {
        // Success
        try {
            const hash = await bcrypt.hash(record.password, 10);
            await createUser(record.name, email, hash);
            
            await deleteOtpRequest(email);
            await recordLoginSuccess(email);
            await logLogin(email, ip, 'success');
            
            res.json({ success: true, message: 'Account created successfully' });
        } catch (error) {
            console.error('Signup Verify error:', error);
            res.status(500).json({ error: 'Failed to create account in database' });
        }
    } else {
        return res.status(400).json({ error: 'Invalid OTP' });
    }
});

// Endpoint to Request Forgot Password OTP
app.post('/api/forgot-password-request', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const user = await getUserByEmail(email);
        if (!user) {
            // For security, don't reveal if user exists or not
            return res.json({ success: true, message: 'If that email is registered, an OTP was sent.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
        await saveOtpRequest(email, otp, null, null, 'reset', expiresAt);

        const transporter = await createTransporter();
        const info = await transporter.sendMail({
            from: '"Skillox Accounts" <noreply@skillox.com>',
            to: email,
            subject: 'Skillox Password Reset',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fff7ed; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h2 style="margin: 12px 0 0; color: #1e1e1e; font-size: 22px;">Skillox</h2>
                    </div>
                    <div style="background: white; border-radius: 12px; padding: 28px; text-align: center; border: 1px solid rgba(0,0,0,0.06);">
                        <p style="color: #6b7280; margin: 0 0 20px; font-size: 15px;">Your password reset code is:</p>
                        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #e8740c; margin: 16px 0; font-family: monospace;">${otp}</div>
                        <p style="color: #9ca3af; margin: 20px 0 0; font-size: 13px;">This code will expire in 10 minutes.</p>
                    </div>
                </div>
            `
        });

        console.log(`📧 Password reset OTP sent to ${email}`);
        res.json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
        console.error('Forgot Password Request error:', error);
        res.status(500).json({ error: 'Failed to send reset email' });
    }
});

// Endpoint to Reset Password
app.post('/api/forgot-password-reset', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const record = await getOtpRequest(email, 'reset');

    if (!record) {
        return res.status(400).json({ error: 'No reset request found or it has expired' });
    }

    if (Date.now() > Number(record.expires_at)) {
        await deleteOtpRequest(email);
        return res.status(400).json({ error: 'OTP has expired' });
    }

    if (record.otp === otp) {
        try {
            const hash = await bcrypt.hash(newPassword, 10);
            await updateUserPassword(email, hash);
            await deleteOtpRequest(email);
            res.json({ success: true, message: 'Password reset successfully' });
        } catch (error) {
            console.error('Password Reset error:', error);
            res.status(500).json({ error: 'Failed to update password' });
        }
    } else {
        return res.status(400).json({ error: 'Invalid OTP' });
    }
});

// Endpoint to Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const ip = getClientIP(req);

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await getUserByEmail(email);
        
        if (!user) {
            await logLogin(email, ip, 'failed');
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            await logLogin(email, ip, 'failed');
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Success
        await recordLoginSuccess(email);
        await logLogin(email, ip, 'success');
        
        res.json({ 
            success: true, 
            message: 'Logged in successfully',
            user: { name: user.name, email: user.email }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'An error occurred during login' });
    }
});

/* =============================================
   ADMIN API ENDPOINTS
   ============================================= */

// Admin Authentication Middleware
function verifyAdmin(req, res, next) {
    const provided = req.headers['x-admin-password'];
    const expected = process.env.ADMIN_PASSWORD;
    
    if (!expected) {
        return res.status(500).json({ error: 'ADMIN_PASSWORD not configured on server' });
    }
    if (provided !== expected) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
    }
    next();
}

// Get all registered users
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        const users = await getAllUsers();
        // Remove password hashes from response
        const safeUsers = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            created_at: u.created_at,
            last_login: u.last_login,
            login_count: u.login_count
        }));
        res.json({ success: true, users: safeUsers });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get login logs
app.get('/api/admin/logs', verifyAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 200;
        const logs = await getLoginLogs(limit);
        res.json({ success: true, logs });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// Get summary stats
app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
    try {
        const stats = await getStats();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Only listen on a port if we are NOT running in a Vercel Serverless environment
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export the Express API for Vercel
module.exports = app;
