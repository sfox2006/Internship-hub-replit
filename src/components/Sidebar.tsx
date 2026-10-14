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
  UserRound,
  ShieldCheck,
} from "lucide-react";
import { useDemo } from "../data/demoStore";
import Avatar from "./Avatar";
import type { AccountIdentity, AccountRole } from "../auth/types";
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
      ["Discussion Board", "/discussions", MessageCircle],
    ],
  },
  {
    label: "Mine",
    items: [
      ["Account", "/account", UserRound],
      ["Saved", "/saved", Bookmark],
    ],
  },
] as const;
export default function Sidebar({
  open,
  onClose,
  role,
  identity,
  signOut,
}: {
  open: boolean;
  onClose: () => void;
  role: AccountRole;
  identity: AccountIdentity;
  signOut: () => void;
}) {
  const name = identity.name || identity.email || "Fellowship Hub member";
  const email = identity.email;
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
              </NavLink>
            ))}
          </details>
        ))}
        {role === "administrator" && (
          <NavLink
            to="/admin"
            onClick={onClose}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <ShieldCheck size={18} />
            Administrator
          </NavLink>
        )}
      </nav>
      <div className="sidebar-user">
        <Link to="/account" className="row" onClick={onClose}>
          <Avatar name={name} id="current-user" />
          <span>
            <strong>{name}</strong>
            <small>{email}</small>
          </span>
        </Link>
        <button
          className="text-button"
          onClick={signOut}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
