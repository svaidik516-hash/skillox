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

const { initDb, createUser, getUserByEmail, updateUserPassword, recordLoginSuccess, logLogin, getAllUsers, getLoginLogs, getStats, saveOtpRequest, getOtpRequest, deleteOtpRequest, incrementOtpAttempts, saveContactMessage, getContactMessages, markMessageRead } = require('./database');

const app = express();

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
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        // SECURITY FIX: Hash password BEFORE storing in otp_requests
        const hashedPassword = await bcrypt.hash(password, 10);
        await saveOtpRequest(email, otp, name, hashedPassword, 'signup', expiresAt);

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

    if (record.otp === otp) {
        // Success — password is already hashed from signup-request
        try {
            await createUser(record.name, email, record.password);
            
            await deleteOtpRequest(email);
            await recordLoginSuccess(email);
            await logLogin(email, ip, 'success');
            
            const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '7d' });
            res.cookie('skillox_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
            
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

        // Success
        await recordLoginSuccess(email);
        await logLogin(email, ip, 'success');
        
        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('skillox_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
        
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
   SECURE PDF ENDPOINT (SUPABASE)
   ============================================= */
app.get('/api/pdf-url', async (req, res) => {
    const { file } = req.query;
    const token = req.cookies.skillox_token;

    if (!file) {
        return res.status(400).json({ error: 'File parameter is required' });
    }

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No session cookie' });
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Generate signed URL from Supabase (expires in 5 minutes)
        // Ensure file path doesn't have leading slash if we're storing it like 'textbooks/math.pdf'
        const safePath = file.startsWith('/') ? file.slice(1) : file;
        
        const { data, error } = await supabase.storage.from('skillox-pdfs').createSignedUrl(safePath, 300);
        
        if (error) {
            console.error('Supabase signed URL error:', error);
            return res.status(500).json({ error: 'Failed to generate secure link' });
        }
        
        res.json({ success: true, url: data.signedUrl });
    } catch (err) {
        console.error('PDF URL generation error:', err);
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
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
            login_count: u.login_count
        }));
        res.json({ success: true, users: safeUsers });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
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
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <hr>
                    <p><strong>Message:</strong></p>
                    <p style="white-space: pre-wrap;">${message}</p>
                </div>
            `
        });

        res.json({ success: true, message: 'Your message has been sent successfully!' });
    } catch (error) {
        console.error('Contact Form Error:', error);
        res.status(500).json({ error: 'Failed to send message. Please try again later.' });
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
