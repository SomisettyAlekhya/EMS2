const test = require('node:test');
const assert = require('node:assert');
const { hashPassword, verifyPassword, signToken, verifyToken } = require('./auth');

test('hashPassword produces a verifiable hash', () => {
  const h = hashPassword('secret123');
  assert.ok(h.length > 20);
  assert.strictEqual(verifyPassword('secret123', h), true);
  assert.strictEqual(verifyPassword('wrong', h), false);
});

test('signToken / verifyToken roundtrip', () => {
  const token = signToken({ id: 1, role: 'Super Admin' });
  const decoded = verifyToken(token);
  assert.strictEqual(decoded.id, 1);
  assert.strictEqual(decoded.role, 'Super Admin');
});
