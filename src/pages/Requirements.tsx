import { Link } from "react-router-dom";
import {
  fixtures,
  requirementProgress,
  requirementStatus,
} from "../data/selectors";
import { useDemo } from "../data/demoStore";
import { etFormat, referenceNow } from "../data/clock";
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
        <ProgressBar {...progress} label="requirements" />
        <p className="muted">
          This is a self-reported checklist. Reading completion and submissions
          do not change it automatically.
        </p>
      </Card>
      {["Plenary", "Evaluation", "Capstone"].map((category) => (
        <section key={category}>
          <h2>{category}</h2>
          {fixtures.requirements
            .filter((r) => r.category === category)
            .map((r) => {
              const status = requirementStatus(
                r.id,
                state.completedRequirementIds,
                etFormat(referenceNow(), "yyyy-MM-dd"),
              );
              return (
                <Card key={r.id}>
                  <div className="between">
                    <label className="check requirement-check">
                      <input
                        type="checkbox"
                        checked={state.completedRequirementIds.includes(r.id)}
                        onChange={() => toggle("completedRequirementIds", r.id)}
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
                    Due {r.dueDate ? etFormat(r.dueDate + "T12:00:00Z") : "—"}
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
                      Submission unavailable · original destination not supplied
                    </span>
                  )}
                </Card>
              );
            })}
        </section>
      ))}
    </div>
  );
}
