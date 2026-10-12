# Liberty & Society Fellowship Hub

An independent adaptation of the existing intern-portal demo for the Centre for Independent Studies (CIS) Liberty & Society Student Fellowship. Programme data combines the original briefing (25 September 2026 snapshot) with the subsequently supplied cohort HTML containing readings, questions and updated speakers. This is not an official CIS portal, an application system, or a live integration with CIS. No secrets are required.

## What changed

- Cato branding, course links and session fixtures were replaced by the CIS fellowship context and official CIS website/cohort links.
- `/programme` preserves the substantive supplied briefing: mission, classical-liberal orientation, eligibility, funding, reflections, viva voce/AI policy, participation rules, all 13 sessions, discussion questions, alumni qualifications, related programmes and application unknowns.
- The 13 supplied dates use **Australia/Sydney**, including daylight saving. Sessions run 6–8 p.m. Sydney time. Stephen Walters, Chris Berg and Gigi Foster are now confirmed in the supplied HTML. The final speaker and outstanding questions/readings retain their source placeholders.
- Requirements contain 13 reflections and three viva reviews. Reflection dates are calculated as 14 days after each session; the reported due time is 11:59 p.m. Sydney time. An item becomes overdue the following local day, rather than at the beginning of its due date. Reflection requirements link to the supplied Google submission form. Viva appointments remain unspecified.
- Attendance has its own browser-local record, separate from RSVP and reflection/review completion. Programme guidance reports at least 10 of 13 sessions; entry-specific absence limits are retained. This is not an official attendance register or certificate.
- Readings are encouraged, not mandatory. 26 optional resource assignments (including two presentations) and 19 full reflection questions are imported from the supplied HTML. External links are retained, including shared reading collections.
- The handbook, reflection/viva guide, application information and FAQ reflect the fellowship. Cato-specific office/team/emergency content is no longer reachable as active pages; those old routes redirect to programme guidance. Legacy guide URLs remain supported.
- Speakers use reported names/affiliations, with missing biographies/contacts identified as unavailable. The sole fellow profile is explicitly synthetic.
- Profile, notes, bookmarks, replies and image-upload functionality remain browser-local. CIS records use `cis-fellowship-demo:v1` and IndexedDB `cis-fellowship-images`; previous Cato browser records are left untouched.

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

Do not put secrets in `VITE_*` variables. Reflection links open the supplied external form; this app does not detect or assert successful form submission. No application or viva appointment integration is implemented. The supplied password-bearing Zoom join link is not committed to this public-demo code; distribute it privately until authenticated membership access is implemented.

The retained `.replit` / `replit.nix` configure Node 22, workspace Run `npm run replit`, production build `npm ci --include=dev && npm run build`, production run `npm start`, and one mapped HTTP port (3000 → 80). Import `sfox2006/Internship-hub-replit` on `main` into Replit, run the checks, then publish using the account’s Public/Autoscale controls after reviewing the displayed cost. Pull this commit into an existing Replit project and republish to update its live app. A GitHub push alone does not deploy Replit.

After publishing, verify the public app’s `/api/health`, `/programme`, `/schedule`, `/session/ls-1022`, and `/api/sessions/ls-1022/calendar.ics`. Test bookmark persistence after reload. Browser data is origin-specific, so Preview and the published domain have independent records.

## Data and persistence

`shared/types.ts` defines entity/state types; `shared/fixtures.json` supplies the shared client/server fixtures. `shared/fellowshipBriefing.json` preserves the uploaded briefing with small editorial changes to the introduction and attribution. The briefing is rendered as safe React text and a structured table, never raw HTML.

UTC event instants are converted from the supplied Sydney dates/times. Assignments, unknown speakers, deadline assumptions and synthetic participant data must remain clearly distinguished from verified official data. The palette and policy-area classifications are editorial adaptations; they are not claims about official CIS website taxonomy.

Notes and profile edits save only on request. Image Blobs use IndexedDB with recreated/revoked object URLs. Storage failures remain visible. Sign-out retains personal browser records. There is no shared database, real authentication, moderation, automatic CIS submission synchronisation or cross-device synchronization. Calendar feeds contain fixture sessions and no private notes.

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

Verified for this adaptation: **13 unit tests and 7 browser integration tests**, TypeScript and production build pass. Checks cover Sydney DST conversion, all 13 calendar events, programme-source preservation, real fixture totals, deadlines, independent attendance/RSVP/reflections, notes/bookmarks, linked discussions, profile/image persistence, mobile overflow, storage errors, nested production routes and API/asset 404s. These results validate the cloud build, not a future Replit publication or official CIS content/branding.
