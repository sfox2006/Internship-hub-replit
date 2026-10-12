import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { fixtures, filterSessions } from "../data/selectors";
import { referenceNow, localFormat } from "../data/clock";
import FilterChips from "../components/FilterChips";
import Card from "../components/Card";
import SessionRow from "../components/SessionRow";
import CalendarGrid from "../components/CalendarGrid";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
export default function Schedule() {
  const [period, setPeriod] = useState("Upcoming");
  const [required, setRequired] = useState(false);
  const [type, setType] = useState("All types");
  const [area, setArea] = useState("All policy areas");
  const [view, setView] = useState("List");
  const [subscribe, setSubscribe] = useState(false);
  const [origin, setOrigin] = useState(window.location.origin);
  const [copy, setCopy] = useState("");
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => {
        if (c.appUrl) setOrigin(c.appUrl);
      })
      .catch(() => {});
  }, []);
  const sessions = filterSessions(
    { past: period === "Past", required, type, area },
    referenceNow(),
  );
  const months = [
    ...new Set(sessions.map((s) => localFormat(s.startAt, "MMMM yyyy"))),
  ];
  const feed = origin + "/api/calendar/demo/feed.ics";
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">THIS TERM</span>
          <h1>Schedule</h1>
          <p>Make room for good ideas.</p>
        </div>
        <button onClick={() => setSubscribe(true)}>
          <CalendarDays size={17} />
          Subscribe to calendar
        </button>
      </div>
      <Card className="filters">
        <div className="between wrap">
          <FilterChips
            label="Schedule period"
            options={["Upcoming", "Past"]}
            value={period}
            onChange={setPeriod}
          />
          <span className="muted">
            Programme minimum: attend 10 of 13 sessions
          </span>
        </div>
        <FilterChips
          label="Session type"
          options={[
            "All types",
            "Seminar",
            "Lecture",
            "Workshop",
            "Social",
            "Orientation",
            "Luncheon",
            "Other",
          ]}
          value={type}
          onChange={setType}
        />
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
      </Card>
      <div className="between wrap section-heading">
        <p className="muted">
          Showing <strong>{sessions.length}</strong> of{" "}
          {fixtures.sessions.length}
        </p>
        <FilterChips
          label="Schedule view"
          options={["List", "Month", "Week"]}
          value={view}
          onChange={setView}
        />
      </div>
      {sessions.length === 0 ? (
        <Card>
          <EmptyState title="No sessions match these filters" />
        </Card>
      ) : view === "List" ? (
        months.map((month) => (
          <section key={month}>
            <h2>{month}</h2>
            <Card>
              {sessions
                .filter((s) => localFormat(s.startAt, "MMMM yyyy") === month)
                .map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
            </Card>
          </section>
        ))
      ) : (
        <Card>
          <CalendarGrid key={view} sessions={sessions} view={view} />
        </Card>
      )}
      {subscribe && (
        <Modal
          title="Subscribe to calendar"
          onClose={() => setSubscribe(false)}
        >
          <p>
            This public demo feed contains all fixture sessions. It contains no
            private notes.
          </p>
          <label>
            Demo calendar feed
            <input readOnly value={feed} />
          </label>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(feed);
                setCopy("Copied");
              } catch {
                setCopy("Copy unavailable. Select and copy the URL above.");
              }
            }}
          >
            Copy
          </button>
          <p role="status">{copy}</p>
          <h3>Outlook</h3>
          <p>
            Choose Add calendar → Subscribe from web, then paste this feed URL.
          </p>
          <h3>Google Calendar</h3>
          <p>
            Under Other calendars, choose From URL and paste the feed URL.
            Calendar services require a published public URL.
          </p>
        </Modal>
      )}
    </>
  );
}
