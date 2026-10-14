import { normalizeEnrollmentEmail, parseEnrollmentInput } from "./enrollment-import.mjs";

function publicStatus(row) {
  if (row.status === "suspended") return "suspended";
  return row.clerkUserId ? "joined" : "approved";
}

function publicRow(row) {
  return {
    id: String(row.id),
    email: row.email,
    name: row.name ?? "",
    status: publicStatus(row),
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    joinedAt: row.joinedAt ?? null,
    statusChangedAt: row.statusChangedAt,
  };
}

function fromDatabase(row) {
  if (!row) return null;
  return {
    id: row.enrollment_id,
    email: row.email_address,
    emailNormalized: row.email_normalized,
    name: row.full_name,
    status: row.status,
    clerkUserId: row.clerk_user_id,
    createdAt: row.created_at,
    createdBy: row.created_by_clerk_user_id,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by_clerk_user_id,
    joinedAt: row.joined_at,
    statusChangedAt: row.status_changed_at,
  };
}

function fixtureRow(email, status, clerkUserId = null, id = 1) {
  const now = new Date().toISOString();
  return {
    id,
    email,
    emailNormalized: normalizeEnrollmentEmail(email),
    name: "",
    status,
    clerkUserId,
    createdAt: now,
    createdBy: "user_fixture_administrator",
    updatedAt: now,
    updatedBy: "user_fixture_administrator",
    joinedAt: clerkUserId ? now : null,
    statusChangedAt: now,
  };
}

export function createFixtureEnrollmentStore() {
  return {
    rows: [
      fixtureRow(
        "joined.member@fixture.invalid",
        "approved",
        "user_fixture_normal",
        1,
      ),
      fixtureRow("already.approved@fixture.invalid", "approved", null, 2),
      fixtureRow(
        "suspended.member@fixture.invalid",
        "suspended",
        "user_fixture_suspended",
        3,
      ),
    ],
    audit: [],
    nextId: 4,
  };
}

export function createEnrollmentService({ pool, fixtureStore = null }) {
  const memory = fixtureStore;

  async function findBoundUser(userId, queryable = pool) {
    if (memory)
      return memory.rows.find((row) => row.clerkUserId === userId) ?? null;
    const result = await queryable.query(
      `SELECT * FROM app_enrollments WHERE clerk_user_id = $1 LIMIT 1`,
      [userId],
    );
    return fromDatabase(result.rows[0]);
  }

  async function findByEmail(email, queryable = pool) {
    const normalizedEmail = normalizeEnrollmentEmail(email);
    if (memory)
      return (
        memory.rows.find((row) => row.emailNormalized === normalizedEmail) ??
        null
      );
    const result = await queryable.query(
      `SELECT * FROM app_enrollments WHERE email_normalized = $1 LIMIT 1`,
      [normalizedEmail],
    );
    return fromDatabase(result.rows[0]);
  }

  async function addAudit(
    queryable,
    { enrollmentId, action, actorUserId, previousStatus = null, nextStatus = null },
  ) {
    if (memory) {
      memory.audit.push({
        enrollmentId: String(enrollmentId),
        action,
        actorUserId,
        previousStatus,
        nextStatus,
        occurredAt: new Date().toISOString(),
      });
      return;
    }
    await queryable.query(
      `INSERT INTO app_enrollment_audit
        (enrollment_id, action, actor_clerk_user_id, previous_status, next_status)
       VALUES ($1, $2, $3, $4, $5)`,
      [enrollmentId, action, actorUserId, previousStatus, nextStatus],
    );
  }

  async function getAccess(userId, verifiedEmail) {
    const bound = await findBoundUser(userId);
    if (bound)
      return {
        status: bound.status === "suspended" ? "suspended" : "joined",
      };

    const email =
      typeof verifiedEmail === "function" ? await verifiedEmail() : verifiedEmail;
    const normalizedEmail = normalizeEnrollmentEmail(email);
    if (!normalizedEmail) return { status: "email-unverified" };

    if (memory) {
      const row = await findByEmail(normalizedEmail);
      if (!row) return { status: "not-approved" };
      if (row.status === "suspended") return { status: "suspended" };
      if (row.clerkUserId && row.clerkUserId !== userId)
        return { status: "identity-conflict" };
      row.clerkUserId = userId;
      row.joinedAt ??= new Date().toISOString();
      row.updatedAt = new Date().toISOString();
      row.updatedBy = userId;
      await addAudit(null, {
        enrollmentId: row.id,
        action: "joined",
        actorUserId: userId,
        previousStatus: "approved",
        nextStatus: "joined",
      });
      return { status: "joined" };
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT * FROM app_enrollments
         WHERE email_normalized = $1
         FOR UPDATE`,
        [normalizedEmail],
      );
      const row = fromDatabase(result.rows[0]);
      if (!row) {
        await client.query("COMMIT");
        return { status: "not-approved" };
      }
      if (row.status === "suspended") {
        await client.query("COMMIT");
        return { status: "suspended" };
      }
      if (row.clerkUserId && row.clerkUserId !== userId) {
        await client.query("COMMIT");
        return { status: "identity-conflict" };
      }
      if (!row.clerkUserId) {
        const updated = await client.query(
          `UPDATE app_enrollments
           SET clerk_user_id = $2,
               joined_at = COALESCE(joined_at, NOW()),
               updated_at = NOW(),
               updated_by_clerk_user_id = $2
           WHERE enrollment_id = $1
             AND status = 'approved'
             AND clerk_user_id IS NULL
           RETURNING *`,
          [row.id, userId],
        );
      if (!updated.rowCount) {
          await client.query("ROLLBACK");
          return { status: "not-approved" };
        }
        await addAudit(client, {
          enrollmentId: row.id,
          action: "joined",
          actorUserId: userId,
          previousStatus: "approved",
          nextStatus: "joined",
        });
      }
      await client.query("COMMIT");
      return { status: "joined" };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async function preview(input, format, queryable = pool) {
    const parsed = parseEnrollmentInput(input, format);
    if (parsed.errors.length) {
      return {
        rows: [],
        errors: parsed.errors,
        counts: { new: 0, existing: 0, duplicates: 0, invalid: 0 },
      };
    }

    const emailValues = [
      ...new Set(
        parsed.rows
          .filter((row) => row.normalizedEmail && !row.error)
          .map((row) => row.normalizedEmail),
      ),
    ];
    let existingByEmail = new Map();
    if (memory) {
      existingByEmail = new Map(
        memory.rows.map((row) => [row.emailNormalized, row]),
      );
    } else if (emailValues.length) {
      const result = await queryable.query(
        `SELECT * FROM app_enrollments WHERE email_normalized = ANY($1::text[])`,
        [emailValues],
      );
      existingByEmail = new Map(
        result.rows.map((row) => {
          const enrollment = fromDatabase(row);
          return [enrollment.emailNormalized, enrollment];
        }),
      );
    }

    const rows = parsed.rows.map((row) => {
      if (row.error)
        return { ...row, classification: "invalid", message: row.error };
      if (row.duplicate)
        return {
          ...row,
          classification: "duplicate",
          message: "This address appears more than once in the import.",
        };
      const existing = existingByEmail.get(row.normalizedEmail);
      if (existing)
        return {
          ...row,
          classification: "existing",
          message: `Already on roster (${publicStatus(existing)}).`,
        };
      return {
        ...row,
        classification: "new",
        message: "Will be approved as a normal member.",
      };
    });
    const counts = {
      new: rows.filter((row) => row.classification === "new").length,
      existing: rows.filter((row) => row.classification === "existing").length,
      duplicates: rows.filter((row) => row.classification === "duplicate").length,
      invalid: rows.filter((row) => row.classification === "invalid").length,
    };
    return { rows, errors: [], counts };
  }

  async function list(query = "") {
    const search = String(query).trim().slice(0, 160);
    if (memory) {
      const needle = search.toLowerCase();
      return memory.rows
        .filter(
          (row) =>
            !needle ||
            row.emailNormalized.includes(needle) ||
            String(row.name ?? "").toLowerCase().includes(needle),
        )
        .sort((a, b) => a.emailNormalized.localeCompare(b.emailNormalized))
        .slice(0, 200)
        .map(publicRow);
    }
    const escaped = search.replace(/[\\%_]/g, "\\$&");
    const result = await pool.query(
      `SELECT * FROM app_enrollments
       WHERE $1 = ''
          OR email_normalized LIKE '%' || lower($2) || '%' ESCAPE '\\'
          OR lower(COALESCE(full_name, '')) LIKE '%' || lower($2) || '%' ESCAPE '\\'
       ORDER BY email_normalized
       LIMIT 200`,
      [search, escaped],
    );
    return result.rows.map((row) => publicRow(fromDatabase(row)));
  }

  async function approve(input, format, actorUserId) {
    if (memory) {
      const review = await preview(input, format);
      const inserted = [];
      for (const row of review.rows.filter(
        (item) => item.classification === "new",
      )) {
        const existing = memory.rows.find(
          (item) => item.emailNormalized === row.normalizedEmail,
        );
        if (existing) continue;
        const created = {
          id: memory.nextId++,
          email: row.email,
          emailNormalized: row.normalizedEmail,
          name: row.name,
          status: "approved",
          clerkUserId: null,
          createdAt: new Date().toISOString(),
          createdBy: actorUserId,
          updatedAt: new Date().toISOString(),
          updatedBy: actorUserId,
          joinedAt: null,
          statusChangedAt: new Date().toISOString(),
        };
        memory.rows.push(created);
        inserted.push(publicRow(created));
        await addAudit(null, {
          enrollmentId: created.id,
          action: "approved",
          actorUserId,
          nextStatus: "approved",
        });
      }
      return {
        approvedCount: inserted.length,
        skippedCount: review.rows.filter(
          (row) => row.classification === "existing",
        ).length,
        entries: inserted,
      };
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const review = await preview(input, format, client);
      const inserted = [];
      for (const row of review.rows.filter(
        (item) => item.classification === "new",
      )) {
        const result = await client.query(
          `INSERT INTO app_enrollments
            (email_address, email_normalized, full_name, status,
             created_by_clerk_user_id, updated_by_clerk_user_id,
             status_changed_by_clerk_user_id)
           VALUES ($1, $2, $3, 'approved', $4, $4, $4)
           ON CONFLICT (email_normalized) DO NOTHING
           RETURNING *`,
          [row.email, row.normalizedEmail, row.name || null, actorUserId],
        );
        const created = fromDatabase(result.rows[0]);
        if (!created) continue;
        await addAudit(client, {
          enrollmentId: created.id,
          action: "approved",
          actorUserId,
          nextStatus: "approved",
        });
        inserted.push(publicRow(created));
      }
      await client.query("COMMIT");
      return {
        approvedCount: inserted.length,
        skippedCount:
          review.rows.filter((row) => row.classification === "existing")
            .length +
          review.counts.new -
          inserted.length,
        entries: inserted,
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async function setStatus(id, status, actorUserId) {
    if (!["approved", "suspended"].includes(status))
      throw new Error("Unsupported enrollment status.");
    if (!/^[1-9]\d{0,17}$/.test(String(id)))
      return { found: false };

    if (memory) {
      const row = memory.rows.find((item) => String(item.id) === String(id));
      if (!row) return { found: false };
      if (row.status !== status) {
        const previousStatus = row.status;
        row.status = status;
        row.updatedAt = new Date().toISOString();
        row.updatedBy = actorUserId;
        row.statusChangedAt = row.updatedAt;
        await addAudit(null, {
          enrollmentId: row.id,
          action: status === "suspended" ? "suspended" : "reactivated",
          actorUserId,
          previousStatus,
          nextStatus: status,
        });
      }
      return { found: true, entry: publicRow(row) };
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query(
        `SELECT * FROM app_enrollments WHERE enrollment_id = $1 FOR UPDATE`,
        [id],
      );
      const existing = fromDatabase(found.rows[0]);
      if (!existing) {
        await client.query("COMMIT");
        return { found: false };
      }
      if (existing.status !== status) {
        const updated = await client.query(
          `UPDATE app_enrollments
           SET status = $2,
               updated_at = NOW(),
               updated_by_clerk_user_id = $3,
               status_changed_at = NOW(),
               status_changed_by_clerk_user_id = $3
           WHERE enrollment_id = $1
           RETURNING *`,
          [id, status, actorUserId],
        );
        await addAudit(client, {
          enrollmentId: id,
          action: status === "suspended" ? "suspended" : "reactivated",
          actorUserId,
          previousStatus: existing.status,
          nextStatus: status,
        });
        await client.query("COMMIT");
        return { found: true, entry: publicRow(fromDatabase(updated.rows[0])) };
      }
      await client.query("COMMIT");
      return { found: true, entry: publicRow(existing) };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  return { getAccess, preview, list, approve, setStatus };
}
