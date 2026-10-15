# Private messaging setup

Private messages use the hub's existing verified Clerk sign-in. There is no second messaging login, external identity provider, messaging-only logout, or demo access. Messaging does not change administrator roles or enrollment status.

## Readiness and activation

Messaging remains off unless `MESSAGING_ENABLED=true` and all required server-side settings are present:

- `DATABASE_URL` — the existing shared PostgreSQL database.
- `SESSION_SECRET` — the existing secret, at least 32 characters; do not replace it.
- `APP_URL` — the exact public HTTPS origin used for same-origin checks.

The existing Clerk server integration must also be able to fetch the authenticated user's current primary verified email. Do not copy Clerk keys or any secret into client variables, source files, browser storage, or committed `.env` files.

The database must contain the direct-message tables (`hub_users`, `hub_conversations`, `hub_messages`, and `hub_reads`) and the additive group tables (`hub_group_conversations`, `hub_group_members`, `hub_group_messages`, and `hub_group_reads`) before enabling the feature. `hub_sessions` is retained as a legacy table from the earlier design but is no longer used for messaging authentication. Production schema changes are applied by Replit's supported Publish flow; never run DDL against Production or add startup-time schema changes.

`002-messaging-groups.sql` creates only new group tables and indexes. It does not alter, copy, delete, or rewrite direct conversations, messages, read markers, stable user mappings, enrollment rows, or roles. Apply migrations to Development explicitly. Do not copy Development data into Production.

Keep `MESSAGING_ENABLED=false` until database readiness has been confirmed and activation is separately approved. Production must remain off until its schema and rollout have been approved.

## Identity and enrollment checks

1. The existing Clerk middleware validates the hub session. Messaging uses its server-provided stable Clerk user ID and session ID; browser-supplied IDs, headers, roles, or email are not authentication.
2. The server fetches the Clerk user and selects a currently verified email address plus the actual first and last name. Names are required through account completion after verified sign-up; no username, email prefix, or generated fallback is used.
3. The server requires the same Clerk identity to have active `joined` enrollment. Suspended, unapproved, unverified, or incomplete accounts cannot read or send messages.
4. Messaging maps a Clerk user to `hub_users` by stable Clerk user ID. Existing mappings and direct conversation IDs are reused; creating a mapping does not grant a role or enrollment.
5. Recipient lists expose verified first/last names only—never email addresses or provider IDs. Duplicate names get a visible “member N of M” label. Email verification is read from Clerk on the server.

Administrators and normal members follow the same messaging identity and roster checks. Existing administrator authorization is unchanged.

## Privacy and API protections

- All messaging APIs revalidate the current Clerk identity and active enrollment. Message history and inbox requests additionally check conversation participation in both route middleware and SQL.
- Mutations require the exact configured origin and a CSRF token derived server-side from the authenticated Clerk user ID, Clerk session ID, application origin, and existing session secret.
- Private responses use `private, no-store`. Message content and messaging identity are not stored in browser local storage or IndexedDB.
- Account switch, hub sign-out, expired/revoked access, or a 401/403 clears the previous inbox and displayed messages. In-flight responses from the previous identity are ignored.
- First and last names sync through the verified Clerk account. Other profile fields and hub-local data retain their current per-account browser storage behavior.
- Messaging uses shared PostgreSQL and is not end-to-end encrypted; database administrators can read message text.
- Direct chats remain one-to-one and retain their existing rows and identifiers.
- A member can create a named private group with at least three total verified, active approved members. Membership is fixed at creation; there are no invitations, member changes, or email delivery.
- Group history, unread counts, read markers, and sends are checked against both group membership and current approved enrollment in the data queries. Only members receive the group name/member list and sender names.

## Product behavior

- Two joined members share one direct conversation, regardless of who starts it. Other active members cannot read or send in a conversation unless they are participants.
- A suspended member is excluded from recipients and inbox results. Existing messages are retained in the database.
- Group membership is immutable after creation. Suspending or revoking a member blocks access without deleting the group or its existing history.
- Messages are limited to 4,000 characters. The latest 100 load first; earlier history uses cursor pagination. Read cursors only advance through messages in that conversation.
- The inbox refreshes every five seconds and the open conversation every three seconds. Hidden tabs pause polling. Connectivity failures remain visible and can be retried.
- Attachments, calls, and delivery receipts are not included.

## Verification

Unit tests exercise `installMessaging` with server-supplied verified Clerk identities, profile validation, same-origin/CSRF checks, stable mapping preservation, direct-chat compatibility, group creation, member-only history/send/read, unread state, and suspended-member denial in isolated PostgreSQL fixtures. Browser tests cover profile completion/editing, named three-person groups, incoming sender labels, an unrelated active approved account's read/send/read-mark denial, unapproved members, hub sign-out, account switching, and delayed stale responses. Test identities and messages are isolated fixtures only and are never used by the production server.

Before real account testing, use two joined accounts for a conversation and a third active approved account that is not a participant. Verify that the two participants can exchange messages, the third account receives denial for both read and send, and sign-out/account switching clears the previous view. Do not use demo identities or send invitations as part of code verification.
