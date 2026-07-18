require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Auto-create .env with defaults if missing
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, 'PORT=5000\nJWT_SECRET=change-me-in-production\n');
  require('dotenv').config({ path: envPath });
}

const app = require('./app');
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`EMS API running on http://localhost:${PORT}`));
