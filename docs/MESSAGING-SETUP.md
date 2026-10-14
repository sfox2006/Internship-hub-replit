# Private messaging setup

The hub continues to use its existing Clerk sign-in, server-verified Clerk identity, approved-email enrolment roster, and administrator authorization. Private messaging adds a second, confidential OIDC sign-in only when explicitly enabled. It does not replace Clerk, enroll users, or grant roles. A messaging identity is accepted only when its ID token has the boolean claim `email_verified: true`, its normalized email exactly matches the current server-verified Clerk email, the current Clerk user is the same one that started OIDC sign-in, and that Clerk user has active roster access.

## Current configuration and safe activation

Messaging fails closed unless `MESSAGING_ENABLED=true` and all six required settings below are non-empty:

- `APP_URL` — public HTTPS origin only, with no path.
- `DATABASE_URL` — existing server-side PostgreSQL connection.
- `SESSION_SECRET` — existing server-side session secret, at least 32 characters.
- `OIDC_ISSUER` — issuer value from the provider's OIDC discovery document.
- `OIDC_CLIENT_ID` — OAuth application client ID.
- `OIDC_CLIENT_SECRET` — confidential OAuth application secret.

The app already uses the existing database/session secret; do not replace either. Do not put any of these values in `VITE_*` variables, source files, browser storage, or committed `.env` files. Keep messaging disabled until the three OIDC settings are configured and verified. The example environment file deliberately sets `MESSAGING_ENABLED=false`.

## Clerk as the OIDC provider

Clerk's official [OAuth/SSO guide](https://clerk.com/docs/guides/configure/auth-strategies/oauth/single-sign-on) describes Clerk acting as an OAuth/OIDC provider for a client application. To set that up when you have access to the relevant Clerk dashboard:

1. Create an OAuth application for this hub in Clerk's **OAuth applications** page. Use the scopes `openid profile email`.
2. Register this exact redirect URI: `APP_URL/api/auth/callback` (for the current published origin, `https://internship-hub-replit--samfoxprojects.replit.app/api/auth/callback`).
3. Save the new OAuth application's Client ID and one-time Client Secret securely. Use the issuer identifier from its OIDC discovery document as `OIDC_ISSUER`; do not substitute an authorize, token, or user-info endpoint.
4. Add `OIDC_ISSUER`, `OIDC_CLIENT_ID`, and `OIDC_CLIENT_SECRET` through Replit Secrets for **Development**. Verify the provider's ID token exposes `email_verified` as the boolean `true`; the application rejects missing, false, or string-valued claims.
5. After reviewing the Development behavior, explicitly set `MESSAGING_ENABLED=true` in Development only. Keep Production disabled until its own configuration and rollout are separately approved.

Replit's current managed-Clerk dashboard access is gated in this workspace, and no supported agent provisioning callback can create the OAuth application or retrieve its client credentials. The three OIDC values are currently empty in Development. Do not try to work around the dashboard gate by upgrading or changing the authentication provider without the owner's decision.

## Database and sign-in flow

The schema migration adds messaging users linked to stable Clerk IDs, PostgreSQL-backed sessions, one-to-one conversations, messages, and read cursors. Apply the migration to **Development only** and verify the tables before enabling the feature. Never run a migration against Production from the application or shell; Replit's managed Production schema is applied through its supported deployment flow.

Members first sign into the hub with Clerk and must already have active approved-email roster access. From `/messages`, they then sign into the configured OIDC provider. The provider email must match the current verified Clerk email. Only active roster members can appear in the recipient selector or access messaging APIs. A messaging login never changes a user's role or roster status.

## Behaviour and boundaries

- The server validates OIDC authorization codes with PKCE, state, and nonce, requires strict boolean email verification, and regenerates the session after login. The PostgreSQL session is bound to the current Clerk user ID; switching Clerk accounts invalidates messaging access.
- Session cookies are HttpOnly, SameSite, and secure on HTTPS. Message history, private identity, and session tokens are not stored in localStorage or IndexedDB. Existing hub features retain their current storage behavior.
- Every messaging request checks the Clerk session, active roster access, messaging session, and conversation participation. Client-supplied sender IDs are ignored. Mutations require the exact application origin and a session-bound CSRF token; private responses use `no-store`.
- Two members share one conversation regardless of who starts it. Messages are limited to 4,000 characters. The latest 100 messages load initially; earlier history uses cursor pagination. Read cursors move forward only through messages in that conversation.
- Active conversation history polls every three seconds; inbox and navigation unread badges refresh every five seconds. Hidden tabs pause polling. Connection errors remain visible, failed sends retain the draft, Enter sends, and Shift+Enter adds a line break.
- This is server-stored messaging protected in transit, not end-to-end encryption. Administrators with database access can read message text. Attachments, group chat, calls, and delivery/read receipts are outside this feature.
- Signing out of messaging destroys its session but does not sign the user out of the hub. Messaging sessions expire after eight hours.

## Verification

`npm test` exercises identity/roster authorization and PostgreSQL queries against isolated PGlite fixtures. `npm run build` checks TypeScript and production bundling. The separate `tests/messaging-server.mjs` uses test-only identities and an isolated database on port 3005; it is never imported by the production server and does not substitute for a real OIDC provider test.
