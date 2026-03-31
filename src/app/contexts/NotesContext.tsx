import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface Note {
  id: string;
  title: string;
  content: string;
  champion?: string; // optional: tied to a champion
  matchup?: string; // optional: "Jinx vs Draven"
  linkedMatchId?: string; // optional: linked to a specific match
  tags: string[];
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
}

interface NotesState {
  notes: Note[];
  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  getNotesForChampion: (champion: string) => Note[];
  getNotesForMatchup: (champ1: string, champ2: string) => Note[];
  exportNotes: () => void;
  importNotes: (file: File) => Promise<{ added: number; skipped: number }>;
}

const STORAGE_KEY = "velaris-notes";

function loadNotes(): Note[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return getDefaultNotes();
}

function saveNotes(notes: Note[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch { /* ignore */ }
}

function getDefaultNotes(): Note[] {
  return [];
}

const NotesContext = createContext<NotesState>({
  notes: [],
  addNote: () => ({ id: "", title: "", content: "", tags: [], createdAt: 0, updatedAt: 0, pinned: false }),
  updateNote: () => {},
  deleteNote: () => {},
  togglePin: () => {},
  getNotesForChampion: () => [],
  getNotesForMatchup: () => [],
  exportNotes: () => {},
  importNotes: async () => ({ added: 0, skipped: 0 }),
});

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>(loadNotes);

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  const addNote = useCallback((note: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    const now = Date.now();
    const newNote: Note = {
      ...note,
      id: `n-${now}`,
      createdAt: now,
      updatedAt: now,
    };
    setNotes(prev => [newNote, ...prev]);
    return newNote;
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
    ));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const togglePin = useCallback((id: string) => {
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n
    ));
  }, []);

  const getNotesForChampion = useCallback((champion: string) => {
    return notes.filter(n => n.champion?.toLowerCase() === champion.toLowerCase());
  }, [notes]);

  const getNotesForMatchup = useCallback((champ1: string, champ2: string) => {
    return notes.filter(n => {
      if (!n.matchup) return false;
      const m = n.matchup.toLowerCase();
      return m.includes(champ1.toLowerCase()) && m.includes(champ2.toLowerCase());
    });
  }, [notes]);

  const exportNotes = useCallback(() => {
    const payload = JSON.stringify({ version: 1, exportedAt: Date.now(), notes }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `velaris-notes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [notes]);

  const importNotes = useCallback((file: File): Promise<{ added: number; skipped: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = JSON.parse(e.target?.result as string);
          const incoming: Note[] = Array.isArray(raw) ? raw : (raw.notes ?? []);
          if (!Array.isArray(incoming)) throw new Error("Formato inválido");

          let added = 0;
          let skipped = 0;
          setNotes(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const toAdd: Note[] = [];
            for (const note of incoming) {
              if (!note.id || !note.title) { skipped++; continue; }
              if (existingIds.has(note.id)) { skipped++; continue; }
              toAdd.push({ ...note });
              added++;
            }
            return [...toAdd, ...prev];
          });
          resolve({ added, skipped });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Error leyendo el archivo"));
      reader.readAsText(file);
    });
  }, []);

  return (
    <NotesContext.Provider value={{ notes, addNote, updateNote, deleteNote, togglePin, getNotesForChampion, getNotesForMatchup, exportNotes, importNotes }}>
      {children}
    </NotesContext.Provider>
  );
}

export const useNotes = () => useContext(NotesContext);