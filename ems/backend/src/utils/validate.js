function isEmail(s) { return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
function isPhone(s) { return !s || /^[+\-()\d\s]{7,20}$/.test(s); }

function validateEmployeePayload(body, { partial = false } = {}) {
  const errors = [];
  const required = ['name', 'email', 'employeeCode'];
  if (!partial) {
    for (const f of required) {
      if (!body[f] || String(body[f]).trim() === '') errors.push(`${f} is required`);
    }
  }
  if (body.email !== undefined && !isEmail(body.email)) errors.push('email is invalid');
  if (body.phone !== undefined && !isPhone(body.phone)) errors.push('phone is invalid');
  if (body.salary !== undefined && body.salary !== null && body.salary !== '') {
    const n = Number(body.salary);
    if (Number.isNaN(n) || n < 0) errors.push('salary must be a non-negative number');
  }
  if (body.status !== undefined && !['Active', 'Inactive'].includes(body.status)) {
    errors.push('status must be Active or Inactive');
  }
  if (body.role !== undefined && !['Super Admin', 'HR Manager', 'Employee'].includes(body.role)) {
    errors.push('role must be Super Admin, HR Manager, or Employee');
  }
  return errors;
}

module.exports = { validateEmployeePayload, isEmail, isPhone };
