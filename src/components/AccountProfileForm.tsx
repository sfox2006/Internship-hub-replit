import { useState, type FormEvent } from "react";
import Card from "./Card";
import type { Account } from "../auth/types";
import { normalizeAccountName } from "../data/account-profile";

type Props = {
  account: Account;
  onSave: (firstName: string, lastName: string) => Promise<void>;
  title?: string;
};

export default function AccountProfileForm({
  account,
  onSave,
  title = "Your name",
}: Props) {
  const [firstName, setFirstName] = useState(account.firstName);
  const [lastName, setLastName] = useState(account.lastName);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const verifiedEmail = account.verifiedEmail || "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const first = normalizeAccountName(firstName);
    const last = normalizeAccountName(lastName);
    if (!first || !last) {
      setError(
        "First and last name must each contain 1–100 characters without control characters.",
      );
      return;
    }
    if (!verifiedEmail) {
      setError("Verify your email before completing your account.");
      return;
    }
    setBusy(true);
    try {
      await onSave(first, last);
      setFirstName(first);
      setLastName(last);
      setMessage("Your name was saved.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Your name could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2>{title}</h2>
      <p className="muted">
        Your verified email stays with your account. Your first and last name
        appear to approved members in messaging.
      </p>
      <form onSubmit={submit}>
        <label>
          Verified email
          <input
            aria-label="Verified email"
            value={verifiedEmail || "Verify your email to continue"}
            readOnly
          />
        </label>
        <div className="grid two">
          <label>
            First name
            <input
              autoComplete="given-name"
              required
              maxLength={100}
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </label>
          <label>
            Last name
            <input
              autoComplete="family-name"
              required
              maxLength={100}
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </label>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="success" role="status">
            {message}
          </p>
        )}
        <button className="primary" type="submit" disabled={busy || !verifiedEmail}>
          {busy ? "Saving…" : "Save name"}
        </button>
        {!verifiedEmail && (
          <p className="muted" role="status">
            Sign in after verifying your email to finish account setup.
          </p>
        )}
      </form>
    </Card>
  );
}
