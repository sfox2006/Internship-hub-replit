import { Link } from "react-router-dom";
import type { ContentBlock, Guide } from "../../shared/types";
import BookmarkButton from "./BookmarkButton";
export function Blocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {blocks.map((b, i) =>
        b.type === "table" ? (
          <div className="table-scroll" key={i}>
            <table>
              <thead>
                <tr>
                  {b.headers?.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows?.map((r, j) => (
                  <tr key={j}>
                    {r.map((c, k) => (
                      <td key={k}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : b.type === "heading" ? (
          <h3 key={i}>{b.text}</h3>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </>
  );
}
export default function GuideArticle({ guide: g }: { guide: Guide }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">REFERENCE · {g.subtitle}</span>
          <h1>{g.title}</h1>
          <p>Demo excerpt — original document not supplied</p>
        </div>
        <BookmarkButton type="guide" id={g.slug} title={g.title} />
      </div>
      <div className="callout">
        Original DOCX unavailable.{" "}
        <a download href="/demo-files/demo-document.docx">
          Download a clearly labeled demo DOCX
        </a>
        {g.slug === "dc-culture-guide" && (
          <p>
            Corrections: this sample is not current transit, restaurant, or
            official city advice.
          </p>
        )}
      </div>
      <div className="guide-layout">
        <aside className="card contents">
          <h2>Contents</h2>
          {g.sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.title}
            </a>
          ))}
          <hr />
          <Link to="/handbook">Handbook</Link>
          <Link to="/capstone-guide">Capstone Guide</Link>
          <Link to="/dc-culture-guide">DC Culture Guide</Link>
        </aside>
        <article className="card prose">
          {g.sections.map((s) => (
            <section id={s.id} key={s.id}>
              <h2>{s.title}</h2>
              <Blocks blocks={s.blocks} />
            </section>
          ))}
          {g.slug === "dc-culture-guide" && (
            <p>
              Consult official information:{" "}
              <a href="https://www.wmata.com/" target="_blank" rel="noreferrer">
                WMATA
              </a>{" "}
              ·{" "}
              <a
                href="https://washington.org/"
                target="_blank"
                rel="noreferrer"
              >
                Destination DC
              </a>
            </p>
          )}
        </article>
      </div>
    </>
  );
}
