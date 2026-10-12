import { Link } from "react-router-dom";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import type { Session } from "../../shared/types";
import { resourceCounts, fixtures, isPast } from "../data/selectors";
import { localFormat, referenceNow } from "../data/clock";
import { useDemo } from "../data/demoStore";
import BookmarkButton from "./BookmarkButton";
export default function SessionRow({ session: s }: { session: Session }) {
  const { state } = useDemo();
  const count = resourceCounts(s.id);
  return (
    <div className="session-row">
      <div className="date-tile">
        <small>{localFormat(s.startAt, "MMM")}</small>
        <strong>{localFormat(s.startAt, "d")}</strong>
        <small>{localFormat(s.startAt, "EEE")}</small>
      </div>
      <div className="grow">
        <div className="row wrap">
          <Link className="session-title" to={`/session/${s.id}`}>
            {s.title}
          </Link>
          <span className="badge">{s.type}</span>
          {isPast(s, referenceNow()) && (
            <span className="badge success">Completed</span>
          )}
          {state.rsvpBySession[s.id] === "going" && (
            <span className="badge success">Going</span>
          )}
          {s.attendanceRequired && <span className="badge">Required</span>}
        </div>
        <p className="metadata">
          <Clock size={14} />
          {localFormat(s.startAt, "h:mm a")}–{localFormat(s.endAt, "h:mm a")}{" "}
          Sydney time <MapPin size={14} />
          {s.location || "—"} ·{" "}
          {s.speakerIds
            .map((id) => fixtures.people.find((p) => p.id === id)?.name)
            .join(", ")}
        </p>
        <small className="muted">
          {count.required} required · {count.optional} optional readings
        </small>
      </div>
      <div className="row">
        {!isPast(s, referenceNow()) && (
          <a
            className="icon-button"
            aria-label={`Download calendar for ${s.title}`}
            href={`/api/sessions/${s.id}/calendar.ics`}
          >
            <CalendarDays size={18} />
          </a>
        )}
        <BookmarkButton type="session" id={s.id} title={s.title} />
      </div>
    </div>
  );
}
