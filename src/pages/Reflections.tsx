import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fixtures } from "../data/selectors";
import { localFormat } from "../data/clock";
import guidance from "../../shared/cohortGuidance.json";
import Card from "../components/Card";
export default function Reflections() {
  const [params] = useSearchParams();
  const [sessionId, setSessionId] = useState(
    params.get("session") || fixtures.sessions[0].id,
  );
  const session =
    fixtures.sessions.find((s) => s.id === sessionId) || fixtures.sessions[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">THIS TERM</span>
          <h1>Written Reflections</h1>
          <p>Submit a 300-word reflection answering one session question.</p>
        </div>
      </div>
      <Card>
        <label>
          Choose a session
          <select
            aria-label="Reflection session"
            value={session.id}
            onChange={(e) => setSessionId(e.target.value)}
          >
            {fixtures.sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {localFormat(s.startAt)} · {s.title}
              </option>
            ))}
          </select>
        </label>
        <h2>{session.title}</h2>
        <p>
          <strong>Deadline:</strong>{" "}
          {session.reflectionDueDate
            ? localFormat(session.reflectionDueDate + "T12:00:00Z")
            : "To be confirmed"}{" "}
          · 11:59 p.m. Sydney time
        </p>
        {session.submissionQuestions?.length ? (
          <ol>
            {session.submissionQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        ) : (
          <p>{session.questionsStatus || "Questions to be confirmed."}</p>
        )}
        <Link to={`/session/${session.id}`}>Read the session materials →</Link>
      </Card>
      <Card>
        <h2>Submit your reflection</h2>
        <p>
          The fellowship’s Google Form collects submissions. Select the
          appropriate session in the form and submit your own reasoning.
        </p>
        <a
          className="button primary"
          href={guidance.submissionFormUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open fellowship submissions form ↗
        </a>
        <p className="muted">
          Submission status is managed by the external form. This hub cannot
          confirm a submission; update your{" "}
          <Link to="/requirements">completion checklist</Link> after submitting.
        </p>
        <details>
          <summary>Submit using the embedded form</summary>
          <iframe
            className="reflection-form"
            title="Fellowship written reflection submissions"
            src={guidance.submissionFormUrl.split("?")[0] + "?embedded=true"}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <p>If the form doesn’t load, use the link above.</p>
        </details>
      </Card>
    </>
  );
}
