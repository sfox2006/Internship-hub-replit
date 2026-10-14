import { describe, expect, it } from "vitest";
// @ts-expect-error The server's role-store adapter is JavaScript.
import { ensureNormalAccount, listAdministratorIds } from "../../server/account-roles.mjs";

function rolePool(initial: Record<string, string> = {}) {
  const roles = new Map(Object.entries(initial));
  const statements: Array<{ sql: string; values?: unknown[] }> = [];
  return {
    roles,
    statements,
    async query(sql: string, values?: unknown[]) {
      statements.push({ sql, values });
      if (sql.startsWith("INSERT")) {
        const id = String(values?.[0]);
        if (!roles.has(id)) roles.set(id, "normal");
        return { rows: [] };
      }
      if (sql.startsWith("SELECT role")) {
        const role = roles.get(String(values?.[0]));
        return { rows: role ? [{ role }] : [] };
      }
      if (sql.includes("WHERE role = 'administrator'")) {
        return {
          rows: [...roles]
            .filter(([, role]) => role === "administrator")
            .map(([clerk_user_id]) => ({ clerk_user_id })),
        };
      }
      throw new Error("Unexpected query");
    },
  };
}

describe("server-controlled user roles", () => {
  it("creates new verified users as normal and never takes a client role", async () => {
    const pool = rolePool();
    const role = await ensureNormalAccount(pool, "user_new_signup");
    expect(role).toBe("normal");
    expect(pool.roles.get("user_new_signup")).toBe("normal");
    expect(pool.statements[0].sql).toContain("VALUES ($1, 'normal')");
    expect(pool.statements[0].sql).toContain("DO NOTHING");
    expect(pool.statements[0].values).toEqual(["user_new_signup"]);
  });

  it("preserves an existing administrator role during normal account verification", async () => {
    const pool = rolePool({ user_existing_admin: "administrator" });
    expect(await ensureNormalAccount(pool, "user_existing_admin")).toBe(
      "administrator",
    );
    expect(pool.roles.get("user_existing_admin")).toBe("administrator");
  });

  it("rejects malformed IDs and returns only server-stored administrator IDs", async () => {
    const pool = rolePool({
      user_admin: "administrator",
      user_normal: "normal",
    });
    await expect(ensureNormalAccount(pool, " user_admin")).rejects.toThrow();
    expect(await listAdministratorIds(pool)).toEqual(["user_admin"]);
  });
});
