const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/tree', authenticate, requireRole('Super Admin', 'HR Manager'), (_req, res) => {
  const rows = db.prepare(`SELECT id, employeeCode, name, email, department, designation, role, status, managerId, profileImage FROM employees`).all();
  const byId = new Map();
  rows.forEach(r => byId.set(r.id, { ...r, children: [] }));
  const roots = [];
  for (const r of byId.values()) {
    if (r.managerId && byId.has(r.managerId)) {
      byId.get(r.managerId).children.push(r);
    } else {
      roots.push(r);
    }
  }
  res.json(roots);
});

module.exports = router;
