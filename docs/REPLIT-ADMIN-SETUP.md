# Development authentication and administrator bootstrap

## Current status

Replit-managed Clerk Auth has been provisioned for **Development**. This checkout now uses Clerk's verified server session, a sign-in gate, protected APIs, and a server-backed role table. No user has been made an administrator. The published application and production authentication/database settings have not been changed.

## Project owner

Published app: https://internship-hub-replit--samfoxprojects.replit.app/

The Replit username `samfoxprojects` is the intended owner account, but a username alone is not proof of identity. Administrator activation still requires a sign-in and explicit confirmation of the stable user ID shown by this app.

## Verify the owner identity

1. Open the **Development Preview** for this project and visit `/sign-in`; use the existing Replit-managed Clerk account, or create a normal account with `/sign-up`.
2. After sign-in, open `/account`. Its **Verified Clerk user ID** is returned by `/api/me` from the server-verified session, not from a browser-supplied role or ID.
3. Share that ID and confirm it is yours. Do not use a username, email, profile field, request header, or ID copied from another account as proof.

## Explicit administrator bootstrap

There is no public role-edit endpoint and no first-user promotion. Until the owner confirms the exact ID, all new accounts stay normal users and `/admin` is unavailable.

After the owner confirms the ID, an authorized project operator can promote that one row in the **Development** database using a bound SQL parameter:

```sql
UPDATE app_user_roles
SET role = 'administrator', updated_at = now()
WHERE clerk_user_id = $1 AND role = 'normal'
RETURNING clerk_user_id, role;
```

Bind `$1` to the exact ID confirmed by the owner. Verify that exactly one matching row is returned, then check `/api/admin` and `/admin` while signed into that account. A zero-row result must be investigated rather than widened to a username or email match.

To revoke the role, set the same exact ID back to `normal` with a parameterized update. `/api/admin` re-reads the persistent role data on each request, so revocation takes effect immediately. Never add the ID to source code, `.env.example`, browser storage, or a client request.

## Browser-local data and deployment

Profile fields, photo metadata/blobs, attendance, RSVP, reflection completion, bookmarks, notes, discussion threads/replies, dismissed notices, and tour state are still stored in the user's browser. Local state keys are namespaced by the verified Clerk user ID; images remain in IndexedDB. These records are not shared with administrators or synchronized across devices. Shared programme/speaker/session source content remains static fixture data.

Only Development has been provisioned and checked. Do not publish until explicitly approved. Publishing will require reviewing Clerk's production-domain setup and the production database schema separately; no production administrator role is included in this setup.
