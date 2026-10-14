const rolesTable = "app_user_roles";

export async function ensureNormalAccount(pool, verifiedUserId) {
  if (
    typeof verifiedUserId !== "string" ||
    !verifiedUserId ||
    verifiedUserId.trim() !== verifiedUserId
  )
    throw new TypeError("A verified provider user ID is required");

  await pool.query(
    `INSERT INTO ${rolesTable} (clerk_user_id, role) VALUES ($1, 'normal') ON CONFLICT (clerk_user_id) DO NOTHING`,
    [verifiedUserId],
  );
  const { rows } = await pool.query(
    `SELECT role FROM ${rolesTable} WHERE clerk_user_id = $1`,
    [verifiedUserId],
  );
  if (!rows[0] || !["normal", "administrator"].includes(rows[0].role))
    throw new Error("Account role record is invalid");
  return rows[0].role;
}

export async function listAdministratorIds(pool) {
  const { rows } = await pool.query(
    `SELECT clerk_user_id FROM ${rolesTable} WHERE role = 'administrator' ORDER BY clerk_user_id`,
  );
  return rows.map((row) => row.clerk_user_id);
}
