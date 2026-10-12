# Activate the owner's administrator access with Replit Auth

## Current status

Replit Auth is not enabled in this checkout and no administrator account has been created. The server authorization helper in `server/admin-access.mjs` is prepared and tested, but deliberately not connected to an unverified identity source. This helper alone does not protect any route or authenticate any user. The published application remains a public browser-local demo until the steps below are completed.

Replit's official documentation says: **“The only way to implement Replit Auth is by using Agent”** and **“Manual implementation is not supported.”** Replit Agent must provision Auth inside this project. Source: https://docs.replit.com/replit-workspace/replit-auth (redirects to the current Replit Auth documentation).

## Project owner

Published app: https://internship-hub-replit--samfoxprojects.replit.app/

Owner-supplied Replit username: `samfoxprojects`. This nominates the intended owner; authentication and stable-ID verification must still happen inside Replit Auth.

## Before activation

Pull the latest GitHub `main` into the Replit project, preserving its Replit-generated configuration commit (use the previously agreed merge workflow if the histories diverge). Do not discard local changes. Keep the current production build/start/port configuration.

The owner needs an existing Replit account. No replacement account or password should be created in this app. Usernames and browser profile email fields are not sufficient to prove administrator identity.

## Paste into Replit Agent

```text
Enable Replit Auth in this existing CIS Liberty & Society Fellowship Hub. Use Replit's supported Agent integration and the project's database/session provisioning. Keep existing CIS content and styling, the single Express listener and the production build/start configuration.

The owner has nominated Replit username samfoxprojects. The published app is https://internship-hub-replit--samfoxprojects.replit.app/. Verify that account through Replit Auth and the project Auth pane, then bind its stable user ID. For now, implement administrator access for that project owner only. Do not grant administrator access automatically to the first signup, every Replit user, an email domain or a role submitted by the browser.

After Replit Auth verifies a sign-in, obtain its stable user ID from the validated server session. Show the signed-in user their own stable ID on an account page. Ask me to confirm which verified user is mine, and configure ADMIN_REPLIT_USER_IDS in server-side environment settings with my exact ID. No secret values should be committed. An unset administrator allowlist must deny administrator access.

Connect server/admin-access.mjs to your verified server identity adapter ({subject: stableReplitUserId}). Apply it to all administrator API routes; the helper is currently unconnected and does not authenticate anyone. Ignore browser-supplied roles, emails, profile overrides and user-ID headers. Authentication errors must fail closed.

Add /admin showing the authenticated owner's identity, role and administrator controls. Show the navigation link only to that administrator, and enforce authorization on the server even if another user directly requests a URL. Do not mark anonymous Enter demo users as administrators. Real sign-out must end the server session.

Keep ordinary new signups unapproved for privileged actions. Do not enable fellow access, publish the password-bearing Zoom meeting link or introduce a public administrator bootstrap endpoint. Leave private notes, photos and completion records browser-local for now unless you explicitly implement an authenticated, user-isolated migration; do not silently treat localStorage as shared authoritative data.

Use secure session cookies and Replit's supported database-backed session handling suitable for published instances. Check login callbacks in Preview and on the actual published domain.

Verify: anonymous /admin API access is 401; authenticated non-admin access is 403; the exact configured owner is allowed; changing role/user ID in a request does not grant access; removing the administrator ID revokes access; logout removes access. Run existing typecheck/unit/build/browser checks plus authenticated tests through the real Replit integration.

Show me the results and configured owner before republishing. Report any remaining required step rather than claiming activation succeeded from mocked tests.
```

## Finish in Replit

1. Let Agent enable Replit Auth; sign in using your own Replit account.
2. Confirm your stable user ID and set the server-side administrator allowlist to that exact ID. Authenticated account information must be read from Replit's verified session.
3. Verify your account opens `/admin`, while a separate account cannot use its APIs. Replit's Auth pane manages identities; it does not by itself assign the application's administrator role.
4. Publish the integrated application and verify sign-in, administrator access and sign-out on the real public URL.

Never paste passwords or session/service secrets into chat. Actual activation cannot be validated from the Codex cloud checkout: this environment has no Replit Auth binding, project owner identity or login session.
