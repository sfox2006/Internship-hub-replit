# Private messaging setup

The original hub has **no real authentication or shared database**: Enter demo is a browser flag, and the owner authorization adapter is not an authentication service. Messaging adds a separate, server-authenticated account boundary. Existing demo records and features are preserved.

## Configure before enabling

1. Provision a shared PostgreSQL database (PostgreSQL 14+ recommended). Use its verified TLS connection settings and a database account limited to the hub's database. Set `DATABASE_URL` in your server's secret manager; never use a `VITE_*` setting.
2. Register a confidential web application with an HTTPS OpenID Connect provider that includes boolean `email_verified: true` in its ID tokens. Set `OIDC_ISSUER`, `OIDC_CLIENT_ID`, and `OIDC_CLIENT_SECRET`. The callback must be exactly `APP_URL/api/auth/callback`, for example `https://internship-hub-replit--samfoxprojects.replit.app/api/auth/callback`. Replit Auth has not been provisioned or verified for this project; a Replit username alone cannot sign in.
3. Set `APP_URL` to the public HTTPS origin and `SESSION_SECRET` to at least 32 random characters. The app assumes one trusted reverse proxy for secure cookies. Adjust Express's trust-proxy setting if your hosting topology differs. HTTP is permitted only for localhost development; the identity provider must still use HTTPS.
4. Run `npm run db:migrate` using the configured database, then rebuild and restart the app. The migration is transactional and can be rerun without clearing messages. It creates users, sessions, conversations, messages and read cursors.
5. Sign in at `/messages` with two verified accounts. Members appear in the recipient selector after first sign-in. Send messages in both directions, check unread badges in another window, reload, sign out, and verify that an unrelated third account cannot open the conversation.

All six settings (`APP_URL` plus the five messaging settings) are required. Without them, messaging fails closed and the rest of the programme demo remains usable. No live database or provider was available in the development environment, so production sign-in and database connectivity must be verified after configuration. A GitHub push does not deploy the Replit app.

## Behaviour and boundaries

- The server validates OIDC authorization codes using PKCE, state and nonce, requires a verified account, and regenerates the session after login. Stable issuer + subject identify users, independent of demo profile fields. Only display names and internal account IDs appear in the messaging directory. Every verified account using the configured provider can join; configure membership restrictions at the provider if access should be limited to the fellowship.
- Signed, HttpOnly, SameSite cookies identify sessions stored in PostgreSQL; no private identity, tokens, conversation history or messages are stored in localStorage or IndexedDB. Demo notes, profiles and other pre-existing features retain their original browser-local behaviour.
- Each read, send and read-cursor update checks participant membership on the server. SQL repeats membership conditions for message access. Client sender fields are ignored. Mutations require the public origin and a session-bound CSRF token. Queries use parameters; messages render as plain React text.
- Two members share one conversation regardless of who starts it. Messages are limited to 4,000 characters. The latest 100 messages load initially; earlier history is available through cursor pagination. Read cursors move forward only, through an actual message in that conversation, so a new arrival is not accidentally marked read.
- Active conversation history polls every three seconds; the inbox and navigation unread badges refresh every five seconds. Hidden tabs pause polling and focus refreshes data. Connection errors are visible; unsuccessful sends retain the draft. Enter sends; Shift+Enter adds a line break.
- This is transport-protected, server-stored messaging, not end-to-end encryption. Administrators with database access can read stored text. Calls, attachments, group chat and delivery/read receipts are outside this change.
- Sign out of messaging separately from leaving the programme demo. Sessions expire after eight hours; server-side logout destroys the session. Signing out clears displayed messages.

## Verification

`npm test` includes security and persistence tests against PGlite's embedded PostgreSQL engine, exercising the actual schema and queries. `npm run build` checks TypeScript and production bundling. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` checks the existing portal plus desktop/mobile chat flows, cross-account polling, unread counts, reload persistence, outsider denial, literal text rendering, logout, and production's unconfigured state.

The separate `tests/messaging-server.mjs` uses deterministic **test-only** identities and an isolated embedded database on port 3005. It is never imported by the production entrypoint. This tests the UI and message authorization; it does not substitute for a live OIDC provider integration check or a hosted PostgreSQL connectivity check. `npm start` never exposes test identity headers or cookies.
