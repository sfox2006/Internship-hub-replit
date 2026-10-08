import { NavLink, Link } from "react-router-dom";
import {
  Home,
  CalendarDays,
  ClipboardCheck,
  BookOpen,
  GraduationCap,
  Map,
  HelpCircle,
  Shield,
  Users,
  Megaphone,
  MessageCircle,
  Images,
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
    ],
  },
  {
    label: "Reference",
    items: [
      ["Readings & Materials", "/readings", BookOpen],
      ["Handbook", "/handbook", BookOpen],
      ["Capstone Guide", "/capstone-guide", GraduationCap],
      ["DC Culture Guide", "/dc-culture-guide", Map],
      ["FAQ", "/faq", HelpCircle],
      ["Emergency Procedures", "/emergency", Shield],
      ["Who Works on What", "/teams", Users],
    ],
  },
  {
    label: "Community",
    items: [
      ["Announcements", "/announcements", Megaphone],
      ["Intern Directory", "/people", Users],
      ["Discussion Board", "/discussions", MessageCircle],
      ["Photo Library", "/photos", Images],
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
  const name = `${state.profile.firstName} ${state.profile.lastName}`;
  return (
    <aside
      className={`sidebar ${open ? "open" : ""}`}
      aria-label="Main navigation"
    >
      <Link to="/" className="brand" onClick={onClose}>
        <span className="wordmark">CATO</span>
        <strong>Intern Hub</strong>
        <small>Educational and Talent Programs</small>
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
            <small>intern@example.com</small>
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
