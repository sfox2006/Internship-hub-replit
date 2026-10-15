import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useClerk,
  useUser,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import BrandMark from "./components/BrandMark";
import AccountPage from "./pages/Account";
import AccountProfileForm from "./components/AccountProfileForm";
import type { Account } from "./auth/types";

const MemberHub = lazy(() => import("./MemberHub"));
const AdminPage = lazy(() => import("./pages/Admin"));

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (import.meta.env.MODE !== "e2e" && !clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY for Clerk Auth.");
}

const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: "/",
    logoImageUrl: `${window.location.origin}/logo.svg`,
  },
  variables: {
    colorPrimary: "#005850",
    colorForeground: "#1a1a1a",
    colorMutedForeground: "#555555",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "#1a1a1a",
    colorNeutral: "#d7d7d7",
    colorDanger: "#b42318",
    fontFamily: '"Raleway", Arial, sans-serif',
    borderRadius: "8px",
  },
  elements: {
    rootBox: { width: "min(100%, 460px)", margin: "0 auto" },
    cardBox: {
      width: "100%",
      boxShadow: "none",
    },
    card: {
      border: "1px solid #d7d7d7",
      borderRadius: "12px",
      boxShadow: "none",
    },
    formButtonPrimary: {
      backgroundColor: "#005850",
    },
  },
};

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <BrandMark />
        <span className="eyebrow">LIBERTY &amp; SOCIETY STUDENT FELLOWSHIP</span>
      </div>
      {children}
    </main>
  );
}

function Welcome() {
  return (
    <AuthShell>
      <section className="auth-welcome">
        <h1>A place to learn. A place to belong.</h1>
        <p>
          Sign in to continue to the Fellowship Hub, or create an account to
          join.
        </p>
        <div className="row wrap">
          <Link className="button primary" to="/sign-in">
            Sign in
          </Link>
          <Link className="button" to="/sign-up">
            Create account
          </Link>
        </div>
      </section>
    </AuthShell>
  );
}

function safeRedirect(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return "/";
  return value;
}

function SignInPage() {
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get("redirect_url"));
  return (
    <AuthShell>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl={redirect}
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}

function SignUpPage() {
  return (
    <AuthShell>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/"
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}

function ClerkApplication() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const location = useLocation();
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const redirectUrl = encodeURIComponent(
    `${location.pathname}${location.search}${location.hash}`,
  );

  useEffect(() => {
    if (isLoaded) {
      setLoadTimedOut(false);
      return;
    }
    const timeout = window.setTimeout(() => setLoadTimedOut(true), 12_000);
    return () => window.clearTimeout(timeout);
  }, [isLoaded]);

  if (!isLoaded) {
    if (loadTimedOut)
      return (
        <main className="auth-page">
          <section className="auth-welcome" role="alert">
            <h1>Sign-in could not load</h1>
            <p>
              Sign-in did not finish initializing. Check your connection and
              try again. If it keeps failing, contact the site owner.
            </p>
            <div className="auth-load-actions">
              <button
                className="button button-primary"
                type="button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
              <Link className="button" to="/">
                Return to welcome
              </Link>
            </div>
          </section>
        </main>
      );
    return <div className="auth-loading">Loading sign-in…</div>;
  }

  if (!isSignedIn || !user) {
    return (
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route
          path="*"
          element={<Navigate to={`/sign-in?redirect_url=${redirectUrl}`} replace />}
        />
      </Routes>
    );
  }

  return (
    <SignedInApplication
      key={user.id}
      userId={user.id}
      identity={{
        name: user.fullName || "",
        email: user.primaryEmailAddress?.emailAddress || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      }}
      signOut={() => void signOut({ redirectUrl: "/" })}
      onSaveProfile={saveAccountProfile}
    />
  );
}

async function saveAccountProfile(firstName: string, lastName: string) {
  const response = await fetch("/api/account/profile", {
    method: "PUT",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName }),
  });
  const result = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok)
    throw new Error(result.error || "Your name could not be saved.");
}

function SignedInApplication({
  userId,
  identity,
  signOut,
  onSaveProfile,
}: {
  userId: string;
  identity: {
    name: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  signOut: () => void;
  onSaveProfile: (firstName: string, lastName: string) => Promise<void>;
}) {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const location = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    setAccount(null);
    setError("");
    fetch("/api/me", { credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Your account could not be verified.");
        return (await response.json()) as Account;
      })
      .then((current) => {
        if (current.userId !== userId)
          throw new Error("The server identity did not match this sign-in.");
        setAccount(current);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Your account could not be verified.",
          );
      });
    return () => controller.abort();
  }, [userId]);

  async function saveProfile(firstName: string, lastName: string) {
    const originalUserId = userId;
    await onSaveProfile(firstName, lastName);
    const response = await fetch("/api/me", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Your updated account could not be verified.");
    const current = (await response.json()) as Account;
    if (current.userId !== originalUserId)
      throw new Error("The signed-in account changed. Sign in again to continue.");
    setAccount(current);
  }

  useEffect(() => {
    let active = true;
    const refreshAccess = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/me", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) return;
        const current = (await response.json()) as Account;
        if (active && current.userId === userId) setAccount(current);
      } catch {
        // The server still protects every API request; retry when the tab is active.
      }
    };
    const interval = window.setInterval(refreshAccess, 15_000);
    document.addEventListener("visibilitychange", refreshAccess);
    window.addEventListener("focus", refreshAccess);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshAccess);
      window.removeEventListener("focus", refreshAccess);
    };
  }, [userId]);

  if (error)
    return (
      <main className="auth-page">
        <section className="auth-welcome" role="alert">
          <h1>Account verification unavailable</h1>
          <p>{error}</p>
          <p>Please try again when the account service is available.</p>
        </section>
      </main>
    );
  if (!account) return <div className="auth-loading">Loading your account…</div>;

  const isAdminRoute =
    location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  const isAccountRoute =
    location.pathname === "/account" || location.pathname.startsWith("/account/");

  if (!account.profileComplete)
    return (
      <AuthShell>
        <section className="auth-welcome">
          <h1>Complete your account</h1>
          <p>
            Use your verified email and add your first and last name before
            entering the Fellowship Hub.
          </p>
        </section>
        <AccountProfileForm account={account} onSave={saveProfile} />
        <button className="button" type="button" onClick={signOut}>
          Sign out
        </button>
      </AuthShell>
    );

  if (isAdminRoute && account.role === "administrator")
    return (
      <Suspense fallback={<div className="auth-loading">Loading administrator tools…</div>}>
        <AdminPage account={account} signOut={signOut} />
      </Suspense>
    );

  if (account.enrollmentStatus !== "joined" && isAccountRoute)
    return (
      <AuthShell>
        <AccountPage account={account} onSaveProfile={saveProfile} />
        <button className="button" type="button" onClick={signOut}>
          Sign out
        </button>
      </AuthShell>
    );

  if (account.enrollmentStatus !== "joined")
    return <EnrollmentRequired account={account} signOut={signOut} />;

  return (
    <Suspense fallback={<div className="auth-loading">Loading your hub…</div>}>
      <MemberHub
        account={account}
        identity={{
          name: `${account.firstName} ${account.lastName}`.trim() || identity.name,
          email: account.verifiedEmail || identity.email,
          firstName: account.firstName,
          lastName: account.lastName,
        }}
        signOut={signOut}
        onSaveProfile={saveProfile}
      />
    </Suspense>
  );
}

function EnrollmentRequired({
  account,
  signOut,
}: {
  account: Account;
  signOut: () => void;
}) {
  const message =
    account.enrollmentStatus === "suspended"
      ? "Hub access for this account is suspended. Contact the hub administrator if you believe this is incorrect."
      : account.enrollmentStatus === "email-unverified"
        ? "Verify an email address with your sign-in provider, then sign in again. The hub checks verified addresses on the server."
        : account.enrollmentStatus === "identity-conflict"
          ? "This approved address is already linked to another account. Contact the hub administrator; approvals cannot be transferred between accounts."
          : "This account can sign in, but its verified email is not approved for hub access yet. Ask the hub administrator to add it to the enrollment roster.";
  return (
    <AuthShell>
      <section className="auth-welcome" role="status">
        <h1>Enrollment required</h1>
        <p>{message}</p>
        <div className="row wrap">
          <Link className="button primary" to="/account">
            View account ID and status
          </Link>
          <button className="button" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </section>
    </AuthShell>
  );
}

function FixtureAuthApplication() {
  const [account, setAccount] = useState<Account | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me", { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("Test account fixture unavailable.");
        return (await response.json()) as Account;
      })
      .then((result) => {
        if (!controller.signal.aborted) {
          setAccount(result);
          setChecked(true);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Test account fixture unavailable.",
          );
          setChecked(true);
        }
      });
    return () => controller.abort();
  }, []);

  if (!checked) return <div className="auth-loading">Loading test fixture…</div>;
  if (error)
    return (
      <main className="auth-page">
        <section className="auth-welcome" role="alert">
          <h1>Test fixture unavailable</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  if (!account) return <Welcome />;
  const identity = {
    name: `${account.firstName} ${account.lastName}`.trim(),
    email: account.verifiedEmail || "",
    firstName: account.firstName,
    lastName: account.lastName,
  };
  async function saveFixtureProfile(firstName: string, lastName: string) {
    const response = await fetch("/api/account/profile", {
      method: "PUT",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok)
      throw new Error(result.error || "Test profile could not be saved.");
  }
  return (
    <SignedInApplication
      key={account.userId}
      userId={account.userId}
      identity={identity}
      signOut={() => setAccount(null)}
      onSaveProfile={saveFixtureProfile}
    />
  );
}

function ClerkRouter() {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access your Fellowship Hub account",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Create an account for the Fellowship Hub",
          },
        },
      }}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      <ClerkApplication />
    </ClerkProvider>
  );
}

export default function App() {
  if (import.meta.env.MODE === "e2e") return <FixtureAuthApplication />;
  return <ClerkRouter />;
}
