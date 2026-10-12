import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
const entries = [
  [
    "Who is eligible?",
    "People over 18 living in Australia or New Zealand: students, recent graduates and young professionals from any discipline. High-school students are ineligible. The fellowship’s upper age limit is not supplied.",
  ],
  [
    "What does fully subsidised mean?",
    "Donors fund participation. No stipend, salary, research grant, academic credit or CIS employment is established in the supplied source.",
  ],
  [
    "What must fellows complete?",
    "At least 10 of 13 sessions, required reflections and three oral reviews. The reported cohort instructions specify 300 words and 15-minute vivas; the general overview says 200–300 words and ten minutes.",
  ],
  [
    "Can fellows use AI?",
    "The reported policy permits AI provided the thoughts and answer remain the fellow’s own. Oral reviews test intellectual ownership.",
  ],
  [
    "Are readings mandatory?",
    "The supplied 2026 instructions describe readings as encouraged, not mandatory.",
  ],
  [
    "Are sessions recorded?",
    "No. Cameras remain on; the Chatham House Rule protects the attribution of comments.",
  ],
  [
    "Are 2027 applications open?",
    "The supplied source says not yet, with a non-binding expression of interest available. This status is not verified as current; an expression of interest is not an application.",
  ],
  [
    "Does this portal submit work to CIS?",
    "No. Completion, RSVP, notes, discussions and profile changes are stored only in this browser. Actual submission destinations and Zoom links were not supplied.",
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
