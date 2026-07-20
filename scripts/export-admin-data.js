const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { sql } = require('@vercel/postgres');

async function exportData() {
    console.log('Fetching data from database...');
    try {
        const exportDir = path.join(__dirname, '..', 'admin_exports');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir);
        }

        // Fetch Users
        const users = await sql`SELECT id, name, email, created_at, last_login, login_count FROM users ORDER BY last_login DESC`;
        
        let usersCsv = 'Name,Email,First Login,Last Login,Total Logins\n';
        users.rows.forEach(u => {
            usersCsv += `"${(u.name || '').replace(/"/g, '""')}","${u.email}","${u.created_at || ''}","${u.last_login || ''}",${u.login_count}\n`;
        });
        
        fs.writeFileSync(path.join(exportDir, 'admin_users.csv'), usersCsv);
        console.log('✓ Created admin_users.csv');

        // Fetch Logs
        const logs = await sql`SELECT id, email, ip_address, status, created_at FROM login_logs ORDER BY created_at DESC LIMIT 1000`;
        
        let logsCsv = 'Email,IP Address,Status,Date\n';
        logs.rows.forEach(l => {
            logsCsv += `"${l.email}","${l.ip_address}","${l.status}","${l.created_at || ''}"\n`;
        });
        
        fs.writeFileSync(path.join(exportDir, 'admin_logs.csv'), logsCsv);
        console.log('✓ Created admin_logs.csv');

        // Fetch Stats
        const totalUsers = await sql`SELECT COUNT(*) FROM users`;
        const totalAttempts = await sql`SELECT COUNT(*) FROM login_logs`;
        const successfulLogins = await sql`SELECT COUNT(*) FROM login_logs WHERE status = 'success'`;
        const failedLogins = await sql`SELECT COUNT(*) FROM login_logs WHERE status = 'failed'`;
        const loginsToday = await sql`SELECT COUNT(*) FROM login_logs WHERE DATE(created_at) = CURRENT_DATE`;

        let statsCsv = 'Metric,Value\n';
        statsCsv += `Total Users,${totalUsers.rows[0].count}\n`;
        statsCsv += `Total Login Attempts,${totalAttempts.rows[0].count}\n`;
        statsCsv += `Successful Logins,${successfulLogins.rows[0].count}\n`;
        statsCsv += `Failed Logins,${failedLogins.rows[0].count}\n`;
        statsCsv += `Logins Today,${loginsToday.rows[0].count}\n`;

        fs.writeFileSync(path.join(exportDir, 'admin_stats.csv'), statsCsv);
        console.log('✓ Created admin_stats.csv');

        console.log('\nExport completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Export failed:', error);
        process.exit(1);
    }
}

exportData();
