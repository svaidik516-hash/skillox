const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { initDb, createUser, getUserByEmail, updateUserPassword, recordLoginSuccess, logLogin, getAllUsers, getLoginLogs, getStats, saveOtpRequest, getOtpRequest, deleteOtpRequest, incrementOtpAttempts, saveContactMessage, getContactMessages, markMessageRead, banUser, unbanUser, deleteUser, saveUserMessage, getUserMessages, markUserMessageRead, updateUser2FA, updateUserProfile, updateUserTOTP, getDecodedUserTOTP, saveUserSession, getUserSessions, revokeUserSession, revokeOtherUserSessions } = require('./database');

function checkTotp(code, secret) {
    try {
        return speakeasy.totp.verify({ secret: secret, encoding: 'base32', token: String(code).trim(), window: 1 });
    } catch (e) {
        console.error('TOTP verify exception:', e);
        return false;
    }
}

const app = express();

// Helper to parse readable device summary from User-Agent header
function getDeviceInfo(req) {
    const ua = req.headers['user-agent'] || 'Unknown Device';
    if (ua.includes('Windows')) return ua.includes('Chrome') ? 'Windows Desktop (Chrome)' : 'Windows Desktop Browser';
    if (ua.includes('Mac OS') && !ua.includes('iPhone')) return 'macOS Laptop (Safari / Chrome)';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Apple Device (Mobile Browser)';
    if (ua.includes('Android')) return 'Android Smartphone (Mobile Browser)';
    if (ua.includes('Linux')) return 'Linux System (Desktop Browser)';
    return 'Web Browser Device';
}

// Helper to sanitize user input for safe HTML email embedding
function sanitizeForHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Helper to mask email for safe logging (e.g., v***@gmail.com)
function maskEmail(email) {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    return local[0] + '***@' + domain;
}

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cookieParser());

// Initialize Vercel Postgres tables (safe to call multiple times)
initDb();

/* =============================================
   SECURITY MIDDLEWARE & OPTIMIZATIONS
   ============================================= */

// Enable gzip compression for better performance
app.use(compression());

// Security Headers — protect against XSS, clickjacking, MIME sniffing, etc.
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Content-Security-Policy — restricts what resources can load, mitigates XSS damage
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://*.ngrok-free.app https://*.ngrok.io blob:; worker-src 'self' blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; frame-ancestors 'none';");
    // HSTS — only on production (HTTPS)
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// CORS — allow Vercel frontend + local development (FIXED: actually reject unknown origins)
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (server-to-server, mobile apps, curl)
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
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Body parser with size limit (prevents DoS via large payloads)
app.use(express.json({ limit: '16kb' }));

// Serve static frontend files with caching for better performance
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.json') || filePath.endsWith('.html')) {
            // Do not cache JSON data and HTML files to ensure fresh content
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
            // Cache assets like images, css for 1 day
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

/* =============================================
   RATE LIMITERS
   ============================================= */

// General auth rate limiter (login)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 login attempts per 15 min per IP
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req)
});

// Strict rate limiter for OTP-sending endpoints (prevents SMTP abuse)
const otpRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 OTP requests per 15 min per IP
    message: { error: 'Too many OTP requests. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req)
});

// Rate limiter for OTP verification (prevents brute-force)
const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 OTP verify attempts per 15 min per IP
    message: { error: 'Too many verification attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req)
});

// Rate limiter for admin endpoints
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Too many admin requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req)
});

// Rate limiter for contact form
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 messages per hour per IP
    message: { error: 'You have sent too many messages. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req)
});

/* =============================================
   HELPERS
   ============================================= */

// Health check — verify the backend is reachable
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        server: 'Skillox Backend',
        timestamp: new Date().toISOString()
        // NOTE: uptime removed for security — exposes server restart patterns
    });
});

const PORT = process.env.PORT || 3000;
const MAX_OTP_ATTEMPTS = 5;

// Helper to get client IP
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.socket?.remoteAddress
        || 'unknown';
}

// Generate cryptographically secure 6-digit OTP
function generateSecureOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === 'string' && emailRegex.test(email) && email.length <= 255;
}

// Validate password strength (server-side enforcement)
function isValidPassword(password) {
    return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

// Validate name
function isValidName(name) {
    return typeof name === 'string' && name.trim().length >= 1 && name.length <= 100;
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

/* =============================================
   AUTH ENDPOINTS
   ============================================= */

// Endpoint to Request Signup (Sends OTP)
app.post('/api/signup-request', otpRequestLimiter, async (req, res) => {
    const { name, email, password } = req.body;

    // Input validation
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (!isValidName(name)) {
        return res.status(400).json({ error: 'Name must be between 1 and 100 characters' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (!isValidPassword(password)) {
        return res.status(400).json({ error: 'Password must be between 8 and 128 characters' });
    }

    try {
        // Check if user already exists
        const existing = await getUserByEmail(email);
        if (existing) {
            // SECURITY FIX: Don't reveal whether an email is registered
            // Return the same success message to prevent email enumeration
            return res.json({ success: true, message: 'If this email is available, an OTP has been sent.' });
        }

        const otp = generateSecureOTP();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        // SECURITY FIX: Hash password BEFORE storing in otp_requests
        const hashedPassword = await bcrypt.hash(password, 10);
        await saveOtpRequest(email, hashedOtp, name, hashedPassword, 'signup', expiresAt);

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

        console.log(`📧 Signup OTP sent to ${maskEmail(email)}`);
        res.json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
        console.error('Signup Request error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// Endpoint to Verify Signup (Creates Account)
app.post('/api/signup-verify', otpVerifyLimiter, async (req, res) => {
    const { email, otp } = req.body;
    const ip = getClientIP(req);

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    let record;
    try {
        record = await getOtpRequest(email, 'signup');
    } catch (err) {
        console.error('Error fetching OTP request:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }

    if (!record) {
        return res.status(400).json({ error: 'No signup request found for this email or it has expired' });
    }

    if (Date.now() > Number(record.expires_at)) {
        await deleteOtpRequest(email);
        return res.status(400).json({ error: 'OTP has expired' });
    }

    // SECURITY FIX: Check OTP attempt count before verifying
    const attempts = await incrementOtpAttempts(email);
    if (attempts > MAX_OTP_ATTEMPTS) {
        await deleteOtpRequest(email);
        return res.status(429).json({ error: 'Too many failed OTP attempts. Please request a new code.' });
    }

    if (await bcrypt.compare(otp, record.otp)) {
        // Success — password is already hashed from signup-request
        try {
            await createUser(record.name, email, record.password);
            
            await deleteOtpRequest(email);
            await recordLoginSuccess(email);
            await logLogin(email, ip, 'success');
            
            const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '7d' });
            const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
            res.cookie('skillox_token', token, { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
            
            res.json({ success: true, message: 'Account created successfully' });
        } catch (error) {
            console.error('Signup Verify error:', error);
            res.status(500).json({ error: 'Failed to create account in database' });
        }
    } else {
        return res.status(400).json({ error: `Invalid OTP. ${MAX_OTP_ATTEMPTS - attempts} attempts remaining.` });
    }
});

// Endpoint to Request Forgot Password OTP
app.post('/api/forgot-password-request', otpRequestLimiter, async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    try {
        const user = await getUserByEmail(email);
        if (!user) {
            // For security, don't reveal if user exists or not
            return res.json({ success: true, message: 'If that email is registered, an OTP was sent.' });
        }

        const otp = generateSecureOTP();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
        await saveOtpRequest(email, hashedOtp, null, null, 'reset', expiresAt);

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

        console.log(`📧 Password reset OTP sent to ${maskEmail(email)}`);
        res.json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
        console.error('Forgot Password Request error:', error);
        res.status(500).json({ error: 'Failed to send reset email' });
    }
});

// Endpoint to Reset Password
app.post('/api/forgot-password-reset', otpVerifyLimiter, async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    if (!isValidPassword(newPassword)) {
        return res.status(400).json({ error: 'Password must be between 8 and 128 characters' });
    }

    let record;
    try {
        record = await getOtpRequest(email, 'reset');
    } catch (err) {
        console.error('Error fetching reset request:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }

    if (!record) {
        return res.status(400).json({ error: 'No reset request found or it has expired' });
    }

    if (Date.now() > Number(record.expires_at)) {
        await deleteOtpRequest(email);
        return res.status(400).json({ error: 'OTP has expired' });
    }

    // SECURITY FIX: Check OTP attempt count before verifying
    const attempts = await incrementOtpAttempts(email);
    if (attempts > MAX_OTP_ATTEMPTS) {
        await deleteOtpRequest(email);
        return res.status(429).json({ error: 'Too many failed OTP attempts. Please request a new code.' });
    }

    if (await bcrypt.compare(otp, record.otp)) {
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
        return res.status(400).json({ error: `Invalid OTP. ${MAX_OTP_ATTEMPTS - attempts} attempts remaining.` });
    }
});

// Endpoint to Login
app.post('/api/login', loginLimiter, async (req, res) => {
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
        
        if (user.status === 'banned') {
            await logLogin(email, ip, 'failed');
            return res.status(403).json({ error: 'YOU ARE BANNED FOR VIOLATING THE RULES' });
        }

        // High-Security Check: Is TOTP Authenticator App enabled?
        const totpInfo = await getDecodedUserTOTP(email);
        if (totpInfo && totpInfo.totp_enabled) {
            return res.json({ success: true, requireTotp: true, email: user.email, message: 'Please enter your 6-digit Authenticator App verification code.' });
        }

        // Check if 2FA (Email OTP) is enabled on user's account
        if (user.two_factor_enabled) {
            const otp = generateSecureOTP();
            const hashedOtp = await bcrypt.hash(otp, 10);
            const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
            const targetEmail = user.two_factor_email || user.email;
            await saveOtpRequest(email, hashedOtp, targetEmail, null, '2fa', expiresAt);

            const transporter = await createTransporter();
            await transporter.sendMail({
                from: '"Skillox Security" <noreply@skillox.com>',
                to: targetEmail,
                subject: 'Your Skillox Two-Factor Authentication Code',
                html: `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fff7ed; border-radius: 16px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h2 style="margin: 12px 0 0; color: #1e1e1e; font-size: 22px;">Skillox Security</h2>
                        </div>
                        <div style="background: white; border-radius: 12px; padding: 28px; text-align: center; border: 1px solid rgba(0,0,0,0.06);">
                            <p style="color: #6b7280; margin: 0 0 20px; font-size: 15px;">Your two-factor login verification code is:</p>
                            <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #e8740c; margin: 16px 0; font-family: monospace;">${otp}</div>
                            <p style="color: #9ca3af; margin: 20px 0 0; font-size: 13px;">This code will expire in 5 minutes.</p>
                        </div>
                    </div>
                `
            });
            console.log(`📧 2FA Login OTP sent to ${maskEmail(targetEmail)}`);
            return res.json({ success: true, require2fa: true, email: user.email, targetEmail: maskEmail(targetEmail), message: `2FA verification code sent to ${maskEmail(targetEmail)}` });
        }

        // Success
        await recordLoginSuccess(email);
        await logLogin(email, ip, 'success');
        
        const sessionId = crypto.randomUUID();
        await saveUserSession(sessionId, email, getDeviceInfo(req), ip);
        const token = jwt.sign({ email: user.email, sessionId: sessionId }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
        res.cookie('skillox_token', token, { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
        
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

// Endpoint to Verify 2FA code during login
app.post('/api/login-verify-2fa', otpVerifyLimiter, async (req, res) => {
    const { email, otp } = req.body;
    const ip = getClientIP(req);

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    try {
        const record = await getOtpRequest(email, '2fa');
        if (!record) {
            return res.status(400).json({ error: 'No verification request found or code expired' });
        }

        if (Date.now() > record.expires_at) {
            await deleteOtpRequest(email);
            return res.status(400).json({ error: 'OTP has expired' });
        }

        const attempts = await incrementOtpAttempts(email);
        if (attempts > MAX_OTP_ATTEMPTS) {
            await deleteOtpRequest(email);
            await logLogin(email, ip, 'failed');
            return res.status(429).json({ error: 'Too many failed OTP attempts. Please try logging in again.' });
        }

        if (await bcrypt.compare(otp, record.otp)) {
            await deleteOtpRequest(email);
            const user = await getUserByEmail(email);
            if (!user || user.status === 'banned') {
                return res.status(403).json({ error: 'YOU ARE BANNED FOR VIOLATING THE RULES' });
            }

            await recordLoginSuccess(email);
            await logLogin(email, ip, 'success');

            const sessionId = crypto.randomUUID();
            await saveUserSession(sessionId, email, getDeviceInfo(req), ip);
            const token = jwt.sign({ email: user.email, sessionId: sessionId }, process.env.JWT_SECRET, { expiresIn: '7d' });
            const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
            res.cookie('skillox_token', token, { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

            return res.json({ success: true, message: '2FA verification successful', user: { name: user.name, email: user.email } });
        } else {
            return res.status(400).json({ error: `Invalid OTP. ${MAX_OTP_ATTEMPTS - attempts} attempts remaining.` });
        }
    } catch (error) {
        console.error('2FA verify error:', error);
        res.status(500).json({ error: 'Verification failed due to a server error' });
    }
});

// Endpoint to Verify Google Authenticator TOTP code during login
app.post('/api/login-verify-totp', otpVerifyLimiter, async (req, res) => {
    const { email, totpCode } = req.body;
    const ip = getClientIP(req);
    if (!email || !totpCode) return res.status(400).json({ error: 'Email and authenticator code are required' });

    try {
        const totpInfo = await getDecodedUserTOTP(email);
        if (!totpInfo || !totpInfo.totp_enabled || !totpInfo.totp_secret) {
            return res.status(400).json({ error: 'TOTP authentication is not enabled for this account' });
        }

        const isValid = checkTotp(totpCode, totpInfo.totp_secret);
        if (isValid) {
            const user = await getUserByEmail(email);
            await recordLoginSuccess(email);
            await logLogin(email, ip, 'success');

            const sessionId = crypto.randomUUID();
            await saveUserSession(sessionId, email, getDeviceInfo(req), ip);
            const token = jwt.sign({ email: user.email, sessionId: sessionId }, process.env.JWT_SECRET, { expiresIn: '7d' });
            const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
            res.cookie('skillox_token', token, { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
            return res.json({ success: true, message: 'Authenticator Verified Successfully', user: { name: user.name, email: user.email } });
        } else {
            return res.status(400).json({ error: 'Invalid authenticator verification code. Please try again.' });
        }
    } catch (error) {
        console.error('TOTP login verify error:', error);
        res.status(500).json({ error: 'Verification failed due to a server error' });
    }
});

/* =============================================
   PERFORMANCE CACHING & SESSION VERIFICATION
   ============================================= */

// High-speed TTL Memory Cache for user verifications (reduces database latency from ~100ms to <1ms)
const userVerificationCache = new Map();
async function getCachedUser(email) {
    const now = Date.now();
    if (userVerificationCache.has(email)) {
        const cached = userVerificationCache.get(email);
        if (now < cached.expiresAt) return cached.user;
        userVerificationCache.delete(email);
    }
    const user = await getUserByEmail(email);
    userVerificationCache.set(email, { user, expiresAt: now + 60000 }); // Cache valid for 60 seconds
    return user;
}

app.get('/api/check-auth', async (req, res) => {
    const token = req.cookies.skillox_token;
    if (!token) {
        return res.json({ loggedIn: false });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await getCachedUser(decoded.email);
        
        if (user && user.status === 'banned') {
            res.clearCookie('skillox_token');
            userVerificationCache.delete(decoded.email);
            return res.json({ loggedIn: false, banned: true });
        }
        
        return res.json({ loggedIn: true, email: decoded.email });
    } catch (err) {
        return res.json({ loggedIn: false });
    }
});

/* =============================================
   SECURE PDF & STREAMING ENDPOINTS (SUPABASE)
   ============================================= */
const fs = require('fs');

app.get('/api/pdf-url', async (req, res) => {
    const { file } = req.query;
    const token = req.cookies.skillox_token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

    if (!file) {
        return res.status(400).json({ error: 'File parameter is required' });
    }

    if (!token && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Unauthorized: No session cookie' });
    }

    try {
        if (token && process.env.JWT_SECRET) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await getCachedUser(decoded.email);
                if (user && user.status === 'banned') {
                    res.clearCookie('skillox_token');
                    userVerificationCache.delete(decoded.email);
                    return res.status(403).json({ error: 'YOU ARE BANNED FOR VIOLATING THE RULES' });
                }
            } catch (jwtErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
                }
            }
        }

        // SECURITY FIX: Block path traversal attacks
        const safePath = file.startsWith('/') ? file.slice(1) : file;
        if (safePath.includes('..') || safePath.includes('\\') || safePath.startsWith('/')) {
            return res.status(400).json({ error: 'Invalid file path' });
        }

        let signedUrl = null;
        try {
            const { data, error } = await supabase.storage.from('Skillox').createSignedUrl(safePath, 3600);
            if (!error && data) {
                signedUrl = data.signedUrl;
            }
        } catch (storageErr) {
            console.warn('Supabase createSignedUrl notice:', storageErr.message);
        }

        // Backend proxy streaming URL (bypasses browser CORS & Range header blocks)
        const streamUrl = `/api/pdf-stream?file=${encodeURIComponent(safePath)}`;

        res.json({ 
            success: true, 
            url: streamUrl, 
            fallbackUrl: signedUrl,
            signedUrl: signedUrl 
        });
    } catch (err) {
        console.error('PDF URL generation error:', err);
        return res.status(500).json({ error: 'Failed to generate PDF URL' });
    }
});

app.get('/api/pdf-stream', async (req, res) => {
    const { file } = req.query;
    const token = req.cookies.skillox_token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

    if (!file) {
        return res.status(400).send('File parameter is required');
    }

    try {
        if (token && process.env.JWT_SECRET) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await getCachedUser(decoded.email);
                if (user && user.status === 'banned') {
                    return res.status(403).send('Banned account');
                }
            } catch (jwtErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).send('Session expired');
                }
            }
        }

        const safePath = file.startsWith('/') ? file.slice(1) : file;
        if (safePath.includes('..') || safePath.includes('\\') || safePath.startsWith('/')) {
            return res.status(400).send('Invalid file path');
        }

        // 1. Attempt server-side streaming from Supabase Storage (immune to browser CORS & Range restrictions)
        try {
            const { data, error } = await supabase.storage.from('Skillox').createSignedUrl(safePath, 300);
            if (!error && data && data.signedUrl) {
                const response = await fetch(data.signedUrl);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Length', buffer.length);
                    res.setHeader('Accept-Ranges', 'bytes');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    return res.send(buffer);
                }
            }
        } catch (supabaseErr) {
            console.warn('Supabase storage download notice:', supabaseErr.message);
        }

        // 2. Fallback to local filesystem (for local dev, offline storage, or backup)
        const localPath = path.join(__dirname, 'pdfs', safePath);
        if (fs.existsSync(localPath)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return fs.createReadStream(localPath).pipe(res);
        }

        const altLocalPath = path.join(__dirname, safePath);
        if (fs.existsSync(altLocalPath)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return fs.createReadStream(altLocalPath).pipe(res);
        }

        res.status(404).json({ error: 'PDF study material could not be loaded from servers.' });
    } catch (err) {
        console.error('PDF Stream error:', err);
        res.status(500).send('Internal Server Error while streaming PDF');
    }
});

/* =============================================
   USER MAILBOX ENDPOINTS
   ============================================= */
app.get('/api/user/messages', async (req, res) => {
    const token = req.cookies.skillox_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const messages = await getUserMessages(decoded.email);
        res.json({ success: true, messages });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid session' });
    }
});

app.post('/api/user/messages/:id/read', async (req, res) => {
    const token = req.cookies.skillox_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        jwt.verify(token, process.env.JWT_SECRET);
        await markUserMessageRead(req.params.id);
        res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to update message' });
    }
});

/* =============================================
   USER SETTINGS ENDPOINTS
   ============================================= */
app.get('/api/user/settings', async (req, res) => {
    const token = req.cookies.skillox_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await getUserByEmail(decoded.email);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({
            success: true,
            user: {
                name: user.name,
                email: user.email,
                twoFactorEnabled: !!user.two_factor_enabled,
                twoFactorEmail: user.two_factor_email || user.email
            }
        });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid session' });
    }
});

app.post('/api/user/settings/2fa', async (req, res) => {
    const token = req.cookies.skillox_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { enabled, password } = req.body;

        // SECURITY FIX: Require password re-authentication to disable 2FA
        if (!enabled) {
            if (!password) {
                return res.status(400).json({ error: 'Password is required to disable 2FA' });
            }
            const user = await getUserByEmail(decoded.email);
            if (!user) return res.status(404).json({ error: 'User not found' });
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return res.status(403).json({ error: 'Incorrect password. 2FA was NOT disabled.' });
            }
            await updateUser2FA(decoded.email, false);
            await updateUserTOTP(decoded.email, null, false);
            userVerificationCache.delete(decoded.email);
            return res.json({ success: true, enabled: false });
        }

        // Enabling 2FA is handled by the /api/2fa/verify flow, but allow the toggle state to be set
        res.json({ success: true, enabled: !!enabled });
    } catch (err) {
        console.error('Error updating 2FA setting:', err);
        return res.status(500).json({ error: 'Failed to update 2FA setting' });
    }
});

// Dedicated endpoints for Profile 2FA verification and setup
app.post('/api/2fa/request-code', otpRequestLimiter, async (req, res) => {
    const token = req.cookies.skillox_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const email = decoded.email;
        const user = await getUserByEmail(email);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // User can provide any custom email address to receive their 2FA OTP codes on!
        const targetEmail = req.body.target_email || user.two_factor_email || user.email;
        if (!targetEmail || !targetEmail.includes('@')) {
            return res.status(400).json({ error: 'A valid email address is required' });
        }

        const otp = generateSecureOTP();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const expiresAt = Date.now() + 5 * 60 * 1000;
        await saveOtpRequest(email, hashedOtp, targetEmail, null, 'profile_2fa', expiresAt);

        const transporter = await createTransporter();
        await transporter.sendMail({
            from: '"Skillox Security" <noreply@skillox.com>',
            to: targetEmail,
            subject: 'Your Skillox Two-Factor Activation OTP',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fff7ed; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h2 style="margin: 12px 0 0; color: #1e1e1e; font-size: 22px;">Skillox Security</h2>
                    </div>
                    <div style="background: white; border-radius: 12px; padding: 28px; text-align: center; border: 1px solid rgba(0,0,0,0.06);">
                        <p style="color: #6b7280; margin: 0 0 20px; font-size: 15px;">To verify and activate Two-Factor Authentication on your account, enter the following code:</p>
                        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #e8740c; margin: 16px 0; font-family: monospace;">${otp}</div>
                        <p style="color: #9ca3af; margin: 20px 0 0; font-size: 13px;">This verification code expires in 5 minutes.</p>
                    </div>
                </div>
            `
        });
        console.log(`📧 2FA Setup OTP sent to ${maskEmail(targetEmail)}`);
        // SECURITY FIX: Mask email in API response to prevent leaking full 2FA target email
        res.json({ success: true, message: `OTP sent successfully to ${maskEmail(targetEmail)}`, email: maskEmail(targetEmail) });
    } catch (error) {
        console.error('2FA request error:', error);
        res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
    }
});

app.post('/api/2fa/verify', otpVerifyLimiter, async (req, res) => {
    const token = req.cookies.skillox_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: 'Verification code is required' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const email = decoded.email;

        const record = await getOtpRequest(email, 'profile_2fa');
        if (!record) {
            return res.status(400).json({ error: 'No verification request found or code has expired' });
        }
        if (Date.now() > record.expires_at) {
            await deleteOtpRequest(email);
            return res.status(400).json({ error: 'Verification code has expired' });
        }

        const attempts = await incrementOtpAttempts(email);
        if (attempts > MAX_OTP_ATTEMPTS) {
            await deleteOtpRequest(email);
            return res.status(429).json({ error: 'Too many failed attempts. Please request a new code.' });
        }

        if (await bcrypt.compare(otp, record.otp)) {
            const verifiedTargetEmail = record.name;
            await deleteOtpRequest(email);
            await updateUser2FA(email, true, verifiedTargetEmail);
            userVerificationCache.delete(email);
            return res.json({ success: true, message: '2FA successfully verified and activated!', twoFactorEmail: verifiedTargetEmail });
        } else {
            return res.status(400).json({ error: `Invalid verification code. ${MAX_OTP_ATTEMPTS - attempts} attempts remaining.` });
        }
    } catch (error) {
        console.error('2FA verify error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

/* =============================================
   HIGH-SECURITY: TOTP AUTHENTICATOR SETUP
   ============================================= */
app.post('/api/2fa/totp/generate', async (req, res) => {
    const token = req.cookies.skillox_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const secretData = speakeasy.generateSecret({ name: 'Skillox Security (' + decoded.email + ')' });
        const secret = secretData.base32;
        const otpauth = secretData.otpauth_url;
        const qrCodeDataUrl = await qrcode.toDataURL(otpauth, { margin: 1, color: { dark: '#e8740c', light: '#ffffff' } });
        
        // Save unenabled secret in DB temporarily
        await updateUserTOTP(decoded.email, secret, false);
        res.json({ success: true, secret: secret, qrCode: qrCodeDataUrl });
    } catch (error) {
        console.error('TOTP generation error:', error);
        res.status(500).json({ error: 'Failed to generate authenticator keys' });
    }
});

app.post('/api/2fa/totp/verify', otpVerifyLimiter, async (req, res) => {
    const token = req.cookies.skillox_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Authenticator verification code is required' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const totpInfo = await getDecodedUserTOTP(decoded.email);
        if (!totpInfo || !totpInfo.totp_secret) {
            return res.status(400).json({ error: 'Please generate a QR code first' });
        }
        const isValid = checkTotp(code, totpInfo.totp_secret);
        if (isValid) {
            await updateUserTOTP(decoded.email, totpInfo.totp_secret, true);
            // If TOTP enabled, disable pure email OTP to avoid conflict
            await updateUser2FA(decoded.email, false);
            userVerificationCache.delete(decoded.email);
            res.json({ success: true, message: 'Google Authenticator app successfully verified and activated!' });
        } else {
            res.status(400).json({ error: 'Incorrect 6-digit code. Please verify time synchronization and try again.' });
        }
    } catch (error) {
        console.error('TOTP verification error:', error);
        res.status(500).json({ error: 'Failed to verify authenticator code' });
    }
});

/* =============================================
   HIGH-SECURITY: ACTIVE SESSION MANAGEMENT
   ============================================= */
app.get('/api/user/sessions', async (req, res) => {
    const token = req.cookies.skillox_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sessions = await getUserSessions(decoded.email);
        res.json({ success: true, currentSessionId: decoded.sessionId || '', sessions: sessions });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to retrieve active sessions' });
    }
});

app.post('/api/user/sessions/:id/revoke', async (req, res) => {
    const token = req.cookies.skillox_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sessionId = req.params.id;
        await revokeUserSession(sessionId, decoded.email);
        if (decoded.sessionId === sessionId) {
            res.clearCookie('skillox_token');
            return res.json({ success: true, revokedSelf: true });
        }
        res.json({ success: true, message: 'Device session revoked successfully' });
    } catch (error) {
        console.error('Error revoking session:', error);
        res.status(500).json({ error: 'Failed to revoke device session' });
    }
});

app.post('/api/user/sessions/revoke-others', async (req, res) => {
    const token = req.cookies.skillox_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await revokeOtherUserSessions(decoded.sessionId || '', decoded.email);
        res.json({ success: true, message: 'All other active device sessions terminated immediately' });
    } catch (error) {
        console.error('Error revoking other sessions:', error);
        res.status(500).json({ error: 'Failed to revoke other sessions' });
    }
});

app.post('/api/user/profile', async (req, res) => {
    const token = req.cookies.skillox_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name cannot be empty' });
        }
        // SECURITY FIX: Enforce name length limit
        if (!isValidName(name.trim())) {
            return res.status(400).json({ error: 'Name must be between 1 and 100 characters' });
        }
        await updateUserProfile(decoded.email, name.trim());
        userVerificationCache.delete(decoded.email); // Invalidate cache
        res.json({ success: true, name: name.trim() });
    } catch (err) {
        console.error('Error updating profile:', err);
        return res.status(500).json({ error: 'Failed to update profile details' });
    }
});

/* =============================================
   ADMIN API ENDPOINTS
   ============================================= */

// Admin Authentication Middleware — uses constant-time comparison
function verifyAdmin(req, res, next) {
    const provided = req.headers['x-admin-password'];
    const expected = process.env.ADMIN_PASSWORD;
    
    if (!expected) {
        return res.status(500).json({ error: 'ADMIN_PASSWORD not configured on server' });
    }
    if (!provided) {
        return res.status(401).json({ error: 'Unauthorized: Admin password required' });
    }

    // SECURITY FIX: Use constant-time comparison to prevent timing attacks
    const providedBuf = Buffer.from(String(provided));
    const expectedBuf = Buffer.from(String(expected));

    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
    }
    next();
}

// Get all registered users
app.get('/api/admin/users', adminLimiter, verifyAdmin, async (req, res) => {
    try {
        const users = await getAllUsers();
        // Remove password hashes from response
        const safeUsers = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            created_at: u.created_at,
            last_login: u.last_login,
            login_count: u.login_count,
            status: u.status
        }));
        res.json({ success: true, users: safeUsers });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Admin User Controls
app.post('/api/admin/users/:email/ban', adminLimiter, verifyAdmin, async (req, res) => {
    try {
        await banUser(req.params.email);
        res.json({ success: true, message: 'User banned' });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).json({ error: 'Failed to ban user' });
    }
});

app.post('/api/admin/users/:email/unban', adminLimiter, verifyAdmin, async (req, res) => {
    try {
        await unbanUser(req.params.email);
        res.json({ success: true, message: 'User unbanned' });
    } catch (error) {
        console.error('Error unbanning user:', error);
        res.status(500).json({ error: 'Failed to unban user' });
    }
});

app.delete('/api/admin/users/:email', adminLimiter, verifyAdmin, async (req, res) => {
    try {
        await deleteUser(req.params.email);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get login logs
app.get('/api/admin/logs', adminLimiter, verifyAdmin, async (req, res) => {
    try {
        // SECURITY FIX: Cap the limit to prevent database abuse
        const limit = Math.min(parseInt(req.query.limit) || 200, 500);
        const logs = await getLoginLogs(limit);
        res.json({ success: true, logs });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// Get summary stats
app.get('/api/admin/stats', adminLimiter, verifyAdmin, async (req, res) => {
    try {
        const stats = await getStats();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get contact messages
app.get('/api/admin/messages', adminLimiter, verifyAdmin, async (req, res) => {
    try {
        const messages = await getContactMessages(100);
        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Mark message as read
app.post('/api/admin/messages/:id/read', adminLimiter, verifyAdmin, async (req, res) => {
    try {
        await markMessageRead(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
});

// Admin Send User Message (or Broadcast)
app.post('/api/admin/messages/send', adminLimiter, verifyAdmin, async (req, res) => {
    const { recipient_email, title, message } = req.body;
    if (!recipient_email || !title || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    // SECURITY FIX: Enforce length limits on admin messages
    if (title.length > 200) {
        return res.status(400).json({ error: 'Title must be 200 characters or less' });
    }
    if (message.length > 5000) {
        return res.status(400).json({ error: 'Message must be 5000 characters or less' });
    }
    try {
        await saveUserMessage(recipient_email, title, message);
        res.json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

/* =============================================
   CONTACT ENDPOINT
   ============================================= */
app.post('/api/contact', contactLimiter, async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // SECURITY FIX: Enforce field-level length limits to prevent database bloat
    if (name.length > 100) {
        return res.status(400).json({ error: 'Name must be 100 characters or less' });
    }
    if (subject.length > 200) {
        return res.status(400).json({ error: 'Subject must be 200 characters or less' });
    }
    if (message.length > 5000) {
        return res.status(400).json({ error: 'Message must be 5000 characters or less' });
    }

    try {
        // Save to DB
        await saveContactMessage(name, email, subject, message);

        // Send Email Alert
        const transporter = await createTransporter();
        const adminEmail = process.env.SMTP_USER || 'admin@skillox.com';
        
        await transporter.sendMail({
            from: '"Skillox Contact" <noreply@skillox.com>',
            to: adminEmail,
            subject: `New Contact Form Submission: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>New Message from Skillox Contact Form</h2>
                    <p><strong>Name:</strong> ${sanitizeForHtml(name)}</p>
                    <p><strong>Email:</strong> ${sanitizeForHtml(email)}</p>
                    <p><strong>Subject:</strong> ${sanitizeForHtml(subject)}</p>
                    <hr>
                    <p><strong>Message:</strong></p>
                    <p style="white-space: pre-wrap;">${sanitizeForHtml(message)}</p>
                </div>
            `
        });

        res.json({ success: true, message: 'Your message has been sent successfully!' });
    } catch (error) {
        console.error('Contact Form Error:', error);
        res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }
});

/* =============================================
   LOGOUT ENDPOINT
   ============================================= */
app.post('/api/logout', (req, res) => {
    res.clearCookie('skillox_token', {
        httpOnly: true,
        sameSite: 'strict',
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
    });
    res.json({ success: true, message: 'Logged out successfully' });
});

// Only listen on a port if we are NOT running in a Vercel Serverless environment
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export the Express API for Vercel
module.exports = app;
