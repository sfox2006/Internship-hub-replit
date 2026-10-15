# Liberty & Society Fellowship Hub

An independent adaptation of the existing intern-portal demo for the Centre for Independent Studies (CIS) Liberty & Society Student Fellowship. Programme data combines the original briefing (25 September 2026 snapshot) with the subsequently supplied cohort HTML containing readings, questions and updated speakers. This is not an official CIS portal, an application system, or a live integration with CIS. Development authentication uses Replit-managed Clerk credentials; no credentials belong in the repository.

## What changed

- Cato branding, course links and session fixtures were replaced by the CIS fellowship context and official CIS website/cohort links.
- `/programme` preserves the substantive supplied briefing: mission, classical-liberal orientation, eligibility, funding, reflections, viva voce/AI policy, participation rules, all 13 sessions, discussion questions, alumni qualifications, related programmes and application unknowns.
- The 13 supplied dates use **Australia/Sydney**, including daylight saving. Sessions run 6–8 p.m. Sydney time. Stephen Walters, Chris Berg and Gigi Foster are now confirmed in the supplied HTML. The final speaker and outstanding questions/readings retain their source placeholders.
- Requirements contain 13 reflections and three viva reviews. Reflection dates are calculated as 14 days after each session; the reported due time is 11:59 p.m. Sydney time. An item becomes overdue the following local day, rather than at the beginning of its due date. Reflection requirements link to the supplied Google submission form. Viva appointments remain unspecified.
- Attendance has its own browser-local record, separate from RSVP and reflection/review completion. Programme guidance reports at least 10 of 13 sessions; entry-specific absence limits are retained. This is not an official attendance register or certificate.
- Readings are encouraged, not mandatory. 26 optional resource assignments (including two presentations) and 19 full reflection questions are imported from the supplied HTML. External links are retained, including shared reading collections.
- The handbook, reflection/viva guide, application information and FAQ reflect the fellowship. Cato-specific office/team/emergency content is no longer reachable as active pages; those old routes redirect to programme guidance. Legacy guide URLs remain supported.
- Speakers use reported names/affiliations, with missing biographies/contacts identified as unavailable. New account profiles start blank; no demo account is created or signed in automatically.
- Replit-managed Clerk Auth gates member pages and APIs. A server-owned approved-email roster is matched against a verified Clerk email and bound once to the stable Clerk user ID. New accounts receive only the `normal` role; administrator access is checked server-side against `app_user_roles`. No administrator or approved member address is assigned automatically.
- Profile fields, notes, bookmarks, attendance, reflections, RSVP, discussions, replies, photo metadata and uploaded image blobs remain browser-local and are namespaced by the verified Clerk user ID. These records do not sync across devices or accounts. Previous `cis-fellowship-demo:v1` browser records and IndexedDB images are left untouched and are not loaded as a signed-in user's state. Shared programme fixtures are excluded from the public authentication bundle; member chunks and calendar APIs are gated by server-checked enrollment.

## Visual references and brand fidelity

The current treatment uses the user-supplied CIS cohort HTML and website screenshot:

- Exact HTML colours: teal `#005850`, dark teal `#024a44`, action green `#1a4a2e`, success background `#e3efe6`, body text `#1a1a1a`, neutral background `#fafafa`, border `#d7d7d7` and lighter divider `#e3e3e3`.
- Screenshot-based details: a gold institutional plaque with the 50-year anniversary treatment, teal headings and a broad teal rule, spacious text, flat white surfaces and restrained rounding. Gold `#c09d51` is visually approximated from the screenshot, not sampled from an original logo file.
- Local Raleway weights 400/600/700 provide a close visual match to the geometric sans-serif screenshot. The supplied HTML does not declare a font family, so the official website typeface is not confirmed.
- `BrandMark.tsx` is a text/CSS reconstruction of the visible mark, with an accessible name. It is not an original official logo asset. Replace it with that asset if one is supplied.

Palette tokens live in `src/styles/tokens.css`; reference-based layout rules are in `src/styles/layout.css`. Website access remains restricted, but the supplied references are sufficient to apply the evidenced colours and formatting. The new HTML also contains programme links and operational information; this styling change does not publish that raw HTML or its meeting access details to GitHub.

Official references for later verification:

- https://www.cis.org.au/
- https://www.cis.org.au/events/liberty-society-student-programs/ls-fellowship-cohort-2026-program/

The source’s reflection-length discrepancy (general: 200–300; 2026 hub: 300), viva-duration discrepancy (general: ten minutes; hub: fifteen), workshop age-cap distinction and wider-programme alumni qualification are preserved. The reported 2027 expression-of-interest/application status is not verified as current. No actual personal application or selection rubric was invented.

## Run and deploy

Node **22.12+** is required; the cloud instance uses Node 24.19.0. Use the existing checkout; cloud tasks are already isolated, so no additional Git worktree is needed.

```sh
npm ci --include=dev
npm run dev
```

Development uses Vite middleware on the same Express listener. Production:

```sh
npm run typecheck
npm test
npm run build
npm start
```

Express serves `dist/client` on `0.0.0.0:${PORT:-3000}`. Production does not use Vite preview. Use `--cache /workspace/.npm-cache` with npm installation if the default cache is unwritable. Do not reinstall dependencies while a development server is starting.

`.env.example` documents optional settings:

- `PORT`: default 3000.
- `APP_URL`: optional public origin for the calendar feed URL; defaults to the browser origin.
- `VITE_REFERENCE_NOW`: public build-time instant, default `2026-10-08T13:23:00Z`. Set to `live` and rebuild for real current time. All programme calculations use the same reference clock and Sydney timezone. There is no background live-refresh service.
- `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`: provisioned as Replit-managed Development secrets; never add real values to `.env.example` or commit them. The Clerk proxy URL is provisioned for production.

Do not put secrets in `VITE_*` variables. Reflection links open the supplied external form; this app does not detect or assert successful form submission. No application or viva appointment integration is implemented. The supplied password-bearing Zoom join link is not committed to this code; distribute it privately outside the app.

The retained `.replit` / `replit.nix` configure Node 22, workspace Run `npm run replit`, production build `npm ci --include=dev && npm run build`, production run `npm start`, and one mapped HTTP port (3000 → 80). Import `sfox2006/Internship-hub-replit` on `main` into Replit, run the checks, then publish using the account’s Public/Autoscale controls after reviewing the displayed cost. Pull this commit into an existing Replit project and republish to update its live app. A GitHub push alone does not deploy Replit.

After publishing, verify the public app’s `/api/health`, `/programme`, `/schedule`, `/session/ls-1022`, and `/api/sessions/ls-1022/calendar.ics`. Test bookmark persistence after reload. Browser data is origin-specific, so Preview and the published domain have independent records.

## Data and persistence

`shared/types.ts` defines entity/state types; `shared/fixtures.json` supplies the shared client/server fixtures. `shared/fellowshipBriefing.json` preserves the uploaded briefing with small editorial changes to the introduction and attribution. The briefing is rendered as safe React text and a structured table, never raw HTML.

UTC event instants are converted from the supplied Sydney dates/times. Assignments, unknown speakers, deadline assumptions and synthetic participant data must remain clearly distinguished from verified official data. The palette and policy-area classifications are editorial adaptations; they are not claims about official CIS website taxonomy.

Notes and profile edits save only on request. Image blobs use IndexedDB with recreated/revoked object URLs. Storage failures remain visible. Sign-out retains records under that account's browser-local namespace. Development PostgreSQL stores account roles plus the approved-email roster and audit history; it does not store profile, attendance, notes, discussions or image data. Clerk holds hub authentication identities. Private messages are stored in PostgreSQL and use the same server-verified Clerk session, stable user ID, verified email and active approved roster as the hub; see [messaging setup](docs/MESSAGING-SETUP.md). No message data is stored in localStorage or IndexedDB. There is no moderation, automatic CIS submission synchronization or cross-device sync for browser-local hub state. Calendar feeds contain fixture sessions and no private notes. Roster setup and owner bootstrap steps are in [docs/ENROLMENT-OPERATIONS.md](docs/ENROLMENT-OPERATIONS.md).

## Verification

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

If a compatible Chromium is supplied, skip browser installation:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

The browser suite builds an isolated `e2e`-mode client and starts a test-only server with fixed normal/admin identity fixtures on port **3004**. Those fixtures are gated by both the `e2e` Vite mode and `NODE_ENV=test` plus `APP_AUTH_TEST_FIXTURES=1`; they are not enabled in the normal Development or production build. On PowerShell, set the executable path via `$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if needed.

Verified for this adaptation: **28 unit tests and 11 browser integration tests**, TypeScript and production build pass. Checks cover Sydney DST conversion, all 13 calendar events, programme-source preservation, real fixture totals, deadlines, independent attendance/RSVP/reflections, notes/bookmarks, linked discussions, profile/image persistence, user-key storage isolation, anonymous redirects, API 401s, normal-user administrator denial, fixture administrator authorization, role/header tampering, mobile overflow, storage errors, nested routes and API/asset 404s. Fixture tests do not substitute for signing in with the owner's actual account.

## Owner administrator activation

The intended owner is Replit username `samfoxprojects`, and the published app is `https://internship-hub-replit--samfoxprojects.replit.app/`. Replit-managed Clerk Auth is provisioned in **Development only**. No account has been verified and no administrator role has been assigned. Sign in through the Development Preview, open `/account`, and confirm the server-verified Clerk user ID before any administrator grant.

[REPLIT-ADMIN-SETUP.md](docs/REPLIT-ADMIN-SETUP.md) explains the account-ID verification and explicit, parameterized Development database bootstrap. `server/admin-access.mjs` is connected to Clerk's verified server session for `/api/admin`; the admin page and API remain inaccessible to normal accounts. Production auth, production database schema, and production administrator access remain unchanged until a later approved publish and activation.

## Latest portal changes

Photo Library and the separate Application Information page have been removed from navigation, routes and searchable guide data. Their old URLs return 404. Profile photo changes remain available, and existing browser image records are not erased. The earlier source briefing remains intact for reference.

Discussion replies can target the original post or another comment, with recursively nested threads, collapse/expand controls, whitespace validation and browser persistence. Old flat replies remain top-level. Discussion data is still browser-local until authenticated shared storage is integrated.

`/reflections` provides session selection, full questions, deadlines and the supplied external submission form, with an optional embedded version and a fallback link. It does not submit on the user's behalf or infer external submission success.

## Private messaging

`/messages` adds a responsive, WhatsApp-style one-to-one inbox with text conversations, history pagination, unread counts and automatic polling updates. It uses the existing verified Clerk account and shared PostgreSQL storage; demo state cannot grant access. Existing programme features and CIS branding are preserved.

**Service configuration is required before messaging is usable.** See [MESSAGING-SETUP.md](docs/MESSAGING-SETUP.md) for the environment settings, database migration, security boundaries and live verification steps. Missing configuration keeps messaging disabled while preserving the programme demo.
