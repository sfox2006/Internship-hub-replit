import { useCallback, useEffect, useState } from "react";
import Card from "../components/Card";
import type { Account } from "../auth/types";

type AdminStatus = {
  authorized: true;
  userId: string;
  role: "administrator";
};
type PreviewRow = {
  line: number;
  email: string;
  name: string;
  classification: "new" | "existing" | "duplicate" | "invalid";
  message: string;
};
type Preview = {
  rows: PreviewRow[];
  errors: string[];
  counts: { new: number; existing: number; duplicates: number; invalid: number };
};
type Enrollment = {
  id: string;
  email: string;
  name: string;
  status: "approved" | "joined" | "suspended";
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  joinedAt: string | null;
  statusChangedAt: string;
};
type JoinInfo = { url: string; instructions: string };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
  });
  const result = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;
  if (!response.ok)
    throw new Error(result.error || "The administrator request failed.");
  return result;
}

function displayDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function AdminPage({
  account,
  signOut,
}: {
  account: Account;
  signOut: () => void;
}) {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [source, setSource] = useState<"emails" | "csv">("emails");
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [entries, setEntries] = useState<Enrollment[]>([]);
  const [search, setSearch] = useState("");
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const loadRoster = useCallback(async (query = "") => {
    const result = await requestJson<{ entries: Enrollment[] }>(
      `/api/admin/enrollments?q=${encodeURIComponent(query)}`,
    );
    setEntries(result.entries);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/admin", {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      }).then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 403
              ? "Administrator access is required."
              : "Administrator status is unavailable.",
          );
        return (await response.json()) as AdminStatus;
      }),
      requestJson<{ url: string; instructions: string }>(
        "/api/admin/enrollments/join-info",
      ),
      requestJson<{ entries: Enrollment[] }>("/api/admin/enrollments"),
    ])
      .then(([adminStatus, info, roster]) => {
        if (controller.signal.aborted) return;
        setStatus(adminStatus);
        setJoinInfo(info);
        setEntries(roster.entries);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Administrator status is unavailable.",
          );
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadRoster(search).catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Roster search failed.",
        ),
      );
    }, 220);
    return () => window.clearTimeout(timer);
  }, [loadRoster, search]);

  async function reviewImport() {
    setError("");
    setNotice("");
    setPreview(null);
    setBusy(true);
    try {
      const result = await requestJson<Preview>(
        "/api/admin/enrollments/preview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, format: source }),
        },
      );
      setPreview(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Preview failed.");
    } finally {
      setBusy(false);
    }
  }

  async function approveImport() {
    if (!preview || preview.counts.new < 1) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await requestJson<{
        approvedCount: number;
        skippedCount: number;
      }>("/api/admin/enrollments/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, format: source }),
      });
      setNotice(
        `${result.approvedCount} address${result.approvedCount === 1 ? "" : "es"} approved as normal members. No email was sent.`,
      );
      setPreview(null);
      await loadRoster(search);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Approval could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(entry: Enrollment) {
    const nextStatus = entry.status === "suspended" ? "approved" : "suspended";
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await requestJson(`/api/admin/enrollments/${entry.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      setNotice(
        nextStatus === "suspended"
          ? `Access suspended for ${entry.email}.`
          : `Access reactivated for ${entry.email}.`,
      );
      await loadRoster(search);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Enrollment status could not be changed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label} copied.`);
      setError("");
    } catch {
      setError("Clipboard access is unavailable. Select and copy the text instead.");
    }
  }

  async function loadCsv(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > 256 * 1024) {
      setError("The CSV must be 256 KB or smaller.");
      return;
    }
    try {
      setInput(await file.text());
      setFileName(file.name);
      setSource("csv");
      setPreview(null);
    } catch {
      setError("The selected CSV could not be read.");
    }
  }

  return (
    <div className="narrow enrollment-admin">
      <div className="page-heading">
        <div>
          <span className="eyebrow">RESTRICTED</span>
          <h1>Administrator</h1>
          <p>Manage approved email enrollment for the Fellowship Hub.</p>
        </div>
        <button className="button" type="button" onClick={signOut}>
          Sign out
        </button>
      </div>

      <Card>
        {error && <p role="alert" className="error">{error}</p>}
        {notice && <p role="status" className="callout">{notice}</p>}
        {status ? (
          <>
            <h2>Administrator access verified</h2>
            <p>
              Role: <strong>{status.role}</strong> · Verified account:{" "}
              <code>{status.userId}</code>
            </p>
          </>
        ) : (
          <p role="status">Verifying administrator access…</p>
        )}
        {account.enrollmentStatus !== "joined" && (
          <p className="muted">
            Administrator access is separate from member enrollment. This
            account can manage the roster without member access.
          </p>
        )}
      </Card>

      <Card>
        <h2>Approve ordinary members</h2>
        <p>
          Paste one or more email addresses, or import a CSV with an{" "}
          <code>email</code> column and an optional <code>name</code> column.
          Review the list before approving. This only adds email addresses to
          the roster; it does not send mail or create accounts.
        </p>
        <div className="row wrap enrollment-mode">
          <label>
            <input
              type="radio"
              name="enrollment-import-format"
              checked={source === "emails"}
              onChange={() => {
                setSource("emails");
                setPreview(null);
              }}
            />
            Paste emails
          </label>
          <label>
            <input
              type="radio"
              name="enrollment-import-format"
              checked={source === "csv"}
              onChange={() => {
                setSource("csv");
                setPreview(null);
              }}
            />
            CSV
          </label>
          <label className="enrollment-file">
            Choose CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void loadCsv(event.currentTarget.files?.[0])}
            />
          </label>
          {fileName && <span className="muted">{fileName}</span>}
        </div>
        <label className="enrollment-input">
          {source === "csv" ? "CSV content" : "Email addresses"}
          <textarea
            rows={7}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setPreview(null);
            }}
            placeholder={
              source === "csv"
                ? "email,name\nmember@example.org,Jordan Lee"
                : "member@example.org\nanother@example.org"
            }
          />
        </label>
        <div className="row wrap">
          <button
            className="button primary"
            type="button"
            onClick={() => void reviewImport()}
            disabled={busy || !input.trim()}
          >
            Review import
          </button>
          <button
            className="button"
            type="button"
            onClick={() => {
              setInput("");
              setFileName("");
              setPreview(null);
            }}
            disabled={busy || (!input && !fileName)}
          >
            Clear
          </button>
        </div>

        {preview && (
          <section className="enrollment-preview" aria-label="Import review">
            <h3>Review before approval</h3>
            <p data-testid="import-summary">
              {preview.counts.new} new · {preview.counts.existing} already on
              roster · {preview.counts.duplicates} duplicate ·{" "}
              {preview.counts.invalid} invalid
            </p>
            {preview.errors.map((message) => (
              <p className="error" key={message}>{message}</p>
            ))}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Line</th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, index) => (
                    <tr key={`${row.line}-${row.email}-${index}`}>
                      <td>{row.line}</td>
                      <td>{row.email || "—"}</td>
                      <td>{row.name || "—"}</td>
                      <td>
                        <strong>{row.classification}</strong>
                        <small className="enrollment-message">{row.message}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="button primary"
              type="button"
              onClick={() => void approveImport()}
              disabled={busy || preview.counts.new === 0}
            >
              Approve {preview.counts.new} normal member
              {preview.counts.new === 1 ? "" : "s"}
            </button>
          </section>
        )}
      </Card>

      <Card>
        <div className="between wrap">
          <div>
            <h2>Approved email roster</h2>
            <p className="muted">
              Approved people must sign in with the email on this roster.
              Suspended entries can be reactivated.
            </p>
          </div>
          <label className="enrollment-search">
            Search roster
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Email or name"
            />
          </label>
        </div>
        <div className="table-scroll">
          <table data-testid="enrollment-roster">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Updated</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.email}</td>
                  <td>{entry.name || "—"}</td>
                  <td>
                    {entry.status === "approved"
                      ? "Approved · not joined"
                      : entry.status === "joined"
                        ? "Joined"
                        : "Suspended"}
                  </td>
                  <td>{displayDate(entry.joinedAt)}</td>
                  <td>
                    <span>{displayDate(entry.updatedAt)}</span>
                  </td>
                  <td>
                    <button
                      className="button enrollment-action"
                      type="button"
                      disabled={busy}
                      onClick={() => void updateStatus(entry)}
                    >
                      {entry.status === "suspended" ? "Reactivate" : "Suspend"}
                    </button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6}>No roster entries match this search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2>Joining instructions</h2>
        <p>
          People create an account using their approved email address and verify
          it before accessing the hub. No invitation is sent from this page.
        </p>
        <label className="enrollment-input">
          Published sign-up link
          <input
            type="url"
            readOnly
            value={joinInfo?.url ?? ""}
            aria-label="Published sign-up link"
          />
        </label>
        <div className="row wrap">
          <button
            className="button"
            type="button"
            disabled={!joinInfo}
            onClick={() => joinInfo && void copyText(joinInfo.url, "Sign-up link")}
          >
            Copy sign-up link
          </button>
          <button
            className="button"
            type="button"
            disabled={!joinInfo}
            onClick={() =>
              joinInfo &&
              void copyText(
                `${joinInfo.instructions}\n${joinInfo.url}`,
                "Joining instructions",
              )
            }
          >
            Copy instructions
          </button>
        </div>
      </Card>
    </div>
  );
}
