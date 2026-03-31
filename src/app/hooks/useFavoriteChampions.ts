/**
 * useFavoriteChampions — Velaris
 * 
 * Hook for managing a watchlist/favorites list of champions.
 * Persisted in localStorage.
 */

import { useState, useCallback } from "react";

const FAVORITES_KEY = "velaris-favorite-champions";

function loadFavorites(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveFavorites(favorites: string[]) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); } catch {}
}

export function useFavoriteChampions() {
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);

  const toggleFavorite = useCallback((championName: string) => {
    setFavorites(prev => {
      const next = prev.includes(championName)
        ? prev.filter(c => c !== championName)
        : [...prev, championName];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((championName: string) => {
    return favorites.includes(championName);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
