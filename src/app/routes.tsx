import { Outlet } from "react-router";
import { LanguageProvider } from "./contexts/LanguageContext";
import { LeagueClientProvider } from "./contexts/LeagueClientContext";
import { ChampionDrawerProvider } from "./contexts/ChampionDrawerContext";
import { NotesProvider } from "./contexts/NotesContext";
import { CelebrationProvider } from "./contexts/CelebrationContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

export function RootLayout() {
  return (
    <LanguageProvider>
      <LeagueClientProvider>
        <ChampionDrawerProvider>
          <NotesProvider>
            <CelebrationProvider>
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </CelebrationProvider>
          </NotesProvider>
        </ChampionDrawerProvider>
      </LeagueClientProvider>
    </LanguageProvider>
  );
}
