import { motion, AnimatePresence } from "motion/react";
import { StickyNote, Plus, Pin, Trash2, Search, Tag, X, PenLine, Eye, Edit, Link2, ExternalLink, LayoutTemplate, Download, Upload } from "lucide-react";
import { cn } from "../components/ui/utils";
import { useNotes, type Note } from "../contexts/NotesContext";
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { timeAgo } from "../utils/timeAgo";
import { MarkdownPreview } from "../components/MarkdownPreview";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { getMatchHistory } from "../services/dataService";
import { useAsyncData } from "../hooks/useAsyncData";

// Tag keys for i18n
const TAG_KEYS = [
  "tag.note.matchup", "tag.note.earlyGame", "tag.note.midGame", "tag.note.lateGame",
  "tag.note.teamfight", "tag.note.macro", "tag.note.micro", "tag.note.waveManagement",
  "tag.note.vision", "tag.note.mental", "tag.note.botLane", "tag.note.midLane",
  "tag.note.topLane", "tag.note.jungle", "tag.note.fundamentals", "tag.note.champion",
  "tag.note.improvement", "tag.note.positioning",
];

export function Notes() {
  const { notes, addNote, updateNote, deleteNote, togglePin, exportNotes, importNotes } = useNotes();
  const importInputRef = useRef<HTMLInputElement>(null);
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { data: matchHistory } = useAsyncData(() => getMatchHistory(), []);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(() => {
    try { return localStorage.getItem("velaris-notes-filter-tag"); } catch { return null; }
  });
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const deletedNoteRef = useRef<Note | null>(null);
  const [pendingDeleteNote, setPendingDeleteNote] = useState<Note | null>(null);

  // Persist selected tag filter
  useEffect(() => {
    try {
      if (selectedTag) localStorage.setItem("velaris-notes-filter-tag", selectedTag);
      else localStorage.removeItem("velaris-notes-filter-tag");
    } catch {}
  }, [selectedTag]);

  // New note form
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newChampion, setNewChampion] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newLinkedMatchId, setNewLinkedMatchId] = useState("");
  const [newVodTimestamp, setNewVodTimestamp] = useState("");

  // Edit form
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags)));

  const filtered = notes
    .filter(n => {
      if (search) {
        const s = search.toLowerCase();
        return n.title.toLowerCase().includes(s) ||
          n.content.toLowerCase().includes(s) ||
          n.champion?.toLowerCase().includes(s) ||
          n.matchup?.toLowerCase().includes(s);
      }
      return true;
    })
    .filter(n => !selectedTag || n.tags.includes(selectedTag))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });

  const handleCreate = () => {
    if (!newTitle.trim() || newTitle.length > 200) return;
    const vodContent = newVodTimestamp.trim()
      ? `${newContent}\n\n---\n**VOD:** ${newVodTimestamp.trim()}`
      : newContent;
    addNote({
      title: newTitle,
      content: vodContent,
      champion: newChampion || undefined,
      tags: newTags,
      pinned: false,
      linkedMatchId: newLinkedMatchId || undefined,
    });
    toast.success(t("qol.noteCreated"));
    setNewTitle("");
    setNewContent("");
    setNewChampion("");
    setNewTags([]);
    setNewLinkedMatchId("");
    setNewVodTimestamp("");
    setShowNewNote(false);
  };

  const handleDelete = (note: Note) => {
    setPendingDeleteNote(note);
  };

  const confirmDelete = () => {
    if (!pendingDeleteNote) return;
    const note = pendingDeleteNote;
    setPendingDeleteNote(null);
    deletedNoteRef.current = note;
    deleteNote(note.id);
    toast(t("qol.noteDeleted"), {
      action: {
        label: t("qol.undo"),
        onClick: () => {
          if (deletedNoteRef.current) {
            addNote({
              title: deletedNoteRef.current.title,
              content: deletedNoteRef.current.content,
              champion: deletedNoteRef.current.champion,
              matchup: deletedNoteRef.current.matchup,
              tags: deletedNoteRef.current.tags,
              pinned: deletedNoteRef.current.pinned,
              linkedMatchId: deletedNoteRef.current.linkedMatchId,
            });
          }
        },
      },
    });
  };

  const startEdit = (note: Note) => {
    setEditingNote(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const saveEdit = (id: string) => {
    updateNote(id, { title: editTitle, content: editContent });
    setEditingNote(null);
    toast.success(t("qol.noteSaved"));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-4xl mx-auto flex flex-col font-sans gap-6 pb-20"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">{t("notes.title")}</h1>
          <p className="text-[13px] text-muted-foreground mt-1">{t("notes.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export */}
          <button
            onClick={exportNotes}
            disabled={notes.length === 0}
            title={t("notes.exportTitle") || "Export notes as JSON"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/50 bg-secondary/50 text-muted-foreground text-[12px] font-medium hover:bg-secondary hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            {t("notes.export") || "Export"}
          </button>
          {/* Import */}
          <button
            onClick={() => importInputRef.current?.click()}
            title={t("notes.importTitle") || "Import notes from JSON"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/50 bg-secondary/50 text-muted-foreground text-[12px] font-medium hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            {t("notes.import") || "Import"}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = "";
              try {
                const { added, skipped } = await importNotes(file);
                toast.success(`${added} nota${added !== 1 ? "s" : ""} importada${added !== 1 ? "s" : ""}${skipped > 0 ? ` (${skipped} omitidas)` : ""}`);
              } catch (err) {
                toast.error("Error al importar: formato inválido");
              }
            }}
          />
          <button
            onClick={() => setShowNewNote(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.25)] btn-press"
          >
            <Plus className="w-4 h-4" />
            {t("notes.newNote")}
          </button>
        </div>
      </div>

      {/* Search + Tags */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("notes.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-[13px] focus:outline-none focus:border-primary/40 transition-colors input-glow"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border",
                  selectedTag === tag
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-secondary/50 text-muted-foreground border-border/30 hover:bg-secondary"
                )}
              >
                <Tag className="w-3 h-3 inline-block mr-1" />
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Note Form */}
      <AnimatePresence>
        {showNewNote && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 rounded-2xl bg-card border border-primary/20 shadow-sm flex flex-col gap-4 card-lift card-shine">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-foreground">{t("notes.newNote")}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewMode(!previewMode)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer",
                      previewMode ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary/60 text-muted-foreground hover:text-foreground border border-border/40"
                    )}
                    title={previewMode ? t("qol.edit") : t("qol.preview")}
                  >
                    {previewMode ? <Edit className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{previewMode ? (t("qol.edit") || "Editar") : (t("qol.preview") || "Preview")}</span>
                  </button>
                  <button onClick={() => setShowNewNote(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Template buttons */}
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground mr-1">{t("notes.templates")}:</span>
                {(["matchup", "mental", "macro"] as const).map(tpl => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => {
                      setNewTitle(t(`notes.template.${tpl}.title`));
                      setNewContent(t(`notes.template.${tpl}.content`));
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-secondary/60 border border-border/40 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                  >
                    {t(`notes.template.${tpl}`)}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder={t("notes.titlePlaceholder")}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-[14px] font-medium focus:outline-none focus:border-primary/40"
              />
              {previewMode ? (
                <div className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 min-h-[120px]">
                  <MarkdownPreview content={newContent || t("qol.markdownHint")} />
                </div>
              ) : (
                <textarea
                  placeholder={t("notes.contentPlaceholder")}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-[13px] resize-none focus:outline-none focus:border-primary/40 leading-relaxed"
                />
              )}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">{t("notes.championOptional")}</label>
                  <input
                    type="text"
                    placeholder={t("notes.championPlaceholder")}
                    value={newChampion}
                    onChange={e => setNewChampion(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-[12px] focus:outline-none focus:border-primary/40"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">{t("notes.tags")}</label>
                <div className="flex gap-1.5 flex-wrap">
                  {TAG_KEYS.slice(0, 12).map(key => {
                    const label = t(key);
                    return (
                      <button
                        key={key}
                        onClick={() => setNewTags(prev => prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label])}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer border",
                          newTags.includes(label)
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-secondary/50 text-muted-foreground border-border/30 hover:bg-secondary"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">{t("notes.linkMatch")}</label>
                {matchHistory && matchHistory.length > 0 ? (
                  <select
                    value={newLinkedMatchId}
                    onChange={e => setNewLinkedMatchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-[12px] focus:outline-none focus:border-primary/40 text-foreground cursor-pointer"
                  >
                    <option value="">{t("notes.linkMatchPlaceholder") || "Seleccionar partida..."}</option>
                    {[...matchHistory]
                      .sort((a, b) => b.gameCreation - a.gameCreation)
                      .slice(0, 20)
                      .map(m => {
                        const p = m.participants[m.playerParticipantIndex];
                        const date = new Date(m.gameCreation).toLocaleDateString(language === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short" });
                        const result = p.win ? "✓" : "✗";
                        return (
                          <option key={m.matchId} value={m.matchId}>
                            {result} {p.championName} · {p.kills}/{p.deaths}/{p.assists} · {date}
                          </option>
                        );
                      })}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder={t("notes.linkMatchPlaceholder")}
                    value={newLinkedMatchId}
                    onChange={e => setNewLinkedMatchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-[12px] focus:outline-none focus:border-primary/40"
                  />
                )}
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">{t("notes.vodTimestamp") || "VOD Timestamp"}</label>
                <input
                  type="text"
                  placeholder={t("notes.vodPlaceholder") || "e.g. 12:34 or https://youtu.be/..."}
                  value={newVodTimestamp}
                  onChange={e => setNewVodTimestamp(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-[12px] focus:outline-none focus:border-primary/40"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
                <button onClick={() => setShowNewNote(false)} className="px-4 py-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
                >
                  {t("notes.createNote")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <StickyNote className="w-12 h-12 text-muted-foreground/35" />
            </motion.div>
            <p className="text-[14px] text-muted-foreground">
              {search || selectedTag ? t("notes.noMatch") : t("notes.noNotes")}
            </p>
            <p className="text-[12px] text-muted-foreground/60">
              {search || selectedTag ? t("notes.tryOther") : t("notes.createFirst")}
            </p>
            {!search && !selectedTag && (
              <button
                onClick={() => setShowNewNote(true)}
                className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {t("qol.createFirstNote")}
              </button>
            )}
          </div>
        )}

        {filtered.map((note, index) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.02, duration: 0.2, ease: "easeOut" }}
            className={cn(
              "p-5 rounded-2xl bg-card border border-border/60 hover:border-border transition-colors group shadow-sm card-lift card-shine",
              note.pinned && "border-primary/20 bg-primary/[0.02]"
            )}
          >
            {editingNote === note.id ? (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-[14px] font-medium focus:outline-none focus:border-primary/40"
                />
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-[12px] resize-none focus:outline-none focus:border-primary/40"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingNote(null)} className="px-3 py-1.5 text-[11px] text-muted-foreground cursor-pointer">{t("common.cancel")}</button>
                  <button onClick={() => saveEdit(note.id)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium cursor-pointer">{t("common.save")}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {note.pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                    <h3 className="text-[14px] font-semibold text-foreground">{note.title}</h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => togglePin(note.id)} className={cn("p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer", note.pinned && "text-primary")}>
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => startEdit(note)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer">
                      <PenLine className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(note)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {(note.champion || note.matchup) && (
                  <div className="flex gap-2 mb-2">
                    {note.champion && (
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">{note.champion}</span>
                    )}
                    {note.matchup && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[10px] font-medium">{note.matchup}</span>
                    )}
                    {note.linkedMatchId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); try { sessionStorage.setItem("velaris-highlight-match", note.linkedMatchId!); } catch {} navigate("/matches"); }}
                        className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 text-[10px] font-medium flex items-center gap-1 hover:bg-sky-500/20 transition-colors cursor-pointer"
                        title="Ir a esta partida"
                      >
                        <Link2 className="w-3 h-3" />
                        {t("notes.linkedTo")}
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    )}
                  </div>
                )}

                {!note.champion && !note.matchup && note.linkedMatchId && (
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); try { sessionStorage.setItem("velaris-highlight-match", note.linkedMatchId!); } catch {} navigate("/matches"); }}
                      className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 text-[10px] font-medium flex items-center gap-1 hover:bg-sky-500/20 transition-colors cursor-pointer"
                      title="Ir a esta partida"
                    >
                      <Link2 className="w-3 h-3" />
                      {t("notes.linkedTo")}
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  </div>
                )}

                <MarkdownPreview content={note.content} className="line-clamp-4" />

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                  <div className="flex gap-1.5 flex-wrap">
                    {note.tags.map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-secondary text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{timeAgo(note.updatedAt, language)}</span>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!pendingDeleteNote}
        title={t("common.confirmDeleteNote")}
        description={t("common.confirmDeleteNoteDesc")}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteNote(null)}
      />
    </motion.div>
  );
}