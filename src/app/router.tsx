import { createBrowserRouter, Navigate } from "react-router";
import { lazy, Suspense } from "react";
import { RootLayout } from "./routes";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";

// ─── Eagerly loaded (always needed on startup) ────────────────────────────────
import { Dashboard } from "./pages/Dashboard";
import { OverlayInGame } from "./pages/OverlayInGame";
import { OverlayPreview } from "./pages/OverlayPreview";

// ─── Lazily loaded (split into separate chunks) ───────────────────────────────
const ChampSelect      = lazy(() => import("./pages/ChampSelect").then(m => ({ default: m.ChampSelect })));
const Profile          = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const Settings         = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const Matches          = lazy(() => import("./pages/Matches").then(m => ({ default: m.Matches })));
const LearningPath     = lazy(() => import("./pages/Learning").then(m => ({ default: m.LearningPath })));
const PostGame         = lazy(() => import("./pages/PostGame").then(m => ({ default: m.PostGame })));
const Notes            = lazy(() => import("./pages/Notes").then(m => ({ default: m.Notes })));
const ChampionPool     = lazy(() => import("./pages/ChampionPool").then(m => ({ default: m.ChampionPool })));
const Goals            = lazy(() => import("./pages/Goals").then(m => ({ default: m.Goals })));
const Privacy          = lazy(() => import("./pages/Privacy").then(m => ({ default: m.Privacy })));
const Terms            = lazy(() => import("./pages/Terms").then(m => ({ default: m.Terms })));
const About            = lazy(() => import("./pages/About").then(m => ({ default: m.About })));
const PlayerLookup     = lazy(() => import("./pages/PlayerLookup").then(m => ({ default: m.PlayerLookup })));
const ItemExplorer     = lazy(() => import("./pages/ItemExplorer").then(m => ({ default: m.ItemExplorer })));
const LiveGame         = lazy(() => import("./pages/LiveGame").then(m => ({ default: m.LiveGame })));
const MatchupDatabase  = lazy(() => import("./pages/MatchupDatabase").then(m => ({ default: m.MatchupDatabase })));
const PerformanceCalendar = lazy(() => import("./pages/PerformanceCalendar").then(m => ({ default: m.PerformanceCalendar })));
const RuneBuilder      = lazy(() => import("./pages/RuneBuilder").then(m => ({ default: m.RuneBuilder })));
const Coach            = lazy(() => import("./pages/Coach").then(m => ({ default: m.Coach })));
const Compare          = lazy(() => import("./pages/Compare").then(m => ({ default: m.Compare })));

// Thin fallback shown while a lazy chunk loads (avoids layout flash)
function PageFallback() {
  return <div className="w-full h-full" />;
}

function Lazy({ component: Component }: { component: React.ComponentType }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard",     Component: Dashboard },
          { path: "matches",       element: <Lazy component={Matches} /> },
          { path: "post-game",     element: <Lazy component={PostGame} /> },
          { path: "learning",      element: <Lazy component={LearningPath} /> },
          { path: "champ-select",  element: <Lazy component={ChampSelect} /> },
          { path: "live-game",     element: <Lazy component={LiveGame} /> },
          { path: "notes",         element: <Lazy component={Notes} /> },
          { path: "champion-pool", element: <Lazy component={ChampionPool} /> },
          { path: "goals",         element: <Lazy component={Goals} /> },
          { path: "profile",       element: <Lazy component={Profile} /> },
          { path: "settings",      element: <Lazy component={Settings} /> },
          { path: "privacy",       element: <Lazy component={Privacy} /> },
          { path: "terms",         element: <Lazy component={Terms} /> },
          { path: "about",         element: <Lazy component={About} /> },
          { path: "player-lookup", element: <Lazy component={PlayerLookup} /> },
          { path: "item-explorer", element: <Lazy component={ItemExplorer} /> },
          { path: "matchups",      element: <Lazy component={MatchupDatabase} /> },
          { path: "calendar",      element: <Lazy component={PerformanceCalendar} /> },
          { path: "rune-builder",  element: <Lazy component={RuneBuilder} /> },
          { path: "coach",         element: <Lazy component={Coach} /> },
          { path: "compare",       element: <Lazy component={Compare} /> },
        ],
      },
      { path: "overlay",         Component: OverlayInGame },
      { path: "overlay-preview", Component: OverlayPreview },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
