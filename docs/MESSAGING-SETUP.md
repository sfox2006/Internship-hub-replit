# Private messaging setup

Private messages use the hub's existing verified Clerk sign-in. There is no second messaging login, external identity provider, messaging-only logout, or demo access. Messaging does not change administrator roles or enrollment status.

## Readiness and activation

Messaging remains off unless `MESSAGING_ENABLED=true` and all required server-side settings are present:

- `DATABASE_URL` — the existing shared PostgreSQL database.
- `SESSION_SECRET` — the existing secret, at least 32 characters; do not replace it.
- `APP_URL` — the exact public HTTPS origin used for same-origin checks.

The existing Clerk server integration must also be able to fetch the authenticated user's current primary verified email. Do not copy Clerk keys or any secret into client variables, source files, browser storage, or committed `.env` files.

The Development database must contain `hub_users`, `hub_conversations`, `hub_messages`, and `hub_reads` before enabling the feature. `hub_sessions` is retained as a legacy table from the earlier design but is no longer used for messaging authentication. Production schema changes are applied by Replit's supported Publish flow; never run DDL against Production or add startup-time schema changes.

Keep `MESSAGING_ENABLED=false` until database readiness has been confirmed and activation is separately approved. Production must remain off until its schema and rollout have been approved.

## Identity and enrollment checks

1. The existing Clerk middleware validates the hub session. Messaging uses its server-provided stable Clerk user ID and session ID; browser-supplied IDs, headers, roles, or email are not authentication.
2. The server fetches the Clerk user and selects a currently verified email address. An absent or unverified email denies messaging.
3. The server requires the same Clerk identity to have active `joined` enrollment. Suspended, unapproved, or unverified users cannot read or send messages.
4. Messaging maps a Clerk user to `hub_users` by stable Clerk user ID. Existing mappings and conversation IDs are reused; creating a mapping does not grant a role or enrollment.

Administrators and normal members follow the same messaging identity and roster checks. Existing administrator authorization is unchanged.

## Privacy and API protections

- All messaging APIs revalidate the current Clerk identity and active enrollment. Message history and inbox requests additionally check conversation participation in both route middleware and SQL.
- Mutations require the exact configured origin and a CSRF token derived server-side from the authenticated Clerk user ID, Clerk session ID, application origin, and existing session secret.
- Private responses use `private, no-store`. Message content and messaging identity are not stored in browser local storage or IndexedDB.
- Account switch, hub sign-out, expired/revoked access, or a 401/403 clears the previous inbox and displayed messages. In-flight responses from the previous identity are ignored.
- Existing profile and other hub-local data retain their current per-account storage behavior.
- Messaging uses shared PostgreSQL and is not end-to-end encrypted; database administrators can read message text.

## Product behavior

- Two joined members share one conversation, regardless of who starts it. Other active members cannot read or send in a conversation unless they are participants.
- A suspended member is excluded from recipients and inbox results. Existing messages are retained in the database.
- Messages are limited to 4,000 characters. The latest 100 load first; earlier history uses cursor pagination. Read cursors only advance through messages in that conversation.
- The inbox refreshes every five seconds and the open conversation every three seconds. Hidden tabs pause polling. Connectivity failures remain visible and can be retried.
- Group chat, attachments, calls, and delivery/read receipts are not included.

## Verification

`npm test` exercises `installMessaging` with a server-supplied Clerk identity, verified-email and enrollment denials, same-origin/CSRF checks, stable mapping preservation, and isolated PostgreSQL fixtures. Browser tests cover two participants, an unrelated active approved third member's read/send denial, an unapproved member, hub sign-out, account switching, and delayed stale responses. Test identities are isolated fixtures only and are never used by the production server.

Before real account testing, use two joined accounts for a conversation and a third active approved account that is not a participant. Verify that the two participants can exchange messages, the third account receives denial for both read and send, and sign-out/account switching clears the previous view. Do not use demo identities or send invitations as part of code verification.
