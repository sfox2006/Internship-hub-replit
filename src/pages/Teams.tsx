import { useState } from "react";
import { Link } from "react-router-dom";
import { fixtures } from "../data/selectors";
import Card from "../components/Card";
import BookmarkButton from "../components/BookmarkButton";
import EmptyState from "../components/EmptyState";
export default function Teams() {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All policy areas");
  const teams = fixtures.teams.filter(
    (t) =>
      (t.name + " " + t.description + " " + t.tags.join(" "))
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (area === "All policy areas" || t.policyAreaId === area),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">REFERENCE</span>
          <h1>Who Works on What</h1>
          <p>Find an idea. Find your people.</p>
        </div>
      </div>
      <div className="callout">
        <strong>Looking for the floor plan?</strong>
        <p>
          Original floor-plan PDF not supplied. Office locations remain
          unavailable in this public demo.
        </p>
      </div>
      <Card>
        <div className="row wrap">
          <label className="grow">
            Search teams
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Team, topic, or keyword"
            />
          </label>
          <label>
            Policy area
            <select
              aria-label="Policy area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              {["All policy areas", ...fixtures.policyAreas].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>
      {[...new Set(teams.map((t) => t.policyAreaId))].map((a) => (
        <section key={a}>
          <h2>
            {a}{" "}
            <span className="badge">
              {teams.filter((t) => t.policyAreaId === a).length}
            </span>
          </h2>
          <div className="grid two">
            {teams
              .filter((t) => t.policyAreaId === a)
              .map((t) => (
                <Card key={t.id}>
                  <div className="between">
                    <h3>{t.name}</h3>
                    <BookmarkButton type="team" id={t.id} title={t.name} />
                  </div>
                  <p>{t.description}</p>
                  <p>
                    {t.tags.map((tag) => (
                      <span className="badge" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </p>
                  <p className="muted">
                    Ask:{" "}
                    {t.primaryContactId ? (
                      <Link to={`/person/${t.primaryContactId}`}>
                        {
                          fixtures.people.find(
                            (p) => p.id === t.primaryContactId,
                          )?.name
                        }
                      </Link>
                    ) : (
                      "—"
                    )}
                  </p>
                  <Link to={`/team/${t.id}`}>View team →</Link>
                </Card>
              ))}
          </div>
        </section>
      ))}
      {!teams.length && <EmptyState title="No matching teams" />}
    </>
  );
}
