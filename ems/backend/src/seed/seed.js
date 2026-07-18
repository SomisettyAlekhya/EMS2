// Reset local file DB and re-seed. (Just deletes ems.db; connecting to db.js re-seeds.)
const path = require('path');
const fs = require('fs');
const dbFile = path.join(__dirname, '..', '..', 'ems.db');
if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
require('../db'); // triggers auto-seed
console.log('Seeded demo data. Login credentials:');
console.log('  Super Admin: admin@ems.local / admin123');
console.log('  HR Manager : hr@ems.local / hr123');
console.log('  Employee   : employee@ems.local / employee123');
