import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Session } from "../../shared/types";
import { localFormat, mondayKey, referenceNow, shiftDay } from "../data/clock";
export default function CalendarGrid({
  sessions,
  view,
}: {
  sessions: Session[];
  view: string;
}) {
  const initial = mondayKey(referenceNow());
  const [anchor, setAnchor] = useState(initial);
  const length = view === "Week" ? 7 : 28;
  return (
    <div>
      <div className="between calendar-toolbar">
        <h2>
          {localFormat(anchor + "T12:00:00Z", "MMM d")} –{" "}
          {localFormat(
            shiftDay(anchor, length - 1) + "T12:00:00Z",
            "MMM d, yyyy",
          )}
        </h2>
        <div className="row">
          <button
            aria-label="Previous calendar range"
            onClick={() => setAnchor(shiftDay(anchor, -length))}
          >
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setAnchor(initial)}>Today</button>
          <button
            aria-label="Next calendar range"
            onClick={() => setAnchor(shiftDay(anchor, length))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="calendar-scroll">
        <div className="calendar-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div className="weekday" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length }, (_, i) => shiftDay(anchor, i)).map((day) => (
            <div
              key={day}
              className={`calendar-day ${day === localFormat(referenceNow(), "yyyy-MM-dd") ? "today" : ""}`}
            >
              <span>{day.slice(-2)}</span>
              {sessions
                .filter((s) => localFormat(s.startAt, "yyyy-MM-dd") === day)
                .map((s) => (
                  <Link
                    key={s.id}
                    title={s.title}
                    to={`/session/${s.id}`}
                    className="calendar-event"
                  >
                    <small>{localFormat(s.startAt, "h:mm a")}</small>
                    <span>{s.title}</span>
                  </Link>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
