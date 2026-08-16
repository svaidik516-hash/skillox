const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf-8');

// 1. Change adminLimiter to be very generous so dashboard polling doesn't trigger it
content = content.replace(
    /const adminLimiter = rateLimit\(\{[\s\S]*?max: 30,/m,
    `const adminLoginLimiter = rateLimit({\n    windowMs: 15 * 60 * 1000,\n    max: 10,\n    message: { error: 'Too many login attempts. Please try again later.' },\n    standardHeaders: true,\n    legacyHeaders: false,\n    keyGenerator: (req) => getClientIP(req)\n});\n\nconst adminLimiter = rateLimit({\n    windowMs: 15 * 60 * 1000,\n    max: 2000,`
);

// 2. Change /api/admin/login to use adminLoginLimiter
content = content.replace(
    /app\.post\('\/api\/admin\/login', adminLimiter, \(req, res\) => \{/g,
    `app.post('/api/admin/login', adminLoginLimiter, (req, res) => {`
);

// 3. Remove maxAge from cookie so it acts as a session cookie
content = content.replace(
    /sameSite: 'lax',\s*maxAge: 2 \* 60 \* 60 \* 1000 \/\/ 2 hours/g,
    `sameSite: 'lax'\n        // maxAge removed so it acts as a Session Cookie`
);

fs.writeFileSync('server.js', content);
console.log('Fixed server.js rate limit and session cookie');
