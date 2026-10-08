import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fixtures, sessionAssignments } from "../data/selectors";
import { etFormat } from "../data/clock";
import { useDemo } from "../data/demoStore";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import ResourceCard from "../components/ResourceCard";
import BookmarkButton from "../components/BookmarkButton";
import AssistanceCard from "../components/AssistanceCard";
import { Rsvp } from "./ThisWeek";
import NotFound from "./NotFound";
export default function SessionDetail() {
  const { id } = useParams();
  const session = fixtures.sessions.find((s) => s.id === id);
  const { state, update } = useDemo();
  const [note, setNote] = useState(state.privateNotesBySession[id!] || "");
  const [message, setMessage] = useState("");
  if (!session) return <NotFound />;
  const assignments = sessionAssignments(session.id);
  const speakers = fixtures.people.filter((p) =>
    session.speakerIds.includes(p.id),
  );
  const teams = fixtures.teams.filter((t) =>
    speakers.some((p) => p.teamIds.includes(t.id)),
  );
  return (
    <>
      <Link className="breadcrumb" to="/schedule">
        ← Schedule
      </Link>
      <div className="page-heading">
        <div>
          <div className="row">
            <span className="badge">{session.type}</span>
            <span className="badge">{session.policyAreaId || "—"}</span>
          </div>
          <h1>{session.title}</h1>
          <p>
            {etFormat(session.startAt, "EEEE, MMMM d, yyyy")} ·{" "}
            {etFormat(session.startAt, "h:mm a")}–
            {etFormat(session.endAt, "h:mm a")} ET · {session.location || "—"}
          </p>
        </div>
      </div>
      <div className="detail-layout">
        <div className="stack">
          <Card>
            <span className="eyebrow">YOUR SPEAKERS</span>
            {speakers.map((p) => (
              <Link className="speaker row" key={p.id} to={`/person/${p.id}`}>
                <Avatar name={p.name} id={p.id} />
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.title || "—"}</small>
                </span>
              </Link>
            ))}
            <h2>About this session</h2>
            <p>{session.description}</p>
          </Card>
          {[
            [true, "Entry Ticket"],
            [false, "Learn More (Optional)"],
          ].map(([required, title]) => (
            <Card key={String(title)}>
              <h2>{title}</h2>
              {assignments
                .filter((a) => a.required === required)
                .map((a) => (
                  <ResourceCard
                    key={a.resourceId}
                    resource={fixtures.resources.find(
                      (r) => r.id === a.resourceId,
                    )!}
                    required={a.required}
                    allowCompletion
                  />
                ))}
              {!assignments.some((a) => a.required === required) && (
                <p className="muted">No materials supplied for this section.</p>
              )}
            </Card>
          ))}
          <Card>
            <div className="between">
              <h2>Discussion</h2>
              <Link to={`/discussions?compose=1&session=${session.id}`}>
                Start a discussion →
              </Link>
            </div>
            {state.discussions
              .filter((d) => d.sessionId === session.id)
              .map((d) => (
                <div className="discussion-preview" key={d.id}>
                  <Link to="/discussions">{d.title}</Link>
                  <p>{d.body}</p>
                  <small>{d.replies.length} replies</small>
                </div>
              ))}
            {!state.discussions.some((d) => d.sessionId === session.id) && (
              <p>Bring a question to the conversation.</p>
            )}
          </Card>
        </div>
        <aside className="stack">
          <Card>
            <h2>Will you be there?</h2>
            <Rsvp id={session.id} />
            <a
              className="button full"
              href={`/api/sessions/${session.id}/calendar.ics`}
            >
              Add to calendar
            </a>
            {session.assistanceConfig && (
              <AssistanceCard
                config={session.assistanceConfig}
                entityKey={`session:${session.id}`}
              />
            )}
          </Card>
          <Card>
            <h2>Session facts</h2>
            <dl>
              <dt>Attendance</dt>
              <dd>
                {session.attendanceRequired
                  ? "Required"
                  : "Optional (fixture assumption)"}
              </dd>
              <dt>Reported length</dt>
              <dd>
                {session.reportedLengthMinutes === null
                  ? "—"
                  : `${session.reportedLengthMinutes} minutes`}
              </dd>
              <dt>Location</dt>
              <dd>{session.location || "—"}</dd>
            </dl>
            <div className="row">
              <BookmarkButton
                type="session"
                id={session.id}
                title={session.title}
              />
              Save this session
            </div>
          </Card>
          <Card>
            <h2>Private notes</h2>
            <p className="muted">Just for you, in this browser.</p>
            <label>
              Notes
              <textarea
                aria-label="Notes"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setMessage("");
                }}
                rows={6}
              />
            </label>
            <button
              className="primary"
              onClick={() => {
                const saved = update((s) => ({
                  ...s,
                  privateNotesBySession: {
                    ...s.privateNotesBySession,
                    [session.id]: note,
                  },
                }));
                setMessage(
                  saved
                    ? "Note saved."
                    : "Note kept in this session; browser save failed.",
                );
              }}
            >
              Save note
            </button>
            <p role="status">{message}</p>
          </Card>
          <Card>
            <h2>Who to ask</h2>
            <a href="mailto:maya@example.com">Maya Ellis · Demo coordinator</a>
            {teams.map((t) => (
              <p key={t.id}>
                <Link to={`/team/${t.id}`}>{t.name} →</Link>
              </p>
            ))}
          </Card>
        </aside>
      </div>
    </>
  );
}
