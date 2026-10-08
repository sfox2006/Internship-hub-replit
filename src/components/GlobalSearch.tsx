import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { searchEntities } from "../data/selectors";
import { useDemo } from "../data/demoStore";
export default function GlobalSearch() {
  const { state } = useDemo();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    setIndex(-1);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    function outside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);
  const results = searchEntities(debounced, state).slice(0, 8);
  return (
    <div className="global-search" ref={ref}>
      <Search size={19} />
      <input
        aria-label="Search the hub"
        role="combobox"
        aria-expanded={open && !!query.trim()}
        aria-controls="search-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={
          index >= 0 ? `search-result-${index}` : undefined
        }
        placeholder="Search sessions, readings, people…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setIndex(-1);
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndex((i) => Math.min(i + 1, results.length - 1));
            setOpen(true);
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndex((i) => Math.max(-1, i - 1));
          }
          if (e.key === "Enter") {
            e.preventDefault();
            navigate(
              index >= 0 && open
                ? results[index].url
                : `/search?q=${encodeURIComponent(query)}`,
            );
            setOpen(false);
          }
        }}
      />
      {open && query.trim() && (
        <div
          id="search-suggestions"
          className="search-dropdown"
          role="listbox"
          aria-label="Search suggestions"
        >
          {query !== debounced ? (
            <p role="status">Searching…</p>
          ) : results.length ? (
            results.map((r, i) => (
              <Link
                role="option"
                aria-selected={index === i}
                id={`search-result-${i}`}
                key={r.type + r.id}
                className={index === i ? "highlight" : ""}
                to={r.url}
                onClick={() => setOpen(false)}
              >
                <small>{r.type}</small>
                <strong>{r.title}</strong>
                <span>{r.description.slice(0, 90)}</span>
              </Link>
            ))
          ) : (
            <p>No results. Try another term.</p>
          )}
          <Link
            to={`/search?q=${encodeURIComponent(query)}`}
            onClick={() => setOpen(false)}
          >
            View all results →
          </Link>
        </div>
      )}
    </div>
  );
}
