---
name: Messaging environment checks
description: Safe handling of messaging secrets and Development-only schema changes in this workspace.
---

Treat `viewEnvVars` results for secrets as key-existence metadata only. It does not prove that a stored value is nonempty. Never report OIDC credentials as configured based only on secret names.

**Why:** A runtime check by the owner found the Development OIDC secret entries empty, correcting an earlier inference from their presence in the secret list.

**How to apply:** If no supported non-disclosing check can confirm a runtime value, state that limitation and keep messaging disabled; do not read or print secret values.

The workspace shell reported `REPLIT_ENVIRONMENT=production` during a request to migrate the Development database. Do not run `npm run db:migrate` in that shell. Use an explicitly targeted Replit Development database operation for authorized schema work, and keep Production read-only unless the user separately requests its supported rollout.

**Why:** The environment label on the shell did not match the intended Development database target, so a shell migration could have written to Production.

**How to apply:** Before any database mutation, verify the target through the database tool's explicit environment parameter; never infer the database from the preview or workflow name.

For messaging CSRF, Production accepts only the exact origin configured in `APP_URL`. Do not derive or broaden accepted origins from request `Host` or `X-Forwarded-*` headers. If the Development preview uses a different origin, configure that origin in Development explicitly or leave messaging disabled there.

**Why:** The owner explicitly rejected using client-controlled forwarded-host data to work around a Development/Production origin mismatch.

**How to apply:** Bind the CSRF token and mutation `Origin` check to the configured environment origin. Add regression coverage proving spoofed forwarded headers cannot change that origin.
