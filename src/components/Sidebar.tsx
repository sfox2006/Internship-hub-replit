import { useMessaging } from "../data/messaging";
import BrandMark from "./BrandMark";
import { NavLink, Link } from "react-router-dom";
import {
  Home,
  CalendarDays,
  ClipboardCheck,
  BookOpen,
  GraduationCap,
  HelpCircle,
  Users,
  Megaphone,
  MessageCircle,
  Bookmark,
  LogOut,
} from "lucide-react";
import { useDemo } from "../data/demoStore";
import Avatar from "./Avatar";
const groups = [
  {
    label: "This term",
    items: [
      ["This Week", "/", Home],
      ["Schedule", "/schedule", CalendarDays],
      ["Requirements", "/requirements", ClipboardCheck],
      ["Written Reflections", "/reflections", BookOpen],
    ],
  },
  {
    label: "Reference",
    items: [
      ["Readings & Materials", "/readings", BookOpen],
      ["Programme Briefing", "/programme", BookOpen],
      ["Handbook", "/handbook", BookOpen],
      ["Reflection & Viva Guide", "/reflection-guide", GraduationCap],
      ["FAQ", "/faq", HelpCircle],
    ],
  },
  {
    label: "Community",
    items: [
      ["Announcements", "/announcements", Megaphone],
      ["Fellow Directory", "/people", Users],
      ["Messages", "/messages", MessageCircle],
      ["Discussion Board", "/discussions", MessageCircle],
    ],
  },
  { label: "Mine", items: [["Saved", "/saved", Bookmark]] },
] as const;
export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { state, update } = useDemo();
  const { conversations } = useMessaging();
  const unread = conversations.reduce((n,c) => n+c.unread,0);
  const name = `${state.profile.firstName} ${state.profile.lastName}`;
  return (
    <aside
      className={`sidebar ${open ? "open" : ""}`}
      aria-label="Main navigation"
    >
      <Link to="/" className="brand" onClick={onClose}>
        <BrandMark />
        <strong>Fellowship Hub</strong>
        <small>Centre for Independent Studies</small>
      </Link>
      <nav>
        {groups.map((g) => (
          <details open key={g.label}>
            <summary>{g.label}</summary>
            {g.items.map(([label, url, Icon]) => (
              <NavLink
                key={url}
                to={url}
                end={url === "/"}
                onClick={onClose}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                <Icon size={18} />
                {label}
                {url === "/messages" && unread > 0 && <span className="unread-badge">{unread}</span>}
              </NavLink>
            ))}
          </details>
        ))}
      </nav>
      <div className="sidebar-user">
        <Link to="/profile" className="row" onClick={onClose}>
          <Avatar name={name} id="demo" />
          <span>
            <strong>{name}</strong>
            <small>fellow@example.com</small>
          </span>
        </Link>
        <button
          className="text-button"
          onClick={() => update((s) => ({ ...s, demoSignedIn: false }))}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
