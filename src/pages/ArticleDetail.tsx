import { Link, useParams } from "react-router-dom";
import { fixtures } from "../data/selectors";
import Card from "../components/Card";
import BookmarkButton from "../components/BookmarkButton";
import { Blocks } from "../components/GuideArticle";
import NotFound from "./NotFound";
export default function ArticleDetail() {
  const { slug } = useParams();
  const a = fixtures.articles.find((a) => a.slug === slug);
  if (!a) return <NotFound />;
  return (
    <>
      <Link className="breadcrumb" to="/how-things-work">
        How Things Work / {a.category}
      </Link>
      <div className="page-heading">
        <div>
          <h1>{a.title}</h1>
          <p>{a.summary}</p>
        </div>
        <BookmarkButton type="article" id={a.slug} title={a.title} />
      </div>
      <div className="detail-layout">
        <Card className="prose">
          <span className="badge gold">
            Demo excerpt — original document not supplied
          </span>
          <Blocks blocks={a.blocks} />
        </Card>
        <Card>
          <h2>Official programme guidance</h2>
          <a
            href="https://www.cis.org.au/events/liberty-society-student-programs/ls-fellowship-cohort-2026-program/"
            target="_blank"
            rel="noreferrer"
          >
            CIS cohort programme ↗
          </a>
          {a.contactPersonIds.map((id) => {
            const p = fixtures.people.find((p) => p.id === id)!;
            return (
              <div key={id}>
                <Link to={`/person/${id}`}>{p.name}</Link>
                <p>
                  <a href={`mailto:${p.email}`}>{p.email}</a>
                </p>
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
}
