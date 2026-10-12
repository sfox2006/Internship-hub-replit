import { useState } from "react";
import { Link } from "react-router-dom";
import { fixtures, personWithProfile } from "../data/selectors";
import { useDemo } from "../data/demoStore";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import FilterChips from "../components/FilterChips";
import BookmarkButton from "../components/BookmarkButton";
import EmptyState from "../components/EmptyState";
export default function People() {
  const { state } = useDemo();
  const [tab, setTab] = useState("Fellows");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const all = fixtures.people.map((p) => personWithProfile(p, state));
  const people = all.filter(
    (p) =>
      p.kind === (tab === "Fellows" ? "intern" : "staff") &&
      (p.name + " " + p.school + " " + p.placement)
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">COMMUNITY</span>
          <h1>Fellow Directory</h1>
          <p>Your cohort, your colleagues, your connections.</p>
        </div>
      </div>
      <Card>
        <div className="between wrap">
          <FilterChips
            label="Directory"
            options={["Fellows", "Speakers"]}
            value={tab}
            onChange={setTab}
          />
          <span className="muted">
            {all.filter((p) => p.kind === "intern").length} demo fellows ·{" "}
            {all.filter((p) => p.kind === "staff").length} reported speakers
          </span>
        </div>
        <label>
          Search people
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, school, or placement"
          />
        </label>
      </Card>
      <h2>
        {fixtures.term.name} <span className="badge">{people.length}</span>
      </h2>
      <div className="grid three">
        {people.map((p) => (
          <Card key={p.id}>
            <div className="between">
              <Avatar name={p.name} id={p.id} size="large" />
              <BookmarkButton type="person" id={p.id} title={p.name} />
            </div>
            <h2>
              <Link to={`/person/${p.id}`}>{p.name}</Link>
            </h2>
            <p className="metadata">{p.school || p.title || "—"}</p>
            <p className="muted">
              {p.placement || "—"} ·{" "}
              {p.termId ? fixtures.term.name : "Speakers"}
            </p>
            <p className={expanded.includes(p.id) ? "" : "clamp"}>{p.bio}</p>
            <button
              className="text-button"
              aria-expanded={expanded.includes(p.id)}
              onClick={() =>
                setExpanded((x) =>
                  x.includes(p.id) ? x.filter((i) => i !== p.id) : [...x, p.id],
                )
              }
            >
              {expanded.includes(p.id) ? "Show less" : "Read full bio"}
            </button>
            <p>
              {p.email ? (
                <a href={`mailto:${p.email}`}>{p.email}</a>
              ) : (
                <span className="muted">Contact details not supplied</span>
              )}
            </p>
            {p.linkedinUrl && (
              <a href={p.linkedinUrl} target="_blank" rel="noreferrer">
                LinkedIn ↗{" "}
              </a>
            )}
            {p.websiteUrl && (
              <a href={p.websiteUrl} target="_blank" rel="noreferrer">
                Website ↗
              </a>
            )}
          </Card>
        ))}
      </div>
      {!people.length && <EmptyState title="No matching people" />}
    </>
  );
}
