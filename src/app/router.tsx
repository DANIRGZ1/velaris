import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./routes";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { ChampSelect } from "./pages/ChampSelect";
import { OverlayPreview } from "./pages/OverlayPreview";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import { Matches } from "./pages/Matches";
import { LearningPath } from "./pages/Learning";
import { PostGame } from "./pages/PostGame";
import { Notes } from "./pages/Notes";
import { ChampionPool } from "./pages/ChampionPool";
import { Goals } from "./pages/Goals";
import { Privacy } from "./pages/Privacy";
import { About } from "./pages/About";
import { PlayerLookup } from "./pages/PlayerLookup";
import { ItemExplorer } from "./pages/ItemExplorer";
import { OverlayInGame } from "./pages/OverlayInGame";
import { LiveGame } from "./pages/LiveGame";
import { MatchupDatabase } from "./pages/MatchupDatabase";
import { PerformanceCalendar } from "./pages/PerformanceCalendar";
import { RuneBuilder } from "./pages/RuneBuilder";
import { Coach } from "./pages/Coach";
import { Compare } from "./pages/Compare";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", Component: Dashboard },
          { path: "matches", Component: Matches },
          { path: "post-game", Component: PostGame },
          { path: "learning", Component: LearningPath },
          { path: "champ-select", Component: ChampSelect },
          { path: "live-game", Component: LiveGame },
          { path: "notes", Component: Notes },
          { path: "champion-pool", Component: ChampionPool },
          { path: "goals", Component: Goals },
          { path: "profile", Component: Profile },
          { path: "settings", Component: Settings },
          { path: "privacy", Component: Privacy },
          { path: "about", Component: About },
          { path: "player-lookup", Component: PlayerLookup },
          { path: "item-explorer", Component: ItemExplorer },
          { path: "matchups", Component: MatchupDatabase },
          { path: "calendar", Component: PerformanceCalendar },
          { path: "rune-builder", Component: RuneBuilder },
          { path: "coach", Component: Coach },
          { path: "compare", Component: Compare },
        ],
      },
      { path: "overlay", Component: OverlayInGame },
      { path: "overlay-preview", Component: OverlayPreview },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
