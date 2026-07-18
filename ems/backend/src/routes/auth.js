const express = require('express');
const db = require('../db');
const { verifyPassword, signToken } = require('../utils/auth');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  const user = db.prepare('SELECT * FROM employees WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.status !== 'Active') return res.status(403).json({ error: 'Account inactive' });
  const token = signToken({ id: user.id, role: user.role });
  const { passwordHash, ...safe } = user;
  res.json({ token, user: safe });
});

router.post('/logout', authenticate, (_req, res) => {
  // Stateless JWT: client discards token. Endpoint exists for symmetry / audit hooks.
  res.json({ ok: true });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, employeeCode, name, email, phone, department, designation, salary, joiningDate, status, role, managerId, profileImage FROM employees WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
