import { Link } from "react-router-dom";
import { useDemo } from "../data/demoStore";
import { fixtures, personWithProfile } from "../data/selectors";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import BookmarkButton from "../components/BookmarkButton";
export default function Saved() {
  const { state } = useDemo();
  const entities = [
    ...fixtures.sessions.map((s) => ({
      type: "session",
      id: s.id,
      title: s.title,
      meta: s.type,
      url: `/session/${s.id}`,
    })),
    ...fixtures.resources.map((r) => ({
      type: "resource",
      id: r.id,
      title: r.title,
      meta: r.type,
      url: `/resource/${r.id}`,
    })),
    ...fixtures.teams.map((t) => ({
      type: "team",
      id: t.id,
      title: t.name,
      meta: t.policyAreaId,
      url: `/team/${t.id}`,
    })),
    ...fixtures.people
      .map((p) => personWithProfile(p, state))
      .map((p) => ({
        type: "person",
        id: p.id,
        title: p.name,
        meta: p.title || p.school || "—",
        url: `/person/${p.id}`,
      })),
    ...fixtures.guides.map((g) => ({
      type: "guide",
      id: g.slug,
      title: g.title,
      meta: g.subtitle,
      url: `/${g.slug}`,
    })),
    ...fixtures.articles.map((a) => ({
      type: "article",
      id: a.slug,
      title: a.title,
      meta: a.category,
      url: `/article/${a.slug}`,
    })),
  ];
  const saved = entities.filter((e) =>
    state.bookmarks.some((b) => b.entityType === e.type && b.entityId === e.id),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MINE</span>
          <h1>Saved</h1>
          <p>Keep the useful things close.</p>
        </div>
      </div>
      {!saved.length ? (
        <Card>
          <EmptyState title="Your saved collection starts here">
            <p>
              Use the bookmark icon on sessions, readings, people, teams, and
              guides.
            </p>
            <div className="row center">
              <Link className="button primary" to="/schedule">
                Explore schedule
              </Link>
              <Link className="button" to="/readings">
                Browse readings
              </Link>
            </div>
          </EmptyState>
        </Card>
      ) : (
        [
          ["Sessions", ["session"]],
          ["Readings", ["resource"]],
          ["Teams", ["team"]],
          ["People", ["person"]],
          ["Guides/Articles", ["guide", "article"]],
        ].map(([label, types]) => {
          const group = saved.filter((e) =>
            (types as string[]).includes(e.type),
          );
          return group.length ? (
            <section key={String(label)}>
              <h2>
                {String(label)} <span className="badge">{group.length}</span>
              </h2>
              <Card>
                {group.map((e) => (
                  <div className="saved-row between" key={e.type + e.id}>
                    <div>
                      <Link to={e.url}>
                        <strong>{e.title}</strong>
                      </Link>
                      <p className="metadata">{e.meta}</p>
                    </div>
                    <BookmarkButton type={e.type} id={e.id} title={e.title} />
                  </div>
                ))}
              </Card>
            </section>
          ) : null;
        })
      )}
    </>
  );
}
