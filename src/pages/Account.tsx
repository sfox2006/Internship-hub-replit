import Card from "../components/Card";
import AccountProfileForm from "../components/AccountProfileForm";
import type { Account } from "../auth/types";

export default function AccountPage({
  account,
  onSaveProfile,
}: {
  account: Account;
  onSaveProfile: (firstName: string, lastName: string) => Promise<void>;
}) {
  const enrollmentLabel =
    account.enrollmentStatus === "joined"
      ? "Joined"
      : account.enrollmentStatus === "approved"
        ? "Approved · not joined"
        : account.enrollmentStatus === "suspended"
          ? "Suspended"
          : account.enrollmentStatus === "email-unverified"
            ? "Verified email required"
            : account.enrollmentStatus === "identity-conflict"
              ? "Account link conflict"
              : "Not approved";
  return (
    <div className="narrow">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR SPACE</span>
          <h1>Account</h1>
          <p>Your verified Fellowship Hub account and access level.</p>
        </div>
      </div>
      <Card>
        <h2>Account identity</h2>
        <dl className="account-details">
          <dt>Verified Clerk user ID</dt>
          <dd>
            <code data-testid="verified-user-id">{account.userId}</code>
          </dd>
          <dt>Hub role</dt>
          <dd>{account.role === "administrator" ? "Administrator" : "Normal user"}</dd>
          <dt>First name</dt>
          <dd>{account.firstName || "Not set"}</dd>
          <dt>Last name</dt>
          <dd>{account.lastName || "Not set"}</dd>
          <dt>Verified email</dt>
          <dd>{account.verifiedEmail || "Email verification required"}</dd>
          <dt>Enrollment status</dt>
          <dd>{enrollmentLabel}</dd>
        </dl>
        <p className="muted">
          This ID and status come from the server. A verified provider email is
          matched to the app-owned roster and permanently linked to this stable
          account ID on first join. New accounts receive normal-user access;
          account settings cannot grant administrator privileges.
        </p>
      </Card>
      <AccountProfileForm
        account={account}
        onSave={onSaveProfile}
        title="Edit your name"
      />
    </div>
  );
}
