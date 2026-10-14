-- Add the app-owned approved-email roster. Safe to apply more than once.
-- Replit-managed production schemas are applied through the Publish schema diff;
-- do not run this DDL against Production from the application at startup.
CREATE TABLE IF NOT EXISTS app_enrollments (
  enrollment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email_address TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'suspended')),
  clerk_user_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_clerk_user_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_clerk_user_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ,
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_changed_by_clerk_user_id TEXT NOT NULL,
  CONSTRAINT app_enrollments_email_normalized_lower
    CHECK (email_normalized = lower(btrim(email_normalized))),
  CONSTRAINT app_enrollments_email_normalized_unique
    UNIQUE (email_normalized)
);

CREATE INDEX IF NOT EXISTS app_enrollments_status_updated_idx
  ON app_enrollments (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS app_enrollment_audit (
  audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  enrollment_id BIGINT NOT NULL
    REFERENCES app_enrollments (enrollment_id) ON DELETE RESTRICT,
  action TEXT NOT NULL
    CHECK (action IN ('approved', 'joined', 'suspended', 'reactivated')),
  actor_clerk_user_id TEXT NOT NULL,
  previous_status TEXT,
  next_status TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_enrollment_audit_enrollment_time_idx
  ON app_enrollment_audit (enrollment_id, occurred_at DESC);
