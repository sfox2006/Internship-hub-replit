import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchEntities } from "../data/selectors";
import { useDemo } from "../data/demoStore";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
export default function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const { state } = useDemo();
  const [category, setCategory] = useState("All");
  const results = searchEntities(q, state);
  const categories = [
    "Sessions",
    "Readings",
    "Guides/Articles",
    "Teams",
    "People",
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">EXPLORE THE HUB</span>
          <h1>Search</h1>
          <p>
            {results.length} results for “{q}”
          </p>
        </div>
      </div>
      <div className="filter-row" role="group" aria-label="Search category">
        {["All", ...categories].map((c) => (
          <button
            className={`chip ${category === c ? "selected" : ""}`}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            key={c}
          >
            {c}{" "}
            <span>
              {c === "All"
                ? results.length
                : results.filter((r) => r.type === c).length}
            </span>
          </button>
        ))}
      </div>
      {categories
        .filter((c) => category === "All" || category === c)
        .map((c) => {
          const group = results.filter((r) => r.type === c);
          return group.length ? (
            <section key={c}>
              <h2>
                {c} <span className="badge">{group.length}</span>
              </h2>
              <Card>
                {group.map((r) => (
                  <div className="saved-row" key={r.id}>
                    <Link to={r.url}>
                      <strong>{r.title}</strong>
                    </Link>
                    <p className="muted">{r.description.slice(0, 180)}</p>
                  </div>
                ))}
              </Card>
            </section>
          ) : null;
        })}
      {!results.length && (
        <Card>
          <EmptyState title="No results found">
            <p>Try a session title, topic, or person’s name.</p>
          </EmptyState>
        </Card>
      )}
    </>
  );
}
