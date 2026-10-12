import Programme from "./pages/Programme";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useDemo } from "./data/demoStore";
import AppShell from "./components/AppShell";
import ThisWeek from "./pages/ThisWeek";
import Schedule from "./pages/Schedule";
import SessionDetail from "./pages/SessionDetail";
import Requirements from "./pages/Requirements";
import Readings from "./pages/Readings";
import ResourceDetail from "./pages/ResourceDetail";
import Handbook from "./pages/Handbook";
import CapstoneGuide from "./pages/CapstoneGuide";
import DcCultureGuide from "./pages/DcCultureGuide";
import Faq from "./pages/Faq";
import People from "./pages/People";
import PersonDetail from "./pages/PersonDetail";
import Announcements from "./pages/Announcements";
import Discussions from "./pages/Discussions";
import Photos from "./pages/Photos";
import Saved from "./pages/Saved";
import Profile from "./pages/Profile";
import Search from "./pages/Search";
import HowThingsWork from "./pages/HowThingsWork";
import ArticleDetail from "./pages/ArticleDetail";
import DemoEntry from "./pages/DemoEntry";
import NotFound from "./pages/NotFound";
export default function App() {
  const { state } = useDemo();
  const location = useLocation();
  if (!state.demoSignedIn) return <DemoEntry />;
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<ThisWeek />} />
        <Route path="/programme" element={<Programme />} />
        <Route path="/reflection-guide" element={<CapstoneGuide />} />
        <Route path="/applications" element={<DcCultureGuide />} />
        <Route path="/schedule" element={<Schedule key={location.key} />} />
        <Route
          path="/session/:id"
          element={<SessionDetail key={location.pathname} />}
        />
        <Route path="/requirements" element={<Requirements />} />
        <Route path="/readings" element={<Readings />} />
        <Route path="/resource/:id" element={<ResourceDetail />} />
        <Route path="/handbook" element={<Handbook />} />
        <Route path="/capstone-guide" element={<CapstoneGuide />} />
        <Route path="/dc-culture-guide" element={<DcCultureGuide />} />
        <Route path="/faq" element={<Faq />} />
        <Route
          path="/emergency"
          element={<Navigate to="/handbook" replace />}
        />
        <Route path="/teams" element={<Navigate to="/programme" replace />} />
        <Route
          path="/team/:id"
          element={<Navigate to="/programme" replace />}
        />
        <Route path="/people" element={<People />} />
        <Route path="/person/:id" element={<PersonDetail />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route
          path="/discussions"
          element={<Discussions key={location.key} />}
        />
        <Route path="/photos" element={<Photos />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/search" element={<Search key={location.search} />} />
        <Route path="/how-things-work" element={<HowThingsWork />} />
        <Route path="/article/:slug" element={<ArticleDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}
