const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { hashPassword } = require('../utils/auth');
const { validateEmployeePayload } = require('../utils/validate');
const { wouldCreateCycle } = require('../utils/hierarchy');

const router = express.Router();

const PUBLIC_FIELDS = `id, employeeCode, name, email, phone, department, designation, salary,
  joiningDate, status, role, managerId, profileImage, createdAt`;

// LIST: search, filter, sort, paginate
router.get('/', authenticate, requireRole('Super Admin', 'HR Manager'), (req, res) => {
  const { search = '', department = '', role = '', status = '', sortBy = 'name', order = 'asc' } = req.query;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '10', 10)));

  const where = [];
  const params = [];
  if (search) { where.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (department) { where.push('department = ?'); params.push(department); }
  if (role) { where.push('role = ?'); params.push(role); }
  if (status) { where.push('status = ?'); params.push(status); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const sortCol = ['name', 'joiningDate'].includes(sortBy) ? sortBy : 'name';
  const sortOrd = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const total = db.prepare(`SELECT COUNT(*) AS c FROM employees ${whereSql}`).get(...params).c;
  const rows = db.prepare(
    `SELECT ${PUBLIC_FIELDS} FROM employees ${whereSql} ORDER BY ${sortCol} ${sortOrd} LIMIT ? OFFSET ?`
  ).all(...params, pageSize, (page - 1) * pageSize);

  res.json({ data: rows, total, page, pageSize });
});

// GET ONE
router.get('/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  const emp = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM employees WHERE id = ?`).get(id);
  if (!emp) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'Employee' && req.user.id !== id) return res.status(403).json({ error: 'Forbidden' });
  res.json(emp);
});

// CREATE
router.post('/', authenticate, requireRole('Super Admin', 'HR Manager'), (req, res) => {
  const b = req.body || {};
  if (!b.password) return res.status(400).json({ error: 'password is required' });
  const errors = validateEmployeePayload(b);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  if (req.user.role === 'HR Manager' && b.role === 'Super Admin') {
    return res.status(403).json({ error: 'HR cannot assign Super Admin role' });
  }

  try {
    const info = db.prepare(`
      INSERT INTO employees (employeeCode, name, email, passwordHash, phone, department, designation,
        salary, joiningDate, status, role, managerId, profileImage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b.employeeCode, b.name, b.email, hashPassword(b.password),
      b.phone || null, b.department || null, b.designation || null,
      Number(b.salary) || 0, b.joiningDate || null,
      b.status || 'Active', b.role || 'Employee',
      b.managerId ? Number(b.managerId) : null, b.profileImage || null
    );
    const emp = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM employees WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(emp);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Email or Employee ID already exists' });
    res.status(500).json({ error: e.message });
  }
});

// UPDATE
router.put('/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  const target = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ error: 'Not found' });

  const b = req.body || {};
  const errors = validateEmployeePayload(b, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const isSelf = req.user.id === id;
  const role = req.user.role;

  // Employee: only self, only limited fields
  let allowed;
  if (role === 'Super Admin') {
    allowed = ['employeeCode', 'name', 'email', 'phone', 'department', 'designation', 'salary',
               'joiningDate', 'status', 'role', 'managerId', 'profileImage'];
  } else if (role === 'HR Manager') {
    if (b.role === 'Super Admin' || target.role === 'Super Admin') {
      return res.status(403).json({ error: 'HR cannot modify Super Admin or assign that role' });
    }
    allowed = ['employeeCode', 'name', 'email', 'phone', 'department', 'designation', 'salary',
               'joiningDate', 'status', 'role', 'managerId', 'profileImage'];
  } else {
    if (!isSelf) return res.status(403).json({ error: 'Employees can only edit their own profile' });
    allowed = ['phone', 'profileImage'];
  }

  if (b.managerId !== undefined && b.managerId !== null && b.managerId !== '') {
    if (wouldCreateCycle(db, id, Number(b.managerId))) {
      return res.status(400).json({ error: 'Circular reporting detected' });
    }
  }

  const updates = [];
  const params = [];
  for (const key of allowed) {
    if (b[key] !== undefined) {
      updates.push(`${key} = ?`);
      params.push(key === 'salary' ? Number(b[key]) || 0
        : key === 'managerId' ? (b[key] ? Number(b[key]) : null)
        : b[key]);
    }
  }
  if (b.password) {
    updates.push('passwordHash = ?');
    params.push(hashPassword(b.password));
  }
  if (!updates.length) return res.status(400).json({ error: 'No updatable fields' });

  params.push(id);
  try {
    db.prepare(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const emp = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM employees WHERE id = ?`).get(id);
    res.json(emp);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Email or Employee ID already exists' });
    res.status(500).json({ error: e.message });
  }
});

// SOFT DELETE
router.delete('/:id', authenticate, requireRole('Super Admin'), (req, res) => {
  const id = Number(req.params.id);
  const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(id);
  if (!emp) return res.status(404).json({ error: 'Not found' });
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prepare("UPDATE employees SET status = 'Inactive' WHERE id = ?").run(id);
  res.json({ ok: true, softDeleted: true });
});

// DIRECT REPORTS
router.get('/:id/reportees', authenticate, requireRole('Super Admin', 'HR Manager'), (req, res) => {
  const id = Number(req.params.id);
  const rows = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM employees WHERE managerId = ?`).all(id);
  res.json(rows);
});

// ASSIGN MANAGER
router.patch('/:id/manager', authenticate, requireRole('Super Admin', 'HR Manager'), (req, res) => {
  const id = Number(req.params.id);
  const managerId = req.body?.managerId ? Number(req.body.managerId) : null;
  const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  if (!emp) return res.status(404).json({ error: 'Not found' });
  if (managerId && wouldCreateCycle(db, id, managerId)) {
    return res.status(400).json({ error: 'Circular reporting detected' });
  }
  db.prepare('UPDATE employees SET managerId = ? WHERE id = ?').run(managerId, id);
  const updated = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM employees WHERE id = ?`).get(id);
  res.json(updated);
});

module.exports = router;
