// Walks manager chain to detect if assigning `proposedManagerId` to `employeeId` would create a cycle.
function wouldCreateCycle(db, employeeId, proposedManagerId) {
  if (!proposedManagerId) return false;
  if (Number(proposedManagerId) === Number(employeeId)) return true;
  let currentId = proposedManagerId;
  const seen = new Set();
  while (currentId) {
    if (seen.has(currentId)) return true;
    if (Number(currentId) === Number(employeeId)) return true;
    seen.add(currentId);
    const row = db.prepare('SELECT managerId FROM employees WHERE id = ?').get(currentId);
    if (!row) break;
    currentId = row.managerId;
  }
  return false;
}

module.exports = { wouldCreateCycle };
