import { useState } from "react";
import { fixtures, requiredIds, readingProgress } from "../data/selectors";
import { useDemo } from "../data/demoStore";
import Card from "../components/Card";
import FilterChips from "../components/FilterChips";
import ProgressBar from "../components/ProgressBar";
import ResourceCard from "../components/ResourceCard";
import EmptyState from "../components/EmptyState";
export default function Readings() {
  const { state } = useDemo();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All types");
  const [area, setArea] = useState("All policy areas");
  const [required, setRequired] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const ids = requiredIds();
  const resources = fixtures.resources.filter(
    (r) =>
      (r.title + " " + r.authors + " " + r.description)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (type === "All types" || r.type === type) &&
      (area === "All policy areas" || r.policyAreaId === area) &&
      (!required || ids.includes(r.id)) &&
      (!incomplete || !state.completedResourceIds.includes(r.id)),
  );
  const groups = fixtures.sessions
    .slice()
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .map((s) => ({
      id: s.id,
      title: s.title,
      resources: resources.filter((r) =>
        fixtures.sessionResources.some(
          (a) => a.sessionId === s.id && a.resourceId === r.id,
        ),
      ),
    }));
  groups.push({
    id: "general",
    title: "General / not tied to a session",
    resources: resources.filter(
      (r) => !fixtures.sessionResources.some((a) => a.resourceId === r.id),
    ),
  });
  const nonempty = groups.filter((g) => g.resources.length);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">REFERENCE</span>
          <h1>Readings & Materials</h1>
          <p>The ideas behind the conversation.</p>
        </div>
      </div>
      <Card>
        <p>
          Readings are encouraged, not mandatory. No original reading
          assignments were supplied; use the official programme links below.
        </p>
        <p>
          Readings are encouraged, not mandatory. No original reading
          assignments were supplied; consult the official cohort programme.
        </p>
      </Card>
      <Card className="filters">
        <label>
          Search readings
          <input
            placeholder="Title, author, or description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <FilterChips
          label="Resource type"
          options={[
            "All types",
            "Reading",
            "Deck",
            "Recording",
            "Video",
            "Course",
            "Guide",
            "File",
            "Link",
          ]}
          value={type}
          onChange={setType}
        />
        <div className="row wrap">
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
          <label className="check">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
            />
            Required only
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={incomplete}
              onChange={(e) => setIncomplete(e.target.checked)}
            />
            Show incomplete only
          </label>
        </div>
      </Card>
      <p className="muted">
        {resources.length} resources in {nonempty.length} groups
      </p>
      {nonempty.map((g) => (
        <Card key={g.id}>
          <div className="between wrap">
            <h2>{g.title}</h2>
            <small>
              {
                g.resources.filter(
                  (r) =>
                    ids.includes(r.id) &&
                    state.completedResourceIds.includes(r.id),
                ).length
              }{" "}
              / {g.resources.filter((r) => ids.includes(r.id)).length} required
              complete
            </small>
          </div>
          {g.resources.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              required={ids.includes(r.id)}
            />
          ))}
        </Card>
      ))}
      {!nonempty.length && (
        <EmptyState title="No readings match these filters" />
      )}
    </>
  );
}
