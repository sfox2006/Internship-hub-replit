import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
const entries = [
  [
    "Where should I start?",
    "Explore the handbook demo excerpt, then review your upcoming schedule.",
  ],
  [
    "How do I mark preparation complete?",
    "Use the reading checkbox. Completion is shared between readings and session pages in this browser.",
  ],
  [
    "Does a submission update my checklist?",
    "No. Requirements are separately self-reported. Original submission destinations were not supplied.",
  ],
  [
    "Are my notes shared?",
    "No. Notes, profile changes, discussions, and signups stay in this browser.",
  ],
  [
    "Who can answer program questions?",
    "The example demo coordinator is Maya Ellis at maya@example.com. This is a synthetic contact.",
  ],
];
export default function Faq() {
  const [query, setQuery] = useState("");
  const filtered = entries.filter((e) =>
    e.join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">REFERENCE</span>
          <h1>FAQ</h1>
          <p>A good place to begin with a question.</p>
        </div>
      </div>
      <div className="callout">
        <strong>Need a little help?</strong>
        <p>
          Demo support: <a href="mailto:maya@example.com">maya@example.com</a>.
          For actual program questions, use your real program contact.
        </p>
        <Link to="/handbook">Open the handbook →</Link>
      </div>
      <Card>
        <label>
          Search FAQ
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions and answers"
          />
        </label>
      </Card>
      <Card>
        <details open>
          <summary>
            Intern FAQ <span className="badge">{filtered.length}</span>
          </summary>
          {filtered.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Answer · demo content</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(([q, a]) => (
                    <tr key={q}>
                      <th>{q}</th>
                      <td>{a}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No matching questions" />
          )}
        </details>
      </Card>
    </>
  );
}
