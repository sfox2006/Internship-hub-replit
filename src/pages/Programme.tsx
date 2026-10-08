import { Link } from "react-router-dom";
import briefing from "../../shared/fellowshipBriefing.json";
import Card from "../components/Card";
const headings = [
  "What the fellowship involves",
  "Intellectual orientation",
  "Eligibility",
  "Cost and what “fully subsidised” means",
  "Workload and graduation requirements",
  "The viva voce and use of AI",
  "Participation rules",
  "The published 2026 program",
  "Benefits after completion",
  "Relationship to the Liberty & Society Conference",
  "History and alumni",
  "Applications",
];
export default function Programme() {
  const lines = briefing.text.split("\n");
  const sections: { title: string; lines: string[] }[] = [
    { title: "Overview", lines: [] },
  ];
  for (const line of lines) {
    if (headings.includes(line)) {
      sections.push({ title: line, lines: [] });
    } else sections[sections.length - 1].lines.push(line);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CENTRE FOR INDEPENDENT STUDIES</span>
          <h1>Liberty & Society Student Fellowship</h1>
          <p>
            Independent policy inquiry, intellectual freedom and open debate.
          </p>
        </div>
      </div>
      <div className="callout">
        <strong>
          Supplied programme briefing · schedule reported 25 September 2026
        </strong>
        <p>
          This page preserves the substantive source information, including
          uncertainties. Current programme and application arrangements require
          confirmation with CIS. This is an independent adaptation.
        </p>
        <a
          href="https://www.cis.org.au/events/liberty-society-student-programs/ls-fellowship-cohort-2026-program/"
          target="_blank"
          rel="noreferrer"
        >
          Official cohort programme ↗
        </a>{" "}
        · <Link to="/schedule">View schedule</Link>
      </div>
      <div className="guide-layout">
        <aside className="card contents">
          <h2>Contents</h2>
          {sections.map((s, i) => (
            <a href={`#briefing-${i}`} key={s.title}>
              {s.title}
            </a>
          ))}
        </aside>
        <article className="card prose">
          {sections.map((s, i) => (
            <section id={`briefing-${i}`} key={s.title}>
              <h2>{s.title}</h2>
              {s.lines
                .filter((l) => l.trim() && !l.includes("\t"))
                .map((l, j) =>
                  l.startsWith("- ") ? (
                    <p className="briefing-bullet" key={j}>
                      • {l.slice(2)}
                    </p>
                  ) : (
                    <p key={j}>{l}</p>
                  ),
                )}
              {s.lines.some((l) => l.includes("\t")) && (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {["Date", "Speaker", "Subject"].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.lines
                        .filter(
                          (l) => l.includes("\t") && !l.startsWith("Date\t"),
                        )
                        .map((l) => (
                          <tr key={l}>
                            {l.split("\t").map((c, j) => (
                              <td key={j}>{c}</td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </article>
      </div>
    </>
  );
}
