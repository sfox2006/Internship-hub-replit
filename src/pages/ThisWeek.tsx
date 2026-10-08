import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  X,
  ChevronDown,
} from "lucide-react";
import {
  nextSession,
  fixtures,
  outstandingPrep,
  weekSessions,
  sessionAssignments,
} from "../data/selectors";
import { localFormat, mondayKey, referenceNow, shiftDay } from "../data/clock";
import { useDemo } from "../data/demoStore";
import Card from "../components/Card";
import SessionRow from "../components/SessionRow";
import BookmarkButton from "../components/BookmarkButton";
export function Rsvp({ id }: { id: string }) {
  const { state, update } = useDemo();
  return (
    <div className="row wrap" role="group" aria-label="RSVP">
      {(["going", "unavailable"] as const).map((v) => (
        <button
          key={v}
          aria-pressed={state.rsvpBySession[id] === v}
          className={state.rsvpBySession[id] === v ? "selected" : ""}
          onClick={() =>
            update((s) => ({
              ...s,
              rsvpBySession: {
                ...s.rsvpBySession,
                [id]: s.rsvpBySession[id] === v ? null : v,
              },
            }))
          }
        >
          {v === "going" ? "Going" : "Can’t make it"}
        </button>
      ))}
    </div>
  );
}
export default function ThisWeek() {
  const { state, update } = useDemo();
  const now = referenceNow();
  const next = nextSession(now);
  const prep = outstandingPrep(state.completedResourceIds, now);
  const week = mondayKey(now);
  const announcement = fixtures.announcements.find(
    (a) =>
      (!a.expiresAt || new Date(a.expiresAt) > now) &&
      !state.dismissedAnnouncementIds.includes(a.id),
  );
  const [tour, setTour] = useState(!state.quickTourDismissed);
  function closeTour() {
    setTour(false);
    update((s) => ({ ...s, quickTourDismissed: true }));
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">LIBERTY & SOCIETY · 2026 FELLOWSHIP</span>
          <h1>Welcome, {state.profile.firstName}.</h1>
          <p>Independent thinking. Rigorous inquiry. Open debate.</p>
        </div>
        <span className="date-label">{localFormat(now, "EEEE, MMMM d")}</span>
      </div>
      {next ? (
        <section className="hero">
          <div className="between">
            <span className="eyebrow">UP NEXT · {next.type}</span>
            <BookmarkButton type="session" id={next.id} title={next.title} />
          </div>
          <h2>{next.title}</h2>
          <p>
            {localFormat(next.startAt, "EEEE, MMM d")} ·{" "}
            {localFormat(next.startAt, "h:mm a")}–
            {localFormat(next.endAt, "h:mm a")} Sydney time ·{" "}
            {next.location || "—"}
          </p>
          <p>
            Speaker:{" "}
            {next.speakerIds
              .map((id) => fixtures.people.find((p) => p.id === id)?.name)
              .join(", ") || "To be confirmed"}
          </p>
          <div className="hero-prep">
            <span className="eyebrow">SUGGESTED PREPARATION</span>
            <p>
              Readings are encouraged, not mandatory. No session-specific
              reading links were supplied.
            </p>
            {sessionAssignments(next.id)
              .filter((a) => a.required)
              .map((a) => (
                <Link key={a.resourceId} to={`/resource/${a.resourceId}`}>
                  <BookOpen size={16} />
                  {fixtures.resources.find((r) => r.id === a.resourceId)?.title}
                  <ArrowRight size={16} />
                </Link>
              ))}
          </div>
          <div className="between wrap">
            <Rsvp id={next.id} />
            <Link className="button light" to={`/session/${next.id}`}>
              Open session page <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      ) : (
        <Card>
          <h2>You’re all caught up</h2>
          <Link to="/schedule">Explore the schedule</Link>
        </Card>
      )}
      <div className="callout">
        <strong>Programme snapshot · 25 September 2026</strong>
        <p>
          13 sessions · 6–8 p.m. Sydney time · Zoom · cameras on · Chatham House
          Rule. This independent demo does not submit work to CIS.
        </p>
        <Link to="/programme">Read the complete fellowship briefing →</Link>
      </div>
      <div className="home-intro">
        <Card>
          <span className="eyebrow">START HERE</span>
          <h2>Liberty, responsibility and policy.</h2>
          <p className="muted">
            A selective, fully subsidised online programme examining competing
            ideas and contemporary policy.
          </p>
          <div className="row wrap">
            <Link className="button primary" to="/handbook">
              Explore the handbook <ArrowRight size={16} />
            </Link>
            <button onClick={() => setTour(true)}>Quick tour</button>
          </div>
        </Card>
        <section className="learning card">
          <GraduationCap size={26} />
          <h2>Ideas & policy</h2>
          <p>Explore independent research and the official programme.</p>
          <a href="https://www.cis.org.au/" target="_blank" rel="noreferrer">
            Explore CIS ↗
          </a>
          <a
            href="https://www.cis.org.au/events/liberty-society-student-programs/ls-fellowship-cohort-2026-program/"
            target="_blank"
            rel="noreferrer"
          >
            Official cohort programme ↗
          </a>
        </section>
      </div>
      {announcement && (
        <div className="announcement-strip">
          <div>
            <strong>{announcement.title}</strong>
            <p>{announcement.body}</p>
            <Link to="/announcements">All announcements →</Link>
          </div>
          <button
            aria-label="Dismiss announcement"
            className="icon-button"
            onClick={() =>
              update((s) => ({
                ...s,
                dismissedAnnouncementIds: [
                  ...s.dismissedAnnouncementIds,
                  announcement.id,
                ],
              }))
            }
          >
            <X size={18} />
          </button>
        </div>
      )}
      <div className="home-bottom">
        <section>
          <div className="between">
            <h2>Coming up</h2>
            <span className="muted">
              Every third Thursday, with a final 17 December session.
            </span>
            <Link to="/schedule">Full schedule →</Link>
          </div>
          <Card>
            {fixtures.sessions
              .filter((s) => new Date(s.endAt) >= now)
              .slice(0, 4)
              .map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
          </Card>
          {[
            ["This week", week],
            ["Next week", shiftDay(week, 7)],
          ]
            .filter(([, key]) => weekSessions(key).length > 0)
            .map(([label, key]) => (
              <details className="card week-group" open key={label}>
                <summary>
                  {label}
                  <span className="badge">{weekSessions(key).length}</span>
                  <ChevronDown size={16} />
                </summary>
                {weekSessions(key).map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </details>
            ))}
        </section>
        <aside>
          <Card>
            <div className="between">
              <h2>Outstanding prep</h2>
              <span className="count">{prep.length}</span>
            </div>
            <p className="muted">
              Readings are encouraged, not mandatory. Consult the official
              cohort programme for current materials.
            </p>
            {prep.slice(0, 5).map((a) => (
              <Link
                key={a.sessionId + a.resourceId}
                className="prep-link"
                to={`/session/${a.sessionId}`}
              >
                <BookOpen size={18} />
                <span>
                  <strong>{a.resource.title}</strong>
                  <small>
                    {localFormat(a.session.startAt, "MMM d")} ·{" "}
                    {a.resource.minutes === null
                      ? "—"
                      : `${a.resource.minutes} min`}
                  </small>
                </span>
              </Link>
            ))}
            {prep.length === 0 && <p>No outstanding preparation.</p>}
            <Link to="/readings">View all readings →</Link>
          </Card>
        </aside>
      </div>
      {tour && (
        <aside className="quick-tour" aria-label="Quick tour">
          <button
            className="icon-button"
            aria-label="Close quick tour"
            onClick={closeTour}
          >
            <X size={17} />
          </button>
          <span className="eyebrow">WELCOME TO THE HUB</span>
          <h3>Your next step is right here.</h3>
          <p>
            Find what’s happening, prepare for it, and meet the people learning
            alongside you.
          </p>
          <Link to="/schedule" onClick={closeTour}>
            Open schedule →
          </Link>
          <Link to="/people" onClick={closeTour}>
            Meet the cohort →
          </Link>
        </aside>
      )}
    </>
  );
}
