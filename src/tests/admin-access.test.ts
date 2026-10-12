import { describe, it, expect } from "vitest";
// @ts-expect-error Server JavaScript authorization helper tested directly.
import {
  adminDecision,
  configuredAdminIds,
  requireAdministrator,
} from "../../server/admin-access.mjs";
describe("administrator authorization pending Replit Auth integration", () => {
  it("rejects unauthenticated users", () => {
    expect(adminDecision(null, "owner-id").status).toBe(401);
    expect(adminDecision({}, "owner-id").allowed).toBe(false);
  });
  it("fails closed when no administrator is configured", () => {
    expect(adminDecision({ subject: "owner-id" }, undefined)).toMatchObject({
      allowed: false,
      status: 503,
    });
    expect(adminDecision({ subject: "owner-id" }, " , ")).toMatchObject({
      allowed: false,
      status: 503,
    });
  });
  it("matches only exact stable subjects and ignores browser role claims", () => {
    expect(adminDecision({ subject: "owner-id" }, "owner-id")).toMatchObject({
      allowed: true,
    });
    expect(
      adminDecision(
        { subject: "other-id", role: "admin", email: "owner@example.com" },
        "owner-id",
      ),
    ).toMatchObject({ allowed: false, status: 403 });
    expect(adminDecision({ subject: "OWNER-ID" }, "owner-id").allowed).toBe(
      false,
    );
    expect(adminDecision({ subject: " owner-id" }, "owner-id").allowed).toBe(
      false,
    );
  });
  it("normalizes configured IDs without creating implicit administrators", () => {
    expect([...configuredAdminIds(" owner-id, second-id, owner-id, ")]).toEqual(
      ["owner-id", "second-id"],
    );
    expect(configuredAdminIds(null).size).toBe(0);
  });
  it("requires a server identity adapter", () => {
    expect(() => requireAdministrator(null)).toThrow();
  });
  it("middleware uses the verified identity rather than request input", async () => {
    let status = 0;
    let error = "";
    const res = {
      locals: {},
      status(n: number) {
        status = n;
        return this;
      },
      json(body: { error: string }) {
        error = body.error;
      },
    };
    let proceeded = false;
    const guard = requireAdministrator(
      async () => ({ subject: "other-id" }),
      () => "owner-id",
    );
    await guard(
      { headers: { "x-user-id": "owner-id" }, body: { role: "admin" } },
      res,
      () => (proceeded = true),
    );
    expect(status).toBe(403);
    expect(error).toBe("Administrator access required");
    expect(proceeded).toBe(false);
  });
  it("middleware errors fail closed and configuration revocation takes effect", async () => {
    let status = 0;
    const res = {
      locals: {} as Record<string, string>,
      status(n: number) {
        status = n;
        return this;
      },
      json() {},
    };
    let ids = "owner-id";
    let calls = 0;
    const guard = requireAdministrator(
      async () => ({ subject: "owner-id" }),
      () => ids,
    );
    await guard({}, res, () => calls++);
    expect(calls).toBe(1);
    expect(res.locals.administratorSubject).toBe("owner-id");
    ids = "";
    await guard({}, res, () => calls++);
    expect(status).toBe(503);
    expect(calls).toBe(1);
    await requireAdministrator(
      async () => {
        throw Error("session error");
      },
      () => "owner-id",
    )({}, res, () => calls++);
    expect(status).toBe(401);
    expect(calls).toBe(1);
  });
});
