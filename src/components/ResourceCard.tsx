import { useState } from "react";
import { Link } from "react-router-dom";
import type { Resource } from "../../shared/types";
import { useDemo } from "../data/demoStore";
import { etInput, readingStart, referenceNow } from "../data/clock";
import { fixtures } from "../data/selectors";
import BookmarkButton from "./BookmarkButton";
export default function ResourceCard({
  resource: r,
  required = false,
  allowCompletion = false,
}: {
  resource: Resource;
  required?: boolean;
  allowCompletion?: boolean;
}) {
  const { state, toggle } = useDemo();
  const [blocking, setBlocking] = useState(false);
  const [time, setTime] = useState(etInput(referenceNow()));
  const start = readingStart(time);
  const used = fixtures.sessionResources.filter((a) => a.resourceId === r.id);
  return (
    <article className="resource-card">
      <div className="between">
        <div>
          <div className="row wrap">
            <span className="badge">{r.type}</span>
            {required && <span className="badge gold">Required</span>}
            {state.completedResourceIds.includes(r.id) && (
              <span className="badge success">Done</span>
            )}
          </div>
          <h3>
            <Link to={`/resource/${r.id}`}>{r.title}</Link>
          </h3>
        </div>
        <BookmarkButton type="resource" id={r.id} title={r.title} />
      </div>
      <p className="metadata">
        {r.authors} · {r.minutes === null ? "—" : `${r.minutes} min`} ·{" "}
        {r.policyAreaId || "—"}
      </p>
      <p className="muted">{r.description}</p>
      <div className="row wrap">
        {(required || allowCompletion) && (
          <label className="check">
            <input
              type="checkbox"
              checked={state.completedResourceIds.includes(r.id)}
              onChange={() => toggle("completedResourceIds", r.id)}
            />
            Mark complete
          </label>
        )}
        <Link className="button small" to={`/resource/${r.id}`}>
          Open
        </Link>
        {r.localFileUrl && (
          <a download className="text-link" href={r.localFileUrl}>
            Download demo file
          </a>
        )}
        {r.minutes !== null && r.minutes > 0 && (
          <button
            className="text-button"
            aria-expanded={blocking}
            onClick={() => setBlocking(!blocking)}
          >
            Block reading time
          </button>
        )}
      </div>
      {blocking && (
        <div className="reading-block">
          <label>
            Start time (Eastern)
            <input
              type="datetime-local"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          {start ? (
            <a
              className="button"
              href={`/api/resources/${r.id}/reading-time.ics?start=${encodeURIComponent(start)}`}
            >
              Add {r.minutes} min block
            </a>
          ) : (
            <p role="alert">Choose a valid date and time.</p>
          )}
          <button onClick={() => setBlocking(false)}>Cancel</button>
        </div>
      )}
      {used.length > 0 && (
        <p className="used-in">
          Used in:{" "}
          {used.map((a, i) => (
            <span key={a.sessionId}>
              {i > 0 ? " · " : ""}
              <Link to={`/session/${a.sessionId}`}>
                {fixtures.sessions.find((s) => s.id === a.sessionId)?.title}
              </Link>
            </span>
          ))}
        </p>
      )}
    </article>
  );
}
