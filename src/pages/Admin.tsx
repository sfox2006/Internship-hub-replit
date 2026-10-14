import { useEffect, useState } from "react";
import Card from "../components/Card";
import type { Account } from "../auth/types";

type AdminStatus = {
  authorized: true;
  userId: string;
  role: "administrator";
};

export default function AdminPage({ account }: { account: Account }) {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 403)
          throw new Error("Administrator access is required.");
        if (!response.ok) throw new Error("Administrator status is unavailable.");
        return (await response.json()) as AdminStatus;
      })
      .then(setStatus)
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

  return (
    <div className="narrow">
      <div className="page-heading">
        <div>
          <span className="eyebrow">RESTRICTED</span>
          <h1>Administrator</h1>
          <p>Only accounts granted administrator access by the project owner.</p>
        </div>
      </div>
      <Card>
        {error ? (
          <p role="alert" className="error">{error}</p>
        ) : status ? (
          <>
            <h2>Administrator access verified</h2>
            <p>
              Role: <strong>{status.role}</strong>
            </p>
            <p>
              Verified account: <code>{status.userId}</code>
            </p>
          </>
        ) : (
          <p role="status">Verifying administrator access…</p>
        )}
      </Card>
      {account.role === "administrator" && (
        <p className="muted">
          Role changes are controlled by the server-side account-role table.
          This page does not provide a self-service role editor.
        </p>
      )}
    </div>
  );
}
