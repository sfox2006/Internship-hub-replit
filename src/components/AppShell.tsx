import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import GlobalSearch from "./GlobalSearch";
import Avatar from "./Avatar";
import { useDemo } from "../data/demoStore";
export default function AppShell({ children }: { children: ReactNode }) {
  const { state, error } = useDemo();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, []);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      {open && (
        <button
          aria-label="Close navigation"
          className="drawer-backdrop"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <GlobalSearch />
          <Link aria-label="Your profile" to="/profile">
            <Avatar
              name={`${state.profile.firstName} ${state.profile.lastName}`}
              id="demo"
            />
          </Link>
        </header>
        <div className="demo-notice">
          Demo · changes are stored in this browser <span>2026 Fellowship</span>
        </div>
        {error && (
          <div className="error storage-error" role="alert">
            {error}
          </div>
        )}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer>
          Independent CIS fellowship adaptation · Browser-local demo · Not an
          official CIS portal
        </footer>
      </div>
    </>
  );
}
