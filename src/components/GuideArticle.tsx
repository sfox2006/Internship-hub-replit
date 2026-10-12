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
          <span className="eyebrow">LIBERTY & SOCIETY · {g.subtitle}</span>
          <h1>{g.title}</h1>
          <p>Adapted from the supplied programme briefing.</p>
        </div>
        <BookmarkButton type="guide" id={g.slug} title={g.title} />
      </div>
      <div className="callout">
        Reported guidance, not a live CIS service.{" "}
        <Link to="/programme">
          Read the full source briefing and qualifications →
        </Link>
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
          <Link to="/handbook">Fellowship Handbook</Link>
          <Link to="/reflection-guide">Reflection & Viva Guide</Link>
          <Link to="/applications">Application Information</Link>
        </aside>
        <article className="card prose">
          {g.sections.map((s) => (
            <section id={s.id} key={s.id}>
              <h2>{s.title}</h2>
              <Blocks blocks={s.blocks} />
            </section>
          ))}
        </article>
      </div>
    </>
  );
}
