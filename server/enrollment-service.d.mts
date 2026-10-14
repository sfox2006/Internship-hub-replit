export type FixtureEnrollmentRow = {
  id: number;
  email: string;
  emailNormalized: string;
  name: string;
  status: "approved" | "suspended";
  clerkUserId: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  joinedAt: string | null;
  statusChangedAt: string;
};

export type EnrollmentAuditEntry = {
  enrollmentId: string;
  action: "approved" | "joined" | "suspended" | "reactivated";
  actorUserId: string;
  previousStatus: string | null;
  nextStatus: string | null;
  occurredAt: string;
};

export type FixtureEnrollmentStore = {
  rows: FixtureEnrollmentRow[];
  audit: EnrollmentAuditEntry[];
  nextId: number;
};

export type EnrollmentService = {
  getAccess(
    userId: string,
    verifiedEmail: string | null | (() => Promise<string | null>),
  ): Promise<{ status: string }>;
  preview(
    input: string,
    format: "emails" | "csv",
    queryable?: any,
  ): Promise<{
    rows: Array<{
      line: number;
      email: string;
      name: string;
      normalizedEmail: string;
      duplicate: boolean;
      error: string;
      classification: "new" | "existing" | "duplicate" | "invalid";
      message: string;
    }>;
    errors: string[];
    counts: { new: number; existing: number; duplicates: number; invalid: number };
  }>;
  list(query?: unknown): Promise<any[]>;
  approve(
    input: string,
    format: "emails" | "csv",
    actorUserId: string,
  ): Promise<{ approvedCount: number; skippedCount: number; entries: any[] }>;
  setStatus(
    id: string,
    status: "approved" | "suspended",
    actorUserId: string,
  ): Promise<{ found: boolean; entry?: any }>;
};

export function createFixtureEnrollmentStore(): FixtureEnrollmentStore;
export function createEnrollmentService(options: {
  pool?: any;
  fixtureStore?: FixtureEnrollmentStore | null;
}): EnrollmentService;
