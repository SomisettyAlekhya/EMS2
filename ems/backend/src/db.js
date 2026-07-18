// Pure-JS in-memory store with a better-sqlite3-compatible prepare().get/all/run() surface.
// Chosen for Netlify Functions compatibility (no native binaries, no filesystem).
// Persists for the lifetime of a warm Lambda; auto-seeds on cold start.
const bcrypt = require('bcryptjs');

const state = {
  employees: [],
  nextId: 1,
};

function insertEmployee(row) {
  const rec = {
    id: state.nextId++,
    employeeCode: row.employeeCode,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    phone: row.phone ?? null,
    department: row.department ?? null,
    designation: row.designation ?? null,
    salary: row.salary ?? 0,
    joiningDate: row.joiningDate ?? null,
    status: row.status ?? 'Active',
    role: row.role ?? 'Employee',
    managerId: row.managerId ?? null,
    profileImage: row.profileImage ?? null,
    createdAt: new Date().toISOString(),
  };
  // uniqueness
  if (state.employees.some(e => e.email === rec.email)) throw new Error('UNIQUE constraint failed: employees.email');
  if (state.employees.some(e => e.employeeCode === rec.employeeCode)) throw new Error('UNIQUE constraint failed: employees.employeeCode');
  state.employees.push(rec);
  return rec.id;
}

// ---- Seed on cold start ----
(function seed() {
  if (state.employees.length) return;
  const hash = (p) => bcrypt.hashSync(p, 10);
  const adminId = insertEmployee({ employeeCode:'EMP001', name:'Ava Admin', email:'admin@ems.local', passwordHash:hash('admin123'), phone:'+1-555-0100', department:'Executive', designation:'Chief Executive Officer', salary:250000, joiningDate:'2020-01-15', status:'Active', role:'Super Admin' });
  insertEmployee({ employeeCode:'EMP002', name:'Henry HR', email:'hr@ems.local', passwordHash:hash('hr123'), phone:'+1-555-0101', department:'Human Resources', designation:'HR Manager', salary:90000, joiningDate:'2021-03-10', status:'Active', role:'HR Manager', managerId:adminId });
  const engId = insertEmployee({ employeeCode:'EMP003', name:'Elena Engineer', email:'elena@ems.local', passwordHash:hash('elena123'), phone:'+1-555-0102', department:'Engineering', designation:'Engineering Manager', salary:140000, joiningDate:'2021-06-20', status:'Active', role:'Employee', managerId:adminId });
  insertEmployee({ employeeCode:'EMP004', name:'Devon Dev', email:'employee@ems.local', passwordHash:hash('employee123'), phone:'+1-555-0103', department:'Engineering', designation:'Senior Software Engineer', salary:95000, joiningDate:'2022-09-01', status:'Active', role:'Employee', managerId:engId });
  insertEmployee({ employeeCode:'EMP005', name:'Priya Product', email:'priya@ems.local', passwordHash:hash('priya123'), phone:'+1-555-0106', department:'Product', designation:'Product Manager', salary:120000, joiningDate:'2022-01-11', status:'Active', role:'Employee', managerId:adminId });
  insertEmployee({ employeeCode:'EMP006', name:'Marcus Design', email:'marcus@ems.local', passwordHash:hash('marcus123'), phone:'+1-555-0107', department:'Design', designation:'Design Lead', salary:110000, joiningDate:'2022-04-18', status:'Active', role:'Employee', managerId:adminId });
  insertEmployee({ employeeCode:'EMP007', name:'Sam Sales', email:'sam@ems.local', passwordHash:hash('sam123'), phone:'+1-555-0104', department:'Sales', designation:'Account Executive', salary:70000, joiningDate:'2023-02-15', status:'Active', role:'Employee', managerId:adminId });
  insertEmployee({ employeeCode:'EMP008', name:'Riley Retired', email:'riley@ems.local', passwordHash:hash('riley123'), phone:'+1-555-0105', department:'Sales', designation:'Sales Executive', salary:60000, joiningDate:'2019-05-05', status:'Inactive', role:'Employee', managerId:adminId });
})();

// ---- Query engine ----
// Recognises the finite set of SQL patterns used by the routes.
// Each prepare() returns { get(...params), all(...params), run(...params) }.

function like(val, pat) {
  if (val == null) return false;
  const re = new RegExp('^' + String(pat).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
  return re.test(String(val));
}

function applyWhere(sql, params) {
  // returns { rows, remainingParams }
  const m = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s*$)/i);
  if (!m) return { rows: state.employees.slice(), rest: params.slice() };
  const clause = m[1];
  const rest = params.slice();
  // Split by AND at top level (we only have simple conjunctions and one OR group)
  const parts = clause.split(/\s+AND\s+/i);
  const filters = [];
  for (const part of parts) {
    const p = part.trim();
    if (/^\(name\s+LIKE\s+\?\s+OR\s+email\s+LIKE\s+\?\)$/i.test(p)) {
      const a = rest.shift(), b = rest.shift();
      filters.push(e => like(e.name, a) || like(e.email, b));
    } else if (/^department\s*=\s*\?$/i.test(p)) {
      const v = rest.shift(); filters.push(e => e.department === v);
    } else if (/^role\s*=\s*\?$/i.test(p)) {
      const v = rest.shift(); filters.push(e => e.role === v);
    } else if (/^status\s*=\s*\?$/i.test(p)) {
      const v = rest.shift(); filters.push(e => e.status === v);
    } else if (/^status\s*=\s*'Active'$/i.test(p)) {
      filters.push(e => e.status === 'Active');
    } else if (/^status\s*=\s*'Inactive'$/i.test(p)) {
      filters.push(e => e.status === 'Inactive');
    } else if (/^id\s*=\s*\?$/i.test(p)) {
      const v = rest.shift(); filters.push(e => Number(e.id) === Number(v));
    } else if (/^email\s*=\s*\?$/i.test(p)) {
      const v = rest.shift(); filters.push(e => e.email === v);
    } else if (/^managerId\s*=\s*\?$/i.test(p)) {
      const v = rest.shift(); filters.push(e => Number(e.managerId) === Number(v));
    } else if (/^department\s+IS\s+NOT\s+NULL$/i.test(p)) {
      filters.push(e => e.department != null);
    } else if (/^department\s*!=\s*''$/i.test(p)) {
      filters.push(e => e.department !== '');
    } else {
      throw new Error('Unsupported WHERE clause fragment: ' + p);
    }
  }
  return { rows: state.employees.filter(e => filters.every(f => f(e))), rest };
}

function applyOrderLimit(sql, rows, restParams) {
  let out = rows.slice();
  const om = sql.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)/i);
  if (om) {
    const col = om[1], dir = om[2].toUpperCase() === 'DESC' ? -1 : 1;
    out.sort((a, b) => {
      const av = a[col], bv = b[col];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av > bv ? dir : av < bv ? -dir : 0;
    });
  }
  const lm = sql.match(/LIMIT\s+\?\s+OFFSET\s+\?/i);
  if (lm) {
    const limit = restParams.shift();
    const offset = restParams.shift();
    out = out.slice(offset, offset + limit);
  }
  return out;
}

function project(rows, fields) {
  if (fields === '*') return rows.map(r => ({ ...r }));
  const list = fields.split(',').map(s => s.trim()).filter(Boolean);
  return rows.map(r => {
    const o = {};
    for (const f of list) o[f] = r[f];
    return o;
  });
}

function prepare(sql) {
  const s = sql.replace(/\s+/g, ' ').trim();

  // CREATE TABLE / PRAGMA — no-op
  if (/^CREATE\s+TABLE/i.test(s) || /^PRAGMA/i.test(s)) {
    return { run: () => ({ changes: 0 }), get: () => undefined, all: () => [] };
  }

  // SELECT COUNT(*) AS c FROM employees ...
  const countMatch = s.match(/^SELECT\s+COUNT\(\*\)\s+AS\s+c\s+FROM\s+employees(.*)$/i);
  if (countMatch) {
    return {
      get: (...params) => {
        const { rows } = applyWhere(s, params);
        return { c: rows.length };
      },
    };
  }

  // SELECT COUNT(DISTINCT department) AS c FROM employees WHERE ...
  if (/^SELECT\s+COUNT\(DISTINCT\s+department\)\s+AS\s+c\s+FROM\s+employees/i.test(s)) {
    return {
      get: (...params) => {
        const { rows } = applyWhere(s, params);
        const set = new Set(rows.map(r => r.department).filter(d => d != null && d !== ''));
        return { c: set.size };
      },
    };
  }

  // SELECT department (COALESCE), COUNT(*) ... GROUP BY department
  if (/GROUP\s+BY\s+department/i.test(s)) {
    return {
      all: () => {
        const map = new Map();
        for (const e of state.employees) {
          const key = e.department || 'Unassigned';
          map.set(key, (map.get(key) || 0) + 1);
        }
        return [...map.entries()].map(([department, count]) => ({ department, count }))
          .sort((a, b) => b.count - a.count);
      },
    };
  }

  // SELECT role, COUNT(*) AS count FROM employees GROUP BY role
  if (/GROUP\s+BY\s+role/i.test(s)) {
    return {
      all: () => {
        const map = new Map();
        for (const e of state.employees) map.set(e.role, (map.get(e.role) || 0) + 1);
        return [...map.entries()].map(([role, count]) => ({ role, count }));
      },
    };
  }

  // SELECT <fields> FROM employees [WHERE ...] [ORDER BY ...] [LIMIT ? OFFSET ?]
  const selMatch = s.match(/^SELECT\s+(.+?)\s+FROM\s+employees\b(.*)$/i);
  if (selMatch) {
    const fields = selMatch[1].trim();
    return {
      all: (...params) => {
        const { rows, rest } = applyWhere(s, params);
        const ordered = applyOrderLimit(s, rows, rest);
        return project(ordered, fields);
      },
      get: (...params) => {
        const { rows, rest } = applyWhere(s, params);
        const ordered = applyOrderLimit(s, rows, rest);
        return project(ordered, fields)[0];
      },
    };
  }

  // INSERT INTO employees (col, col, ...) VALUES (?, ?, ...)
  const insMatch = s.match(/^INSERT\s+INTO\s+employees\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/i);
  if (insMatch) {
    const cols = insMatch[1].split(',').map(c => c.trim());
    return {
      run: (...params) => {
        const row = {};
        cols.forEach((c, i) => { row[c] = params[i]; });
        const id = insertEmployee(row);
        return { lastInsertRowid: id, changes: 1 };
      },
    };
  }

  // UPDATE employees SET a = ?, b = ? WHERE id = ?
  const updMatch = s.match(/^UPDATE\s+employees\s+SET\s+(.+?)\s+WHERE\s+id\s*=\s*\?$/i);
  if (updMatch) {
    const setCols = updMatch[1].split(',').map(seg => seg.trim().replace(/\s*=\s*\?$/, ''));
    return {
      run: (...params) => {
        const id = params[params.length - 1];
        const emp = state.employees.find(e => Number(e.id) === Number(id));
        if (!emp) return { changes: 0 };
        setCols.forEach((c, i) => {
          const v = params[i];
          // uniqueness re-check
          if ((c === 'email' || c === 'employeeCode') && v != null) {
            if (state.employees.some(e => e[c] === v && e.id !== emp.id)) {
              throw new Error('UNIQUE constraint failed: employees.' + c);
            }
          }
          emp[c] = v;
        });
        return { changes: 1 };
      },
    };
  }

  // UPDATE employees SET status = 'Inactive' WHERE id = ?
  if (/^UPDATE\s+employees\s+SET\s+status\s*=\s*'Inactive'\s+WHERE\s+id\s*=\s*\?$/i.test(s)) {
    return {
      run: (...params) => {
        const emp = state.employees.find(e => Number(e.id) === Number(params[0]));
        if (!emp) return { changes: 0 };
        emp.status = 'Inactive';
        return { changes: 1 };
      },
    };
  }

  throw new Error('Unsupported SQL: ' + s);
}

const db = {
  prepare,
  exec: () => {},
  pragma: () => {},
  // exposed for tests / debugging
  _state: state,
};

module.exports = db;
