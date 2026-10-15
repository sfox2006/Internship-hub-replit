# Administrator and fellow access

## Current Development status

Replit-managed Clerk Auth is configured for Development. The Express server verifies Clerk sessions. Public sign-in/sign-up and `/account` remain available to signed-in users; member pages, member JavaScript chunks, and member APIs additionally require an active email enrollment. `/admin` and `/api/admin/*` require a server-stored administrator role. New identities receive only the `normal` role. No administrator has been assigned.

The Development PostgreSQL tables `app_user_roles`, `app_enrollments`, and `app_enrollment_audit` store roles, approved email entries, stable Clerk ID bindings, status changes, timestamps, and actor IDs. No client-writable role endpoint exists. The approved-email roster is empty. Development schema is prepared; Production has not received the roster schema because this work is not being published.

## Personal data and content boundaries

First and last name are stored in the signed-in Clerk account and required before entering the hub. Other profile, attendance, RSVP, reflection completion, notes, bookmarks, discussions, replies, dismissals, and photo metadata are stored in browser localStorage under a key derived from that user's verified Clerk ID. Uploaded image blobs are in IndexedDB and referenced only by that user's local profile. This isolates accounts in the same browser but does not sync data across devices or provide server backups.

The public authentication entry bundle does not contain the shared programme fixtures. Those fixtures are loaded only in member-gated JavaScript chunks, and calendar/data APIs are server-gated. Do not put secrets or password-bearing material in the fixtures. The supplied Zoom password/link remains excluded. Opening the supplied reflection form does not synchronise its submission status.

## Owner identity and administrator activation

The intended owner is Replit username `samfoxprojects`, but username/email are not proof of identity. Sign in in Development, open `/account`, and use the **Verified Clerk user ID** shown there. It is returned by `/api/me` from the verified server session. Confirm that exact ID before any role change. Production authentication may issue a different provider ID, so verify it separately before any Production role change.

After explicit confirmation, promote only that ID with a parameterized update in the Development database. The full steps and exact query are in [REPLIT-ADMIN-SETUP.md](./REPLIT-ADMIN-SETUP.md). Do not implement first-user promotion, email-based promotion, client roles, or a public bootstrap endpoint. See [ENROLMENT-OPERATIONS.md](./ENROLMENT-OPERATIONS.md) for roster operations and the non-destructive Production schema step.
