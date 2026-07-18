const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticate, requireRole('Super Admin', 'HR Manager'), (_req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS c FROM employees').get().c;
  const active = db.prepare("SELECT COUNT(*) AS c FROM employees WHERE status = 'Active'").get().c;
  const inactive = db.prepare("SELECT COUNT(*) AS c FROM employees WHERE status = 'Inactive'").get().c;
  const departments = db.prepare("SELECT COUNT(DISTINCT department) AS c FROM employees WHERE department IS NOT NULL AND department != ''").get().c;
  const perDepartment = db.prepare(`
    SELECT COALESCE(department, 'Unassigned') AS department, COUNT(*) AS count
    FROM employees GROUP BY department ORDER BY count DESC
  `).all();
  const perRole = db.prepare(`SELECT role, COUNT(*) AS count FROM employees GROUP BY role`).all();
  res.json({ total, active, inactive, departments, perDepartment, perRole });
});

module.exports = router;
