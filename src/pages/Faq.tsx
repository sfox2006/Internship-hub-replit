import cohortGuidance from "../../shared/cohortGuidance.json";
import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
const entries = cohortGuidance.faq;
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
          <a href="https://www.cis.org.au/" target="_blank" rel="noreferrer">
            Visit the official CIS website
          </a>
          . For actual program questions, use your real program contact.
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
            Fellowship FAQ <span className="badge">{filtered.length}</span>
          </summary>
          {filtered.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Answer · supplied programme information</th>
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
