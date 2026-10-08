import { Link, useParams } from "react-router-dom";
import { fixtures, personWithProfile } from "../data/selectors";
import { useDemo } from "../data/demoStore";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import BookmarkButton from "../components/BookmarkButton";
import SessionRow from "../components/SessionRow";
import NotFound from "./NotFound";
export default function PersonDetail() {
  const { id } = useParams();
  const { state } = useDemo();
  const original = fixtures.people.find((p) => p.id === id);
  if (!original) return <NotFound />;
  const p = personWithProfile(original, state);
  const sessions = fixtures.sessions.filter((s) => s.speakerIds.includes(p.id));
  return (
    <>
      <Link className="breadcrumb" to="/people">
        ← Directory
      </Link>
      <div className="page-heading">
        <div className="row">
          <Avatar name={p.name} id={p.id} size="large" />
          <div>
            <h1>{p.name}</h1>
            <p>{p.title || p.placement || "—"}</p>
          </div>
        </div>
        <BookmarkButton type="person" id={p.id} title={p.name} />
      </div>
      <div className="detail-layout">
        <div className="stack">
          <Card>
            <h2>Biography</h2>
            <p>{p.bio}</p>
          </Card>
          <Card>
            <h2>
              Sessions they lead{" "}
              <span className="badge">{sessions.length}</span>
            </h2>
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
            {!sessions.length && (
              <p className="muted">No sessions in this fixture.</p>
            )}
          </Card>
        </div>
        <Card>
          <h2>Contact</h2>
          <p>
            {p.email ? (
              <a href={`mailto:${p.email}`}>{p.email}</a>
            ) : (
              <span className="muted">Contact details not supplied</span>
            )}
          </p>
          <dl>
            <dt>Location</dt>
            <dd>{p.location || "—"}</dd>
            <dt>School</dt>
            <dd>{p.school || "—"}</dd>
          </dl>
          {p.teamIds.map((id) => (
            <p key={id}>
              <Link to={`/team/${id}`}>
                {fixtures.teams.find((t) => t.id === id)?.name}
              </Link>
            </p>
          ))}
          {p.scholarProfileUrl && (
            <a href={p.scholarProfileUrl}>Scholar profile ↗</a>
          )}
          {p.linkedinUrl && (
            <p>
              <a href={p.linkedinUrl}>LinkedIn ↗</a>
            </p>
          )}
          {p.websiteUrl && (
            <p>
              <a href={p.websiteUrl}>Website ↗</a>
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
