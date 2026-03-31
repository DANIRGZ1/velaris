import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ChampionDrawerState {
  isOpen: boolean;
  championName: string | null;
  openChampion: (name: string) => void;
  close: () => void;
}

const ChampionDrawerContext = createContext<ChampionDrawerState>({
  isOpen: false,
  championName: null,
  openChampion: () => {},
  close: () => {},
});

export function ChampionDrawerProvider({ children }: { children: ReactNode }) {
  const [championName, setChampionName] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openChampion = useCallback((name: string) => {
    setChampionName(name);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setChampionName(null), 300);
  }, []);

  return (
    <ChampionDrawerContext.Provider value={{ isOpen, championName, openChampion, close }}>
      {children}
    </ChampionDrawerContext.Provider>
  );
}

export const useChampionDrawer = () => useContext(ChampionDrawerContext);
