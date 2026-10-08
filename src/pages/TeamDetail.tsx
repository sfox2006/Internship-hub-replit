import { Link, useParams } from "react-router-dom";
import { fixtures, personWithProfile } from "../data/selectors";
import { useDemo } from "../data/demoStore";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import BookmarkButton from "../components/BookmarkButton";
import NotFound from "./NotFound";
export default function TeamDetail() {
  const { id } = useParams();
  const { state } = useDemo();
  const team = fixtures.teams.find((t) => t.id === id);
  if (!team) return <NotFound />;
  const members = fixtures.people
    .filter((p) => team.memberIds.includes(p.id))
    .map((p) => personWithProfile(p, state));
  return (
    <>
      <Link className="breadcrumb" to="/teams">
        ← Who Works on What
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{team.policyAreaId}</span>
          <h1>{team.name}</h1>
          <p>{team.description}</p>
        </div>
        <BookmarkButton type="team" id={team.id} title={team.name} />
      </div>
      <h2>{members.length} members</h2>
      <div className="grid three">
        {members.map((p) => (
          <Card key={p.id}>
            <Avatar name={p.name} id={p.id} size="large" />
            <h2>
              <Link to={`/person/${p.id}`}>{p.name}</Link>
            </h2>
            <p>{p.title || p.placement || "—"}</p>
            {team.primaryContactId === p.id && (
              <span className="badge gold">Primary contact</span>
            )}
            <p>
              <a href={`mailto:${p.email}`}>{p.email}</a>
            </p>
            <Link to={`/person/${p.id}`}>View profile →</Link>
          </Card>
        ))}
      </div>
    </>
  );
}
