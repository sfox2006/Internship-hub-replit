import { useState } from "react";
import { Link } from "react-router-dom";
import { fixtures } from "../data/selectors";
import Card from "../components/Card";
import BookmarkButton from "../components/BookmarkButton";
import FilterChips from "../components/FilterChips";
import EmptyState from "../components/EmptyState";
export default function HowThingsWork() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const articles = fixtures.articles.filter(
    (a) =>
      (category === "All" || a.category === category) &&
      (a.title + " " + a.summary + " " + a.tags.join(" "))
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">REFERENCE</span>
          <h1>How Things Work</h1>
          <p>Find your way through the everyday details.</p>
        </div>
      </div>
      <Card>
        <label>
          Search articles
          <input value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <FilterChips
          label="Article category"
          options={[
            "All",
            "Handbook",
            "FAQ",
            "Guide",
            "Glossary",
            "Escalation",
          ]}
          value={category}
          onChange={setCategory}
        />
      </Card>
      <p>{articles.length} articles</p>
      <div className="grid two">
        {articles.map((a) => (
          <Card key={a.slug}>
            <div className="between">
              <span className="badge">{a.category}</span>
              <BookmarkButton type="article" id={a.slug} title={a.title} />
            </div>
            <h2>
              <Link to={`/article/${a.slug}`}>{a.title}</Link>
            </h2>
            <p>{a.summary}</p>
            <small>{a.tags.join(" · ")}</small>
          </Card>
        ))}
      </div>
      {!articles.length && <EmptyState title="No matching articles" />}
    </>
  );
}
