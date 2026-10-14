# Administrator and fellow access

## Current Development status

Replit-managed Clerk Auth is configured for Development. The Express server verifies Clerk sessions; hub pages require sign-in, all `/api/*` routes except health checks require sign-in, and `/api/admin/*` requires a server-stored administrator role. The public `/` page is only the welcome/sign-in entry point. Normal signups are stored as `normal`; no administrator has been assigned.

The Development PostgreSQL table `app_user_roles` stores the stable Clerk user ID and role. It contains no client-writable role endpoint. The production deployment and production database/auth settings have not been changed.

## Personal data and content boundaries

Profile, attendance, RSVP, reflection completion, notes, bookmarks, discussions, replies, dismissals, and photo metadata are stored in browser localStorage under a key derived from that user's verified Clerk ID. Uploaded image blobs are in IndexedDB and referenced only by that user's local profile. This isolates accounts in the same browser but does not sync data across devices or provide server backups.

Programme/session/speaker fixtures are bundled as read-only shared content. They are not a place to put private or password-bearing material: client-bundled content can be inspected even when a page requires sign-in. The supplied Zoom password/link remains excluded. Opening the supplied reflection form does not synchronise its submission status.

## Owner identity and administrator activation

The intended owner is Replit username `samfoxprojects`, but username/email are not proof of identity. Sign in in Development, open `/account`, and use the **Verified Clerk user ID** shown there. It is returned by `/api/me` from the verified server session. Confirm that exact ID before any role change.

After explicit confirmation, promote only that ID with a parameterized update in the Development database. The full steps and exact query are in [REPLIT-ADMIN-SETUP.md](./REPLIT-ADMIN-SETUP.md). Do not implement first-user promotion, email-based promotion, client roles, or a public bootstrap endpoint. A production role must be separately considered after a production deployment is approved.
