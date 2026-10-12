# Administrator and fellow access

Access control is not implemented in this demo. Enter demo is not login, profile email is a placeholder, and directory categories are not permission roles. Replit workspace permissions control who edits/deploys code; application permissions need their own implementation.

Recommended production path: Supabase Auth and Postgres, with invite-only membership.

1. Create a Supabase project. Enable the chosen email login method and configure the deployed Replit origin and authentication callback in its redirect settings. Disable unrestricted public signup for a private cohort.
2. Add server authentication to Express and a login/session flow to React. Verify identity on every protected server operation; hiding buttons does not grant or enforce security. Serve protected cohort information from authenticated APIs rather than embedding it in a public client fixture bundle.
3. Add a server-managed membership table referencing authenticated user IDs, with roles `admin` and `fellow`. Bootstrap the programme administrator through a controlled server/database operation. Clients must not assign or promote their own role. Enforce database row policies and server permission checks.
4. Administrators can manage programme content, invite/remove fellows, and perform explicitly authorised attendance/submission administration. Fellows can read cohort materials and access only their own personal records; private notes remain private. Shared discussions need defined membership access. Role and record access require tests proving users cannot access other users' notes or grant themselves administrator permissions.
5. Replace browser-local personal records with authenticated database records. Implement content management screens and authorise every change. Supabase Auth alone supplies identities; it does not create the hub's administrator UI or migrate localStorage data automatically.
6. Store the provider configuration in Replit's environment settings. A public project URL and publishable key may be client-visible; privileged service credentials belong exclusively on the server. Never put a service-role key in a `VITE_*` variable, source control or chat.
7. After the integration is deployed, invite the administrator account and the fellows via the provider's invitation flow. Assign `admin` through the controlled bootstrap path and `fellow` to ordinary invitees. Verify redirects and permissions on the real published domain using separate accounts.

The supplied password-bearing Zoom join link is intentionally not embedded in the public demo or committed to GitHub. Add it to protected cohort content after authentication and membership checks exist. The supplied reflection form is an external destination; opening it does not synchronise completion into this app.

These are implementation steps, not settings that already exist in the current hub. Authentication, a shared database and administrator screens remain a separate development change requiring a provider project and actual administrator identity.
