# Intern Hub reconstruction

A complete public demo of the intern portal described in the three supplied reconstruction PDFs. React + TypeScript + Vite provide the client; Express serves the production build and calendar endpoints on one port.

**Demo — changes are stored in this browser.** This is not the original Cato application, and it does not connect to Cato, Microsoft Forms, SharePoint, or an original identity provider. No external accounts or secrets are required. Anyone who opens the app can enter the demo.

## Run

Use Node **22.12 or newer**. Replit is configured for Node 22. This cloud instance was verified using Node 24.19.0.

```sh
npm ci --include=dev
npm run dev
```

Development uses Vite middleware through Express on the same port. For production:

```sh
npm run typecheck
npm test
npm run build
npm start
```

Production serves `dist/client` through `server/index.mjs`; it does not use Vite preview. Express listens on `0.0.0.0`, using `PORT` or **3000**. Nested page refreshes work, and missing APIs/assets remain 404s. In a second terminal, validate:

```sh
curl -f http://127.0.0.1:3000/api/health
curl -I http://127.0.0.1:3000/schedule
curl -I http://127.0.0.1:3000/session/56
curl -f http://127.0.0.1:3000/api/sessions/56/calendar.ics
```

The loopback addresses above are local verification commands, not published previews. In a filesystem-restricted cloud environment, use `npm ci --include=dev --cache /workspace/.npm-cache` if the default npm cache is not writable. Each cloud task is already isolated: use this checkout rather than creating an additional Git worktree.

## Environment settings

Copy `.env.example` to `.env` if overrides are needed; `.env` is ignored by Git. Defaults need no configuration.

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port, default 3000. |
| `APP_URL` | Optional public http/https origin used for the subscription feed URL. Otherwise the browser origin is used. |
| `VITE_REFERENCE_NOW` | Public build-time clock, default `2026-10-08T13:23:00Z`. Set to `live` to use real current time, then rebuild. |

The reference clock is used throughout the demo, including session completion, next session, preparation, due status, signup expiry, and discussion activity. Times are displayed and local reading-block inputs interpreted in **America/New_York**. Do not put credentials in `VITE_*` variables. `APP_URL` changes take effect on a server restart; `VITE_REFERENCE_NOW` needs a new build. With `live`, selectors read current time on rendering; there is no background live-refresh service.

## Pages and controls

- This Week: next session, Entry Ticket, RSVP, announcement dismissal, quick tour, Monday-based week groups, first five of all outstanding preparation assignments.
- Schedule: Upcoming/Past, AND-combined attendance/type/area filters, List/Month/Week views, calendar range navigation and subscription dialog.
- Session and resource details: shared reading completion, bookmarks, explicit-save private notes, contact/team links, assistance and calendar downloads.
- Requirements: independent self-reported completion with due/overdue status and actual fixture progress.
- Readings: search/type/area/completion filters, session groups, general resources and reading-time downloads.
- Handbook, Capstone and DC guides: real contents anchors, labeled demo excerpts, tables, related guide links and demo DOCX download.
- FAQ, emergency sample reference, How Things Work and article details.
- Team and person details, searchable teams, Interns/Staff directory and expandable biographies.
- Announcements, discussion composer with session preselection, validated replies, photos with IndexedDB image storage, grouped Saved records, profile editor and demo sign-out/entry.
- Debounced global search with keyboard selection and grouped full results.

All fonts are local `@fontsource` dependencies. The Cato wordmark is a text approximation, not an original logo asset. Mobile uses a menu drawer, stacked layouts and horizontally scrollable calendars. Print CSS removes navigation and controls on the emergency reference.

## Fixture data and missing originals

`shared/types.ts` defines the schema; `shared/fixtures.json` is shared by the client and calendar server. Its records include:

- A Fall 2026 term and the 13 supplied policy-area names.
- **21 sessions** using the supplied observed titles, ET dates and times. Original IDs 56, 62, 63, 75 and 82 are preserved. Other IDs are stable reconstruction identifiers. The observed spelling “Harrasment” is retained.
- **10 resources**, including nine supplied resource anchors and one clearly labeled demo file; **7 distinct required resources/assignments**. Required preparation stays required even when attendance is optional.
- **8 requirements**, with the first three initially complete, **6 people**, **3 teams**, **6 abbreviated articles**, **3 abbreviated guides**, **3 announcements**, and **2 initially unanswered discussions**.
- Initially empty photos/bookmarks, and Going RSVPs on the October 6 reading group and October 7 trade session.

Missing original descriptions, biographies, emails, file contents, guide texts, teams and announcements are explicitly synthetic. Speaker names Colin Grabow and Tom G. Palmer are supplied observations; their demo directory records and example.com contacts are not recovered original records. Unknown locations, durations and original download/submission destinations remain null and render as an em dash or an explicit unavailable state. Original Microsoft Forms destinations are deliberately unavailable; checking a requirement does not simulate a submitted form.

The original handbook/capstone/DC DOCX files, floor plan, photos, approved emergency procedures, contact numbers and private resource files were not supplied. `public/demo-files/` contains a real minimal demo DOCX and plain-text excerpt, labeled as synthetic. No invented emergency procedure or current travel advice is presented as approved guidance. The decorative cohort SVG is a synthetic local asset.

To replace fixtures, keep IDs stable, update the corresponding typed records and assignments, use explicit UTC ISO session timestamps converted from ET, and keep requiredness on `SessionResource`. Update term/member/contact references along with the entities they point to. Put only public, permission-cleared assets under `public/`. Keep unavailable values null rather than inventing recovered content. Rebuild and rerun tests after intentional fixture or dependency changes. Tests assert this supplied dataset; update their expected counts deliberately when replacing fixtures. Do not infer original totals such as 114 sessions or 156 resources from this abbreviated dataset.

## Observations and reconstruction assumptions

The visible destinations, filter behavior, style, session/resource anchors and several interactions came from the PDFs. The original backend, authentication, roles, responsive layout, mutations, populated Saved/gallery layout and exact calculation boundaries were not established. This implementation explicitly assumes:

- A session is past when `endAt < referenceNow`; upcoming otherwise. Upcoming is ascending start time; past is descending. Next session is the earliest session whose end has not passed.
- Outstanding preparation is required, incomplete assignments with `startAt >= referenceNow`, ordered by session start then assignment order, with a five-item preview. Optional attendance does not remove required reading.
- Unspecified attendance is optional except explicitly `[REQUIRED]` titles and plenary meetings, which are assumed required. Session 56 is explicitly required. A FLAGSHIP label alone does not imply required attendance. Unspecified speakers use the synthetic coordinator; unknown locations and reported lengths remain null.
- Resource completion is shared by resource ID; required-reading progress deduplicates required IDs. Percentage is rounded, with 0% for an empty denominator. Requirement completion is independent.
- An incomplete requirement is overdue on or before its due date in ET. Completed items remain Done. This is a proposed cutoff matching the observed morning state.
- Calendar weeks begin Monday in ET. Month starts with the current Monday and shows four weeks; month navigation moves four weeks. Week navigation moves seven days. Filters reset on a schedule remount/reload.
- Readings count distinct filtered IDs and nonempty groups, deduplicating within groups; global reading progress does not change with filters.
- Clicking a selected RSVP clears it. Assistance count includes base synthetic signups plus this browser’s demo signup; closed/full signups are disabled, and an existing signup can be canceled while open.
- Current announcements sort urgent first, then newest; earlier announcements sort newest. Dismissal applies only to the home widget.
- Newest discussions sort by creation time; Most active sorts by reply count then latest activity; Unanswered filters to zero replies and sorts newest. Last activity is the maximum thread/reply timestamp.
- Gallery cards and Saved groups are proposed adaptations. Photo object URLs are recreated from IndexedDB on reload and revoked when unused. No albums, moderation, deletion, roles, analytics or real authentication were added.
- Guide paragraphs are abbreviated layout samples. The demo Enter screen replaces the unseen original login flow.

## Persistence

Small records use the versioned localStorage key `intern-hub-demo:v1`. Reads validate JSON and state shape, obsolete completion IDs are removed against fixtures, and unavailable/quota-limited storage shows visible errors. State is not rewritten on mount. Large photo/profile Blobs use IndexedDB `intern-hub-images`, not base64 in localStorage.

Notes and profile edits persist only on their Save buttons. Sign-out keeps saved browser records. Different visitors, browsers and origins have independent state. Replit Preview and a published domain therefore have different records. This demo has no database, shared discussions, multiuser permissions, server photo storage or cross-device synchronization. Calendar feeds contain fixture sessions and **no private notes**. Clearing this origin’s browser storage resets the demo.

## Tests and verified results

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

If a compatible Chromium is already provided, skip the browser download and run:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

PowerShell equivalent: `$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="C:\path\to\chrome.exe"`, followed by `npm run test:e2e`. By default Playwright uses its managed Chromium. Its test runner starts the production server when needed. Build before browser tests.

Verified in the cloud instance:

- Frozen install via `npm ci --include=dev`, TypeScript and production build passed.
- **16 Vitest tests** cover combined filters/order, real progress, independent requirements, optional-session preparation, ET week/DST conversion, discussion ordering, safe/migrating browser storage, RFC 5545 escaping/folding and reading durations.
- **8 Playwright integration tests** cover health/calendar responses, 400/404 handling, SPA refreshes, schedule controls, notes/bookmarks/RSVP and reading synchronization, linked discussions/validation, profile/sign-out, IndexedDB images across reload, global-search keyboard use, storage errors and narrow-screen overflow.
- Desktop and 390px-wide browser screenshots were inspected; no page runtime errors were observed. Generated screenshots/reports are ignored.
- `npm audit` reported **0 known vulnerabilities** for the locked dependency set at verification time.

These results verify this cloud instance, not a future Replit publication. Run the public checks again after publishing.

## GitHub and Replit deployment

Use the existing `sfox2006/Internship-hub-replit` repository. The PDF’s `git init` and new `intern-hub-rebuild` repository examples apply to an uninitialized project and are unnecessary here. Source visibility does not determine published app access.

1. Open Replit’s GitHub import flow at `https://replit.com/import`, connect the appropriate GitHub account, and select `sfox2006/Internship-hub-replit` on `main`.
2. Verify Node is at least 22.12, then run `npm ci --include=dev`, `npm run typecheck`, `npm test`, and `npm run build` in its Shell.
3. The supplied `.replit` uses `npm run replit` for workspace Run, builds with `npm ci --include=dev && npm run build`, and starts production with `npm start`. `replit.nix` selects `pkgs.nodejs_22`. Only port **3000 → 80** is exposed. Keep the mapping aligned if overriding `PORT`.
4. No required secrets. Optionally set `APP_URL` to the published origin. Select Run and verify the app, health response and direct nested page refreshes.
5. In Publishing, choose an available `.replit.app` domain, **Public** access and **Autoscale**. Review the displayed deployment cost, then publish using your account’s controls.
6. Open the published URL in an incognito window. Check `/api/health`, `/schedule`, `/session/56` and `/api/sessions/56/calendar.ics`. Save a bookmark and reload to verify persistence in that browser.

This project’s portable `npm run replit` command installs the lockfile, builds, and starts the single production listener. Public calendar subscriptions require the published URL; there are no Outlook/Google API credentials.

For later updates, commit/push the code, pull with `git pull --ff-only` in Replit when its checkout is clean, rerun install/tests/build, publish again, then recheck the actual public application. If a private repository is missing from import, check Replit’s Git Providers connection and repository access. If deployment cannot detect a port, confirm `0.0.0.0`, `PORT` and the mapping. If build tools are missing, install with `--include=dev`. For lockfile errors after intentional dependency changes, regenerate/commit the lockfile locally and retry frozen installation.

Replit import and public publication require your Replit account and cost/domain controls. No Replit deployment has been created or verified merely by building this project or saving its cloud startup configuration.
