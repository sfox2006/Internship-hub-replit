import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import { DemoProvider } from "./data/demoStore";
import type { Account, AccountIdentity } from "./auth/types";

const Programme = lazy(() => import("./pages/Programme"));
const ThisWeek = lazy(() => import("./pages/ThisWeek"));
const Schedule = lazy(() => import("./pages/Schedule"));
const SessionDetail = lazy(() => import("./pages/SessionDetail"));
const Requirements = lazy(() => import("./pages/Requirements"));
const Readings = lazy(() => import("./pages/Readings"));
const ResourceDetail = lazy(() => import("./pages/ResourceDetail"));
const Handbook = lazy(() => import("./pages/Handbook"));
const CapstoneGuide = lazy(() => import("./pages/CapstoneGuide"));
const Faq = lazy(() => import("./pages/Faq"));
const People = lazy(() => import("./pages/People"));
const PersonDetail = lazy(() => import("./pages/PersonDetail"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Discussions = lazy(() => import("./pages/Discussions"));
const Reflections = lazy(() => import("./pages/Reflections"));
const Saved = lazy(() => import("./pages/Saved"));
const Profile = lazy(() => import("./pages/Profile"));
const Search = lazy(() => import("./pages/Search"));
const HowThingsWork = lazy(() => import("./pages/HowThingsWork"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AccountPage = lazy(() => import("./pages/Account"));
const AdminPage = lazy(() => import("./pages/Admin"));

export default function MemberHub({
  account,
  identity,
  signOut,
}: {
  account: Account;
  identity: AccountIdentity;
  signOut: () => void;
}) {
  return (
    <DemoProvider key={account.userId} userId={account.userId}>
      <AppShell role={account.role} identity={identity} signOut={signOut}>
        <Suspense fallback={<div className="auth-loading">Loading your hub…</div>}>
          <Routes>
            <Route path="/sign-in" element={<Navigate to="/" replace />} />
            <Route path="/sign-up" element={<Navigate to="/" replace />} />
            <Route path="/" element={<ThisWeek />} />
            <Route path="/programme" element={<Programme />} />
            <Route path="/reflection-guide" element={<CapstoneGuide />} />
            <Route path="/applications" element={<NotFound />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/session/:id" element={<SessionDetail />} />
            <Route path="/requirements" element={<Requirements />} />
            <Route path="/readings" element={<Readings />} />
            <Route path="/resource/:id" element={<ResourceDetail />} />
            <Route path="/handbook" element={<Handbook />} />
            <Route path="/capstone-guide" element={<CapstoneGuide />} />
            <Route path="/dc-culture-guide" element={<NotFound />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/emergency" element={<Navigate to="/handbook" replace />} />
            <Route path="/teams" element={<Navigate to="/programme" replace />} />
            <Route path="/team/:id" element={<Navigate to="/programme" replace />} />
            <Route path="/people" element={<People />} />
            <Route path="/person/:id" element={<PersonDetail />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/discussions" element={<Discussions />} />
            <Route path="/photos" element={<NotFound />} />
            <Route path="/reflections" element={<Reflections />} />
            <Route path="/saved" element={<Saved />} />
            <Route
              path="/profile"
              element={<Profile email={identity.email} />}
            />
            <Route path="/account" element={<AccountPage account={account} />} />
            <Route
              path="/admin"
              element={
                account.role === "administrator" ? (
                  <AdminPage account={account} signOut={signOut} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route path="/search" element={<Search />} />
            <Route path="/how-things-work" element={<HowThingsWork />} />
            <Route path="/article/:slug" element={<ArticleDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AppShell>
    </DemoProvider>
  );
}
