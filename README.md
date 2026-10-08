# Liberty & Society Fellowship Hub

An independent adaptation of the existing intern-portal demo for the Centre for Independent Studies (CIS) Liberty & Society Student Fellowship. Programme data comes from the user-supplied briefing, whose schedule snapshot is **25 September 2026**. This is not an official CIS portal, an application system, or a live integration with CIS. No secrets are required.

## What changed

- Cato branding, course links and session fixtures were replaced by the CIS fellowship context and official CIS website/cohort links.
- `/programme` preserves the substantive supplied briefing: mission, classical-liberal orientation, eligibility, funding, reflections, viva voce/AI policy, participation rules, all 13 sessions, discussion questions, alumni qualifications, related programmes and application unknowns.
- The 13 supplied dates use **Australia/Sydney**, including daylight saving. Sessions run 6–8 p.m. Sydney time. Unknown later speakers/topics remain explicitly to be confirmed.
- Requirements contain 13 reflections and three viva reviews. Reflection dates are calculated as 14 days after each session; the reported due time is 11:59 p.m. Sydney time. An item becomes overdue the following local day, rather than at the beginning of its due date. Appointments/submission destinations were not supplied.
- Attendance has its own browser-local record, separate from RSVP and reflection/review completion. Programme guidance reports at least 10 of 13 sessions; entry-specific absence limits are retained. This is not an official attendance register or certificate.
- Readings are encouraged, not mandatory. No reading assignments were invented. Official source links are provided instead.
- The handbook, reflection/viva guide, application information and FAQ reflect the fellowship. Cato-specific office/team/emergency content is no longer reachable as active pages; those old routes redirect to programme guidance. Legacy guide URLs remain supported.
- Speakers use reported names/affiliations, with missing biographies/contacts identified as unavailable. The sole fellow profile is explicitly synthetic.
- Profile, notes, bookmarks, replies and image-upload functionality remain browser-local. CIS records use `cis-fellowship-demo:v1` and IndexedDB `cis-fellowship-images`; previous Cato browser records are left untouched.

## Brand verification: incomplete

The CIS website returned HTTP 403 through this cloud environment’s restricted network. Exact website colours, typography, official logo assets and current programme changes could not be inspected. The interface therefore uses a **provisional**, restrained blue/teal palette, neutral Arial/Helvetica typography and a **text CIS identifier**, not a recovered official logo. It must not be described as matching verified CIS brand guidelines.

Palette tokens live in `src/styles/tokens.css`, and fellowship overrides in `src/styles/layout.css`. After official references become accessible, replace the provisional tokens/typeface and text identifier with verified assets. The domains `cis.org.au` and `www.cis.org.au` were requested in the environment configuration draft; saving a draft does not apply network changes. Alternatively use branding references supplied by the user. No bypass of the network policy was attempted.

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

Do not put secrets in `VITE_*` variables. No Zoom, application, reflection or viva submission link was supplied; the demo does not fabricate successful official submissions.

The retained `.replit` / `replit.nix` configure Node 22, workspace Run `npm run replit`, production build `npm ci --include=dev && npm run build`, production run `npm start`, and one mapped HTTP port (3000 → 80). Import `sfox2006/Internship-hub-replit` on `main` into Replit, run the checks, then publish using the account’s Public/Autoscale controls after reviewing the displayed cost. Pull this commit into an existing Replit project and republish to update its live app. A GitHub push alone does not deploy Replit.

After publishing, verify the public app’s `/api/health`, `/programme`, `/schedule`, `/session/ls-1022`, and `/api/sessions/ls-1022/calendar.ics`. Test bookmark persistence after reload. Browser data is origin-specific, so Preview and the published domain have independent records.

## Data and persistence

`shared/types.ts` defines entity/state types; `shared/fixtures.json` supplies the shared client/server fixtures. `shared/fellowshipBriefing.json` preserves the uploaded briefing with small editorial changes to the introduction and attribution. The briefing is rendered as safe React text and a structured table, never raw HTML.

UTC event instants are converted from the supplied Sydney dates/times. Assignments, unknown speakers, deadline assumptions and synthetic participant data must remain clearly distinguished from verified official data. The palette and policy-area classifications are editorial adaptations; they are not claims about official CIS website taxonomy.

Notes and profile edits save only on request. Image Blobs use IndexedDB with recreated/revoked object URLs. Storage failures remain visible. Sign-out retains personal browser records. There is no shared database, real authentication, moderation, CIS submission integration or cross-device synchronization. Calendar feeds contain fixture sessions and no private notes.

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

The browser suite starts an isolated production test listener on port **3004**. Build before running it. On PowerShell, set the executable path via `$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if needed.

Verified for this adaptation: **11 unit tests and 6 browser integration tests**, TypeScript and production build pass. Checks cover Sydney DST conversion, all 13 calendar events, programme-source preservation, real fixture totals, deadlines, independent attendance/RSVP/reflections, notes/bookmarks, linked discussions, profile/image persistence, mobile overflow, storage errors, nested production routes and API/asset 404s. These results validate the cloud build, not a future Replit publication or official CIS content/branding.
