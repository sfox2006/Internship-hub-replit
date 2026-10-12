import { Link } from "react-router-dom";
import {
  fixtures,
  requirementProgress,
  requirementStatus,
} from "../data/selectors";
import { useDemo } from "../data/demoStore";
import { localFormat, referenceNow } from "../data/clock";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";
export default function Requirements() {
  const { state, toggle } = useDemo();
  const progress = requirementProgress(state.completedRequirementIds);
  return (
    <div className="narrow">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THIS TERM</span>
          <h1>Requirements</h1>
          <p>Small steps toward a meaningful term.</p>
        </div>
      </div>
      <Card>
        <ProgressBar {...progress} label="reflections and reviews" />
        <p className="muted">
          This is a self-reported checklist. Reading completion and submissions
          do not change it automatically.
        </p>
      </Card>
      <Card>
        <h2>Attendance · minimum 10 of 13</h2>
        <p>
          {state.attendedSessionIds.length} of 13 sessions recorded attended in
          this browser. RSVP is separate from attendance. This is not an
          official completion record.
        </p>
        <p className="muted">
          Start-of-programme fellows may miss three sessions; conference
          entrants reportedly only two. Additional absences require a medical
          certificate. Confirm your entry-specific allowance with CIS.
        </p>
        {fixtures.sessions.map((session) => (
          <label className="check" key={session.id}>
            <input
              type="checkbox"
              checked={state.attendedSessionIds.includes(session.id)}
              onChange={() => toggle("attendedSessionIds", session.id)}
            />
            {localFormat(session.startAt)} · {session.title}
          </label>
        ))}
      </Card>
      {[...new Set(fixtures.requirements.map((r) => r.category))].map(
        (category) => (
          <section key={category}>
            <h2>{category}</h2>
            {fixtures.requirements
              .filter((r) => r.category === category)
              .map((r) => {
                const status = requirementStatus(
                  r.id,
                  state.completedRequirementIds,
                  localFormat(referenceNow(), "yyyy-MM-dd"),
                );
                return (
                  <Card key={r.id}>
                    <div className="between">
                      <label className="check requirement-check">
                        <input
                          type="checkbox"
                          checked={state.completedRequirementIds.includes(r.id)}
                          onChange={() =>
                            toggle("completedRequirementIds", r.id)
                          }
                        />
                        <strong>{r.title}</strong>
                      </label>
                      <span
                        className={`badge ${status === "Done" ? "success" : status === "Overdue" ? "danger" : ""}`}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="metadata">
                      Due{" "}
                      {r.dueDate ? localFormat(r.dueDate + "T12:00:00Z") : "—"}
                    </p>
                    <p>{r.description}</p>
                    {r.sessionId && (
                      <p>
                        <Link to={`/session/${r.sessionId}`}>
                          Related session →
                        </Link>
                      </p>
                    )}
                    {r.submissionUrl ? (
                      <a href={r.submissionUrl}>Submit ↗</a>
                    ) : (
                      <span className="muted">
                        Submission unavailable · original destination not
                        supplied
                      </span>
                    )}
                  </Card>
                );
              })}
          </section>
        ),
      )}
    </div>
  );
}
