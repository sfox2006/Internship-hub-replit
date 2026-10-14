# Approved-email enrollment operations

## Provider boundary and access rules

The supported Replit-managed Clerk setup is used for sign-in only. A read-only check found no usable managed Clerk invitation or email-allowlist operation exposed to this app in the current workspace session, so membership is controlled by an app-owned database roster rather than by changing provider settings.

The server obtains the Clerk user from the verified session, then reads its provider-side email addresses through Clerk's Backend API. It prefers the primary address only when that address is verified; otherwise it uses another verified address if present. Client profile fields, request headers, local storage, browser roles, and posted email addresses are never used to authorize membership.

Enrollment matching trims surrounding whitespace and compares case-insensitively. It does not remove dots, plus-tags, or otherwise infer aliases. On the first successful join, the roster entry is permanently bound to that Clerk user ID. The ID binding takes precedence after an email change, so a changed address cannot transfer an existing enrollment to a different account. Another account cannot claim a row already bound to someone else.

New accounts receive the `normal` role only. An approved address does not grant administrator permission. Administrators are identified only by the server-side `app_user_roles` record. Administrators can manage the roster without being enrolled as ordinary members, but member pages and APIs still require an active member enrollment.

Sign-in, sign-up, `/account`, Clerk proxy endpoints, and the small public authentication bundle remain available without enrollment. The public JavaScript entry does not include shared programme fixtures. Member page chunks, calendar routes, and other hub APIs are protected. The server rechecks enrollment on each protected request; an open browser also refreshes access status periodically. Suspended roster entries remain present and can be reactivated; there is no roster-delete action.

## Admin roster workflow

At `/admin`, an administrator can:

1. Paste email addresses or import a CSV with an `email` column and optional `name` column.
2. Review malformed addresses, case-insensitive duplicates, existing entries, and the number of new entries.
3. Explicitly approve the new valid addresses. They are approved as normal members; the app sends no mail and creates no Clerk account.
4. Search the roster and suspend or reactivate an entry.
5. Copy the published sign-up link and joining instructions.

The joining link is `https://internship-hub-replit--samfoxprojects.replit.app/sign-up`. A person must still sign up themselves, verify an email, and use an address explicitly on the roster. No real email address has been added; the Development roster is empty.

## Storage and audit

`server/migrations/001-approved-enrollments.sql` is additive and repeatable. It creates:

- `app_enrollments` for exact normalized email, optional display name, approved/suspended status, stable Clerk user ID binding, timestamps, and the creating/updating/status-changing actor IDs.
- `app_enrollment_audit` for append-only approval, first-join, suspension, and reactivation events with the acting Clerk ID and timestamp.

No migration drops or rewrites existing tables. No test email rows are inserted into either database; test enrollment records exist only in an isolated in-memory fixture store.

The migration has been applied to Development and deployed to Production through Replit Publish. Read-only verification of the live schema confirms both enrollment tables, their expected indexes and audit foreign key, with zero enrollment and audit rows. Do not run application DDL manually against Production; use the Publish schema diff for future schema changes and preserve existing role/data rows.

## Administrator bootstrap

Production currently has exactly one administrator role. The owner verified the signed-in Production account and explicitly approved its single-row promotion. A Replit username alone is not identity proof; this runbook intentionally records no provider user IDs or email addresses.

1. Sign in to the Development preview and open `/account`. Copy the **Verified Clerk user ID** shown by the server-verified `/api/me` response.
2. The owner must confirm that exact ID in chat before any role change.
3. After confirmation, a project operator can promote only that existing normal row in Development with a bound SQL parameter:

   ```sql
   UPDATE app_user_roles
   SET role = 'administrator', updated_at = now()
   WHERE clerk_user_id = $1 AND role = 'normal'
   RETURNING clerk_user_id, role;
   ```

   Bind `$1` to the exact confirmed ID and verify that exactly one row changed. Do not widen the update to an email or username.
4. The Production owner bootstrap is complete. For any future Production grant, repeat identity verification in the Production environment after schema deployment; never assume a Development Clerk ID is identical.

The app has no first-user promotion, self-service role editor, administrator email list, or client-side role authority. The SQL above remains the Development bootstrap procedure; Production changes require separate explicit approval and environment-specific identity verification.

## Browser-local account state

Profile fields, photos, attendance, RSVP, reflection progress, saved items, notes, discussions, replies, announcement dismissals, and tour state remain in localStorage/IndexedDB under an account-specific key. That data is isolated per Clerk ID in the same browser but is not stored on the server, backed up, or synchronized across devices. Only the enrollment roster/audit and role are server-side.
