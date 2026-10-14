import { describe, expect, it } from "vitest";
import {
  createEnrollmentService,
  createFixtureEnrollmentStore,
} from "../../server/enrollment-service.mjs";

describe("approved-email membership service", () => {
  it("binds only a verified roster email to one stable account ID", async () => {
    const store = createFixtureEnrollmentStore();
    const service = createEnrollmentService({ fixtureStore: store });

    expect(await service.getAccess("new-user", null)).toEqual({
      status: "email-unverified",
    });
    expect(await service.getAccess("new-user", "someone@unknown.invalid")).toEqual({
      status: "not-approved",
    });
    expect(
      await service.getAccess("new-user", " already.approved@fixture.invalid "),
    ).toEqual({ status: "joined" });
    expect(
      await service.getAccess("second-user", "ALREADY.APPROVED@fixture.invalid"),
    ).toEqual({ status: "identity-conflict" });
    expect(store.rows[1].clerkUserId).toBe("new-user");
    expect(store.audit.at(-1)).toMatchObject({
      action: "joined",
      actorUserId: "new-user",
    });
  });

  it("keeps a bound ID linked if its provider email changes", async () => {
    const service = createEnrollmentService({
      fixtureStore: createFixtureEnrollmentStore(),
    });
    expect(
      await service.getAccess("user_fixture_normal", "changed@unapproved.invalid"),
    ).toEqual({ status: "joined" });
  });

  it("rechecks suspension on each access check and supports reactivation", async () => {
    const store = createFixtureEnrollmentStore();
    const service = createEnrollmentService({ fixtureStore: store });
    expect(await service.getAccess("user_fixture_suspended", "ignored@example.org"))
      .toEqual({ status: "suspended" });

    const suspended = await service.setStatus(
      "1",
      "suspended",
      "user_fixture_administrator",
    );
    expect(suspended.entry?.status).toBe("suspended");
    expect(await service.getAccess("user_fixture_normal", null)).toEqual({
      status: "suspended",
    });

    await service.setStatus("1", "approved", "user_fixture_administrator");
    expect(await service.getAccess("user_fixture_normal", null)).toEqual({
      status: "joined",
    });
    expect(store.audit.slice(-2).map((row) => row.action)).toEqual([
      "suspended",
      "reactivated",
    ]);
    expect(store.audit.at(-1)?.actorUserId).toBe("user_fixture_administrator");
  });

  it("reviews duplicates and existing rows, then explicitly approves new members", async () => {
    const store = createFixtureEnrollmentStore();
    const service = createEnrollmentService({ fixtureStore: store });
    const input =
      "email,name\nnew.member@fixture.invalid,New Member\nNEW.MEMBER@fixture.invalid,Duplicate\nalready.approved@fixture.invalid,Existing\nnot-an-email,Invalid";
    const review = await service.preview(input, "csv");
    expect(review.counts).toEqual({
      new: 1,
      existing: 1,
      duplicates: 1,
      invalid: 1,
    });

    const result = await service.approve(
      input,
      "csv",
      "user_fixture_administrator",
    );
    expect(result.approvedCount).toBe(1);
    expect(store.rows.some((row) => row.emailNormalized === "new.member@fixture.invalid"))
      .toBe(true);
    expect(store.audit.at(-1)).toMatchObject({
      action: "approved",
      actorUserId: "user_fixture_administrator",
      nextStatus: "approved",
    });
    expect((await service.preview(input, "csv")).counts.new).toBe(0);
  });

  it("uses the database enrollment ID for the approval audit record", async () => {
    const auditInserts: unknown[][] = [];
    let rollbacks = 0;
    const now = new Date("2026-10-14T00:00:00.000Z");
    const insertedRow = {
      enrollment_id: "41",
      email_address: "new.member@fixture.invalid",
      email_normalized: "new.member@fixture.invalid",
      full_name: null,
      status: "approved",
      clerk_user_id: null,
      created_at: now,
      created_by_clerk_user_id: "user_fixture_administrator",
      updated_at: now,
      updated_by_clerk_user_id: "user_fixture_administrator",
      joined_at: null,
      status_changed_at: now,
      status_changed_by_clerk_user_id: "user_fixture_administrator",
    };
    const client = {
      async query(sql: string, values: unknown[] = []) {
        if (sql.trim() === "BEGIN" || sql.trim() === "COMMIT")
          return { rows: [] };
        if (sql.includes("SELECT * FROM app_enrollments WHERE email_normalized = ANY"))
          return { rows: [] };
        if (sql.includes("INSERT INTO app_enrollments"))
          return { rows: [insertedRow] };
        if (sql.includes("INSERT INTO app_enrollment_audit")) {
          if (values[0] == null)
            throw new Error("null value in audit enrollment_id");
          auditInserts.push(values);
          return { rows: [] };
        }
        if (sql.trim() === "ROLLBACK") {
          rollbacks += 1;
          return { rows: [] };
        }
        throw new Error(`Unexpected enrollment SQL: ${sql}`);
      },
      release() {},
    };
    const service = createEnrollmentService({
      pool: { connect: async () => client },
    });

    const result = await service.approve(
      "new.member@fixture.invalid",
      "emails",
      "user_fixture_administrator",
    );

    expect(result.approvedCount).toBe(1);
    expect(result.entries[0]).toMatchObject({
      id: "41",
      email: "new.member@fixture.invalid",
      status: "approved",
    });
    expect(auditInserts).toEqual([
      ["41", "approved", "user_fixture_administrator", null, "approved"],
    ]);
    expect(rollbacks).toBe(0);
  });
});
