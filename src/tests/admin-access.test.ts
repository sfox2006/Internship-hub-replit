import { describe, it, expect } from "vitest";
// @ts-expect-error Server JavaScript authorization helper tested directly.
import { adminDecision, configuredAdminIds, requireAdministrator } from "../../server/admin-access.mjs";

function mockRes() {
  const res: any = { locals: {}, statusCode: 0, body: undefined };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  return res;
}

async function run(
  getVerifiedUser: (req: any) => unknown,
  ids: string | undefined,
  req: any = { headers: {}, body: {} },
) {
  const res = mockRes();
  let nextCalled = false;
  await requireAdministrator(getVerifiedUser, () => ids)(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

describe("administrator authorization for verified Clerk identities", () => {
  it("rejects unauthenticated users", () => {
    expect(adminDecision(null, "owner-id").status).toBe(401);
    expect(adminDecision({}, "owner-id").allowed).toBe(false);
    expect(adminDecision({ subject: "" }, "owner-id").status).toBe(401);
    expect(adminDecision({ subject: " owner-id" }, "owner-id").status).toBe(401);
  });

  it("denies everyone when no administrator IDs are present", () => {
    expect(configuredAdminIds(undefined).size).toBe(0);
    expect(adminDecision({ subject: "owner-id" }, undefined).allowed).toBe(false);
    expect(adminDecision({ subject: "owner-id" }, " , ").status).toBe(403);
    expect(adminDecision({ subject: "owner-id" }, []).status).toBe(403);
    expect(configuredAdminIds(["owner-id", " owner-id", ""]).size).toBe(1);
  });

  it("allows only exact configured stable IDs", () => {
    const ids = "owner-id, second-id";
    expect(adminDecision({ subject: "owner-id" }, ids).allowed).toBe(true);
    expect(adminDecision({ subject: "second-id" }, ids).allowed).toBe(true);
    expect(adminDecision({ subject: "OWNER-ID" }, ids).status).toBe(403);
    expect(adminDecision({ subject: "owner" }, ids).status).toBe(403);
    expect(adminDecision({ subject: "owner-id-2" }, ids).status).toBe(403);
  });

  it("supports a database-returned set of exact verified IDs", () => {
    expect(adminDecision({ subject: "clerk_owner_id" }, ["clerk_owner_id"]).allowed).toBe(
      true,
    );
    expect(adminDecision({ subject: "clerk_other_id" }, ["clerk_owner_id"]).status).toBe(
      403,
    );
  });

  it("ignores browser-supplied roles, headers and body IDs", async () => {
    const req = {
      headers: { "x-user-id": "owner-id", "x-role": "admin" },
      body: { role: "admin", subject: "owner-id" },
    };
    const { res, nextCalled } = await run(
      () => ({ subject: "someone-else", role: "admin" }),
      "owner-id",
      req,
    );
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it("calls next and records the subject for the configured owner", async () => {
    const { res, nextCalled } = await run(() => ({ subject: "owner-id" }), "owner-id");
    expect(nextCalled).toBe(true);
    expect(res.locals.administratorSubject).toBe("owner-id");
  });

  it("fails closed when the identity adapter throws or is missing", async () => {
    const { res, nextCalled } = await run(() => {
      throw new Error("session store down: secret=abc");
    }, "owner-id");
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain("secret");
    expect(() => requireAdministrator(undefined as any)).toThrow(TypeError);
  });

  it("revokes access when the ID is removed from the allowlist", async () => {
    let ids: string | undefined = "owner-id";
    const mw = requireAdministrator(() => ({ subject: "owner-id" }), () => ids);
    let res = mockRes();
    let allowed = false;
    await mw({}, res, () => (allowed = true));
    expect(allowed).toBe(true);
    ids = "";
    res = mockRes();
    allowed = false;
    await mw({}, res, () => (allowed = true));
    expect(allowed).toBe(false);
    expect(res.statusCode).toBe(403);
  });
});
