const test = require('node:test');
const assert = require('node:assert');
const Database = require('better-sqlite3');
const { wouldCreateCycle } = require('./hierarchy');

function makeDb() {
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE employees (id INTEGER PRIMARY KEY, managerId INTEGER);`);
  // 1 <- 2 <- 3  (3 reports to 2, 2 reports to 1)
  db.prepare('INSERT INTO employees (id, managerId) VALUES (1, NULL)').run();
  db.prepare('INSERT INTO employees (id, managerId) VALUES (2, 1)').run();
  db.prepare('INSERT INTO employees (id, managerId) VALUES (3, 2)').run();
  return db;
}

test('detects self-manager as cycle', () => {
  const db = makeDb();
  assert.strictEqual(wouldCreateCycle(db, 1, 1), true);
});

test('detects transitive cycle', () => {
  const db = makeDb();
  // Trying to make 1's manager = 3 would form 1 -> 3 -> 2 -> 1
  assert.strictEqual(wouldCreateCycle(db, 1, 3), true);
});

test('allows valid assignment', () => {
  const db = makeDb();
  // 3 can report to 1 without cycle
  assert.strictEqual(wouldCreateCycle(db, 3, 1), false);
});
