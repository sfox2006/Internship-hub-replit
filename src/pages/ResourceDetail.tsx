import { Link, useParams } from "react-router-dom";
import { fixtures } from "../data/selectors";
import Card from "../components/Card";
import BookmarkButton from "../components/BookmarkButton";
import NotFound from "./NotFound";
export default function ResourceDetail() {
  const { id } = useParams();
  const r = fixtures.resources.find((r) => r.id === id);
  if (!r) return <NotFound />;
  return (
    <>
      <Link className="breadcrumb" to="/readings">
        ← Readings & Materials
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{r.type}</span>
          <h1>{r.title}</h1>
          <p>
            {r.authors} · {r.minutes === null ? "—" : `${r.minutes} minutes`}
          </p>
        </div>
        <BookmarkButton type="resource" id={r.id} title={r.title} />
      </div>
      <Card>
        <p>{r.description}</p>
        {r.externalUrl ? (
          <>
            <p>This resource opens on an external public website.</p>
            <a
              className="button primary"
              href={r.externalUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open original public link ↗
            </a>
          </>
        ) : r.previewKind === "unsupported" ? (
          <>
            <h2>This file type cannot be previewed in the browser</h2>
            <p>
              Clearly labeled demo document; the original file was not supplied.
            </p>
          </>
        ) : (
          <>
            <h2>Demo excerpt — original document not supplied</h2>
            <p>
              This synthetic reading file demonstrates local resource access. It
              does not reproduce the original cited text.
            </p>
          </>
        )}
        {r.localFileUrl && (
          <p>
            <a download className="button" href={r.localFileUrl}>
              Download file · demo asset
            </a>
          </p>
        )}
      </Card>
    </>
  );
}
