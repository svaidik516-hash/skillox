require('dotenv').config();
const { initDb } = require('./database.js');
initDb().then(() => { console.log('Database altered successfully'); process.exit(0); }).catch(console.error);
