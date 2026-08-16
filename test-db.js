require('dotenv').config();
const { sql } = require('@vercel/postgres');
sql`SELECT email, status FROM users`.then(res => {
    console.log("Users:", res.rows);
}).catch(console.error).finally(()=>process.exit());
