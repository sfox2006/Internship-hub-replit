import Card from "../components/Card";
import type { Account } from "../auth/types";

export default function AccountPage({ account }: { account: Account }) {
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
        </dl>
        <p className="muted">
          This ID comes from the server-verified Clerk session. New accounts
          receive normal-user access; account settings cannot grant administrator
          privileges.
        </p>
      </Card>
    </div>
  );
}
