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
import { etFormat, mondayKey, referenceNow, shiftDay } from "../data/clock";
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
          <span className="eyebrow">YOUR WEEK AT THE HUB</span>
          <h1>Good morning, {state.profile.firstName}.</h1>
          <p>A little preparation. A lot of possibility.</p>
        </div>
        <span className="date-label">{etFormat(now, "EEEE, MMMM d")}</span>
      </div>
      {next ? (
        <section className="hero">
          <div className="between">
            <span className="eyebrow">UP NEXT · {next.type}</span>
            <BookmarkButton type="session" id={next.id} title={next.title} />
          </div>
          <h2>{next.title}</h2>
          <p>
            {etFormat(next.startAt, "EEEE, MMM d")} ·{" "}
            {etFormat(next.startAt, "h:mm a")}–{etFormat(next.endAt, "h:mm a")}{" "}
            ET · {next.location || "—"}
          </p>
          <p>
            With{" "}
            {next.speakerIds
              .map((id) => fixtures.people.find((p) => p.id === id)?.name)
              .join(", ")}
          </p>
          <div className="hero-prep">
            <span className="eyebrow">ENTRY TICKET</span>
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
      <div className="home-intro">
        <Card>
          <span className="eyebrow">START HERE</span>
          <h2>Find your footing this week.</h2>
          <p className="muted">
            Your handbook, helpful people, and the essentials for a good start.
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
          <h2>The Learning Hall</h2>
          <p>Keep learning between sessions.</p>
          <a href="https://www.cato.courses/" target="_blank" rel="noreferrer">
            Explore Cato Courses ↗
          </a>
          <a
            href="https://daily.cato.courses/"
            target="_blank"
            rel="noreferrer"
          >
            Your daily course ↗
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
            <Link to="/schedule">Full schedule →</Link>
          </div>
          {[
            ["This week", week],
            ["Next week", shiftDay(week, 7)],
          ].map(([label, key]) => (
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
            <p className="muted">A few things to read before you arrive.</p>
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
                    {etFormat(a.session.startAt, "MMM d")} ·{" "}
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
