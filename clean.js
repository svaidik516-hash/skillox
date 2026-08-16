require('dotenv').config();
const { sql } = require('@vercel/postgres');
async function clean() {
    await sql`DELETE FROM users WHERE email = 'none'`;
    console.log('done');
}
clean();
