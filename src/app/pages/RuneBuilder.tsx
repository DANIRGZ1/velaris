/**
 * Rune Page Builder — Velaris
 *
 * Interactive rune page builder with visual tree preview.
 * Users can select primary tree → keystone → minor runes → secondary tree → minor runes → stat shards.
 * Saved pages persist in localStorage. Includes presets for popular champions.
 *
 * All rune, tree & shard names are localized via runeLocale.ts using official Riot translations.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Save, Trash2, Copy, Check, RotateCcw, ChevronDown, BookOpen, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../components/ui/utils";
import {
  RUNE_TREES,
  RUNE_DATA,
  STAT_SHARDS,
  getRuneIconUrl,
  getTreeIconUrl,
  type RuneInfo,
  type RuneTreeInfo,
  type StatShardInfo,
} from "../data/runeData";
import { useLanguage } from "../contexts/LanguageContext";
import { PageHeader } from "../components/PageHeader";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  getLocalizedRuneName,
  getLocalizedTreeName,
  getLocalizedShardName,
  getLocalizedShardDesc,
} from "../data/runeLocale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RunePageConfig {
  id: string;
  name: string;
  primaryTreeId: number | null;
  keystoneId: number | null;
  primaryRunes: (number | null)[]; // [row1, row2, row3]
  secondaryTreeId: number | null;
  secondaryRunes: (number | null)[]; // [pick1, pick2] from different rows
  statShards: (number | null)[]; // [offense, flex, defense]
  champion?: string;
  createdAt: number;
}

interface ChampionPreset {
  name: string;
  champion: string;
  role: string;
  config: Omit<RunePageConfig, "id" | "name" | "createdAt">;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: ChampionPreset[] = [
  {
    name: "Jinx ADC",
    champion: "Jinx",
    role: "BOTTOM",
    config: {
      primaryTreeId: 8000, keystoneId: 8008,
      primaryRunes: [9111, 9104, 8014],
      secondaryTreeId: 8200, secondaryRunes: [8275, 8236],
      statShards: [5005, 5008, 5001],
    },
  },
  {
    name: "Ahri Mid",
    champion: "Ahri",
    role: "MIDDLE",
    config: {
      primaryTreeId: 8100, keystoneId: 8112,
      primaryRunes: [8139, 8138, 8135],
      secondaryTreeId: 8200, secondaryRunes: [8226, 8210],
      statShards: [5008, 5008, 5001],
    },
  },
  {
    name: "Darius Top",
    champion: "Darius",
    role: "TOP",
    config: {
      primaryTreeId: 8000, keystoneId: 8010,
      primaryRunes: [9111, 9104, 8299],
      secondaryTreeId: 8400, secondaryRunes: [8473, 8242],
      statShards: [5008, 5008, 5002],
    },
  },
  {
    name: "Thresh Support",
    champion: "Thresh",
    role: "UTILITY",
    config: {
      primaryTreeId: 8400, keystoneId: 8439,
      primaryRunes: [8463, 8473, 8242],
      secondaryTreeId: 8300, secondaryRunes: [8345, 8347],
      statShards: [5008, 5002, 5001],
    },
  },
  {
    name: "Lee Sin Jungle",
    champion: "LeeSin",
    role: "JUNGLE",
    config: {
      primaryTreeId: 8000, keystoneId: 8010,
      primaryRunes: [9111, 9104, 8299],
      secondaryTreeId: 8100, secondaryRunes: [8143, 8135],
      statShards: [5008, 5008, 5002],
    },
  },
  {
    name: "Lux Mid",
    champion: "Lux",
    role: "MIDDLE",
    config: {
      primaryTreeId: 8200, keystoneId: 8229,
      primaryRunes: [8226, 8210, 8237],
      secondaryTreeId: 8300, secondaryRunes: [8345, 8347],
      statShards: [5008, 5008, 5001],
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRunesByTree(treeId: number): { keystones: RuneInfo[]; rows: RuneInfo[][] } {
  const runes = Object.values(RUNE_DATA).filter(r => r.treeId === treeId);
  const keystones = runes.filter(r => r.row === 0);
  const rows: RuneInfo[][] = [
    runes.filter(r => r.row === 1),
    runes.filter(r => r.row === 2),
    runes.filter(r => r.row === 3),
  ];
  return { keystones, rows };
}

function getSecondaryRuneRows(treeId: number): RuneInfo[][] {
  const runes = Object.values(RUNE_DATA).filter(r => r.treeId === treeId && r.row > 0);
  return [
    runes.filter(r => r.row === 1),
    runes.filter(r => r.row === 2),
    runes.filter(r => r.row === 3),
  ];
}

const SHARD_ROWS: number[][] = [
  [5008, 5005, 5007],
  [5008, 5010, 5001],
  [5001, 5002, 5003],
];

function createEmptyPage(defaultName: string = "New Page"): RunePageConfig {
  return {
    id: crypto.randomUUID(),
    name: defaultName,
    primaryTreeId: null,
    keystoneId: null,
    primaryRunes: [null, null, null],
    secondaryTreeId: null,
    secondaryRunes: [null, null],
    statShards: [null, null, null],
    createdAt: Date.now(),
  };
}

// ─── Saved Pages Storage ──────────────────────────────────────────────────────

function loadSavedPages(): RunePageConfig[] {
  try {
    const raw = localStorage.getItem("velaris-rune-pages");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePagesToStorage(pages: RunePageConfig[]) {
  try { localStorage.setItem("velaris-rune-pages", JSON.stringify(pages)); } catch {}
}

// ─── Rune Slot Component ──────────────────────────────────────────────────────

function RuneSlot({
  rune, isSelected, isKeystone, isDisabled, onClick, treeColor, localName,
}: {
  rune: RuneInfo;
  isSelected: boolean;
  isKeystone?: boolean;
  isDisabled?: boolean;
  onClick: () => void;
  treeColor?: string;
  localName: string;
}) {
  const size = isKeystone ? "w-14 h-14" : "w-10 h-10";
  const imgSize = isKeystone ? "w-9 h-9" : "w-6 h-6";

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.1 } : undefined}
      whileTap={!isDisabled ? { scale: 0.95 } : undefined}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "rounded-full flex items-center justify-center transition-all relative group",
        size,
        isSelected
          ? "bg-primary/15 border-2 shadow-[0_0_12px_rgba(124,45,66,0.25)]"
          : "bg-black/15 border border-border/40 hover:border-border",
        isDisabled && "opacity-30 cursor-not-allowed",
        !isDisabled && !isSelected && "cursor-pointer hover:bg-black/25",
      )}
      style={{ borderColor: isSelected ? (treeColor || "var(--primary)") : undefined }}
      title={localName}
    >
      <img
        src={getRuneIconUrl(rune.id)}
        alt={localName}
        className={cn(imgSize, "rounded-full", !isSelected && !isDisabled && "opacity-50 group-hover:opacity-80", isSelected && "opacity-100")}
        loading="lazy"
      />
      {isSelected && (
        <motion.div
          layoutId={`glow-${rune.id}`}
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 16px ${treeColor || "var(--primary)"}40` }}
        />
      )}
    </motion.button>
  );
}

// ─── Stat Shard Slot ──────────────────────────────────────────────────────────

function ShardSlot({
  shard, isSelected, onClick, localName, localDesc,
}: {
  shard: StatShardInfo;
  isSelected: boolean;
  onClick: () => void;
  localName: string;
  localDesc: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
        isSelected
          ? "bg-primary/15 border-2 border-primary/60"
          : "bg-black/15 border border-border/40 hover:border-border cursor-pointer",
      )}
      title={`${localName}: ${localDesc}`}
    >
      <img
        src={getRuneIconUrl(shard.id)}
        alt={localName}
        className={cn("w-5 h-5 rounded-full", !isSelected && "opacity-50")}
        loading="lazy"
      />
    </motion.button>
  );
}

// ─── Tree Selector ────────────────────────────────────────────────────────────

function TreeSelector({
  label, selectedTreeId, excludeTreeId, onSelect, lang,
}: {
  label: string;
  selectedTreeId: number | null;
  excludeTreeId?: number | null;
  onSelect: (treeId: number) => void;
  lang: string;
}) {
  const trees = Object.values(RUNE_TREES).filter(t => t.id !== excludeTreeId);

  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">{label}</div>
      <div className="flex gap-2">
        {trees.map(tree => {
          const treeName = getLocalizedTreeName(tree.id, lang);
          return (
            <motion.button
              key={tree.id}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(tree.id)}
              className={cn(
                "w-11 h-11 rounded-lg flex items-center justify-center transition-all border",
                selectedTreeId === tree.id
                  ? "bg-primary/10 border-primary/40 shadow-md"
                  : "bg-secondary/40 border-border/30 hover:border-border/60 cursor-pointer",
              )}
              title={treeName}
            >
              <img
                src={getTreeIconUrl(tree.id)}
                alt={treeName}
                className={cn("w-6 h-6", selectedTreeId !== tree.id && "opacity-40")}
                loading="lazy"
              />
            </motion.button>
          );
        })}
      </div>
      {selectedTreeId && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("text-[11px] font-semibold mt-1.5 uppercase tracking-wider", RUNE_TREES[selectedTreeId]?.color)}
        >
          {getLocalizedTreeName(selectedTreeId, lang)}
        </motion.div>
      )}
    </div>
  );
}

// ─── Visual Preview Panel ─────────────────────────────────────────────────────

function RunePreview({ config, t, lang }: { config: RunePageConfig; t: (key: string) => string; lang: string }) {
  const primaryTree = config.primaryTreeId ? RUNE_TREES[config.primaryTreeId] : null;
  const secondaryTree = config.secondaryTreeId ? RUNE_TREES[config.secondaryTreeId] : null;
  const keystone = config.keystoneId ? RUNE_DATA[config.keystoneId] : null;
  const primaryRunes = config.primaryRunes.map(id => id ? RUNE_DATA[id] : null);
  const secondaryRunes = config.secondaryRunes.map(id => id ? RUNE_DATA[id] : null);
  const shards = config.statShards.map(id => id ? STAT_SHARDS[id] : null);

  const isComplete = keystone && primaryRunes.every(Boolean) && secondaryRunes.every(Boolean) && shards.every(Boolean);

  return (
    <div className="bg-card border border-border/50 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-primary" strokeWidth={2} />
        <span className="text-[12px] font-semibold text-foreground uppercase tracking-wider">{t("runes.preview")}</span>
        {isComplete && (
          <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            {t("runes.complete")}
          </span>
        )}
      </div>

      <div className="flex gap-8 justify-center">
        {/* Primary Tree */}
        <div className="flex flex-col items-center gap-3">
          {primaryTree ? (
            <>
              <div className="flex items-center gap-1.5">
                <img src={getTreeIconUrl(primaryTree.id)} alt={getLocalizedTreeName(primaryTree.id, lang)} className="w-5 h-5" />
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", primaryTree.color)}>
                  {getLocalizedTreeName(primaryTree.id, lang)}
                </span>
              </div>
              <div
                className="w-14 h-14 rounded-full border-2 flex items-center justify-center bg-black/20"
                style={{ borderColor: keystone ? primaryTree.colorHex : "transparent" }}
              >
                {keystone ? (
                  <img src={getRuneIconUrl(keystone.id)} alt={getLocalizedRuneName(keystone.id, lang)} className="w-9 h-9 rounded-full" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-border/20" />
                )}
              </div>
              <div className="w-px h-2 bg-border/30" />
              {primaryRunes.map((rune, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-black/15 border border-border/30 flex items-center justify-center">
                    {rune ? (
                      <img src={getRuneIconUrl(rune.id)} alt={getLocalizedRuneName(rune.id, lang)} className="w-6 h-6 rounded-full" title={getLocalizedRuneName(rune.id, lang)} />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-border/20" />
                    )}
                  </div>
                  {i < primaryRunes.length - 1 && <div className="w-px h-1 bg-border/20" />}
                </div>
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-30">
              <div className="w-12 h-12 rounded-full border border-dashed border-border/40 flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground">{t("runes.primary")}</span>
              </div>
            </div>
          )}
        </div>

        {/* Secondary Tree */}
        <div className="flex flex-col items-center gap-3 mt-8">
          {secondaryTree ? (
            <>
              <div className="flex items-center gap-1.5">
                <img src={getTreeIconUrl(secondaryTree.id)} alt={getLocalizedTreeName(secondaryTree.id, lang)} className="w-5 h-5" />
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", secondaryTree.color)}>
                  {getLocalizedTreeName(secondaryTree.id, lang)}
                </span>
              </div>
              {secondaryRunes.map((rune, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-black/15 border border-border/30 flex items-center justify-center">
                    {rune ? (
                      <img src={getRuneIconUrl(rune.id)} alt={getLocalizedRuneName(rune.id, lang)} className="w-6 h-6 rounded-full" title={getLocalizedRuneName(rune.id, lang)} />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-border/20" />
                    )}
                  </div>
                  {i < secondaryRunes.length - 1 && <div className="w-px h-1 bg-border/20" />}
                </div>
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-30">
              <div className="w-10 h-10 rounded-full border border-dashed border-border/40 flex items-center justify-center">
                <span className="text-[8px] text-muted-foreground">{t("runes.secondary")}</span>
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-col items-center gap-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{t("runes.shards")}</span>
            <div className="flex gap-1.5">
              {shards.map((shard, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-black/15 border border-border/30 flex items-center justify-center">
                  {shard ? (
                    <img src={getRuneIconUrl(shard.id)} alt={getLocalizedShardName(shard.id, lang)} className="w-4 h-4 rounded-full" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-border/20" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function RuneBuilder() {
  const { t, language } = useLanguage();
  const lang = language;

  const [savedPages, setSavedPages] = useState<RunePageConfig[]>(loadSavedPages);
  const [currentPage, setCurrentPage] = useState<RunePageConfig>(() => createEmptyPage(t("runes.newPage")));
  const [showPresets, setShowPresets] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [pendingDeletePageId, setPendingDeletePageId] = useState<string | null>(null);

  const SHARD_ROW_LABELS = useMemo(() => [
    t("runes.offense"), t("runes.flex"), t("runes.defense"),
  ], [t]);

  // ─── Derived data ──────────────────────────────────────────────────────────

  const primaryTreeData = useMemo(() => {
    if (!currentPage.primaryTreeId) return null;
    return getRunesByTree(currentPage.primaryTreeId);
  }, [currentPage.primaryTreeId]);

  const secondaryTreeRows = useMemo(() => {
    if (!currentPage.secondaryTreeId) return null;
    return getSecondaryRuneRows(currentPage.secondaryTreeId);
  }, [currentPage.secondaryTreeId]);

  const primaryTree = currentPage.primaryTreeId ? RUNE_TREES[currentPage.primaryTreeId] : null;
  const secondaryTree = currentPage.secondaryTreeId ? RUNE_TREES[currentPage.secondaryTreeId] : null;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const updatePage = useCallback((updates: Partial<RunePageConfig>) => {
    setCurrentPage(prev => ({ ...prev, ...updates }));
  }, []);

  const selectPrimaryTree = useCallback((treeId: number) => {
    setCurrentPage(prev => ({
      ...prev,
      primaryTreeId: treeId,
      keystoneId: null,
      primaryRunes: [null, null, null],
      ...(prev.secondaryTreeId === treeId ? { secondaryTreeId: null, secondaryRunes: [null, null] } : {}),
    }));
  }, []);

  const selectSecondaryTree = useCallback((treeId: number) => {
    setCurrentPage(prev => ({
      ...prev, secondaryTreeId: treeId, secondaryRunes: [null, null],
    }));
  }, []);

  const selectSecondaryRune = useCallback((runeId: number, _rowIndex: number) => {
    setCurrentPage(prev => {
      const newRunes = [...prev.secondaryRunes];
      const rune = RUNE_DATA[runeId];
      if (!rune) return prev;

      const existingIdx = newRunes.findIndex(id => {
        if (!id) return false;
        const existing = RUNE_DATA[id];
        return existing && existing.row === rune.row;
      });

      if (existingIdx >= 0) {
        newRunes[existingIdx] = runeId;
      } else {
        const emptyIdx = newRunes.indexOf(null);
        if (emptyIdx >= 0) {
          newRunes[emptyIdx] = runeId;
        } else {
          newRunes[0] = newRunes[1];
          newRunes[1] = runeId;
        }
      }
      return { ...prev, secondaryRunes: newRunes };
    });
  }, []);

  const selectPrimaryRune = useCallback((runeId: number, rowIndex: number) => {
    setCurrentPage(prev => {
      const newRunes = [...prev.primaryRunes];
      newRunes[rowIndex] = runeId;
      return { ...prev, primaryRunes: newRunes };
    });
  }, []);

  const selectStatShard = useCallback((shardId: number, rowIndex: number) => {
    setCurrentPage(prev => {
      const newShards = [...prev.statShards];
      newShards[rowIndex] = shardId;
      return { ...prev, statShards: newShards };
    });
  }, []);

  const savePage = useCallback(() => {
    setSavedPages(prev => {
      const existing = prev.findIndex(p => p.id === currentPage.id);
      const updated = existing >= 0
        ? prev.map((p, i) => i === existing ? currentPage : p)
        : [...prev, currentPage];
      savePagesToStorage(updated);
      return updated;
    });
    toast.success(t("qol.runePageSaved"));
  }, [currentPage, t]);

  const deletedPageRef = useRef<RunePageConfig | null>(null);

  const deleteSavedPage = useCallback((id: string) => {
    setSavedPages(prev => {
      const removed = prev.find(p => p.id === id);
      if (removed) deletedPageRef.current = removed;
      const updated = prev.filter(p => p.id !== id);
      savePagesToStorage(updated);
      return updated;
    });
    toast(t("qol.runePageDeleted"), {
      action: {
        label: t("qol.undo"),
        onClick: () => {
          if (deletedPageRef.current) {
            setSavedPages(prev => {
              const next = [...prev, deletedPageRef.current!];
              savePagesToStorage(next);
              return next;
            });
          }
        },
      },
    });
  }, [t]);

  const loadPreset = useCallback((preset: ChampionPreset) => {
    setCurrentPage({
      ...createEmptyPage(preset.name),
      name: preset.name,
      champion: preset.champion,
      ...preset.config,
    });
    setShowPresets(false);
  }, []);

  const resetPage = useCallback(() => {
    setCurrentPage(createEmptyPage(t("runes.newPage")));
    toast(t("qol.runePageReset"));
  }, [t]);

  // Keyboard shortcuts: Ctrl+S to save, Ctrl+R to reset
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        savePage();
      }
      if (e.key === "r" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        resetPage();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [savePage, resetPage]);

  const copyAsText = useCallback(() => {
    const ks = currentPage.keystoneId ? getLocalizedRuneName(currentPage.keystoneId, lang) : "—";
    const primary = currentPage.primaryRunes.map(id => id ? getLocalizedRuneName(id, lang) : "—").join(" / ");
    const secondary = currentPage.secondaryRunes.map(id => id ? getLocalizedRuneName(id, lang) : "—").join(" / ");
    const shards = currentPage.statShards.map(id => id ? getLocalizedShardName(id, lang) : "—").join(" / ");
    const treePrimary = currentPage.primaryTreeId ? getLocalizedTreeName(currentPage.primaryTreeId, lang) : "—";
    const treeSec = currentPage.secondaryTreeId ? getLocalizedTreeName(currentPage.secondaryTreeId, lang) : "—";
    const text = `${currentPage.name}\n${treePrimary} + ${treeSec}\nKeystone: ${ks}\nPrimary: ${primary}\nSecondary: ${secondary}\nShards: ${shards}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(t("qol.runePageCopied"));
    setTimeout(() => setCopied(false), 2000);
  }, [currentPage, lang, t]);

  const usedSecondaryRows = useMemo(() => {
    return new Set(
      currentPage.secondaryRunes
        .filter(Boolean)
        .map(id => RUNE_DATA[id!]?.row)
        .filter(Boolean)
    );
  }, [currentPage.secondaryRunes]);

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title={t("runes.builder")}
        subtitle={t("runes.builderSubtitle")}
        icon={Sparkles}
        label="TOOLKIT"
        badge="Interactive"
        badgeVariant="primary"
        breadcrumbs={[
          { label: t("nav.dashboard"), to: "/dashboard" },
          { label: t("runes.breadcrumb") },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground bg-secondary/60 hover:bg-secondary rounded-md transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" />
              {t("runes.presets")}
              <ChevronDown className={cn("w-3 h-3 transition-transform", showPresets && "rotate-180")} />
            </button>
            <button
              onClick={resetPage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground bg-secondary/60 hover:bg-secondary rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("runes.reset")}
            </button>
            <button
              onClick={copyAsText}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground bg-secondary/60 hover:bg-secondary rounded-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t("runes.copied") : t("runes.copy")}
            </button>
            <button
              onClick={savePage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors font-semibold"
            >
              <Save className="w-3.5 h-3.5" />
              {t("runes.save")}
            </button>
          </div>
        }
      />

      {/* Presets dropdown */}
      <AnimatePresence>
        {showPresets && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t("runes.championPresets")}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => loadPreset(preset)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-secondary/30 hover:bg-secondary/60 border border-border/30 hover:border-border/50 transition-all text-left group"
                  >
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${preset.champion}.png`}
                      alt={preset.champion}
                      className="w-8 h-8 rounded-md"
                    />
                    <div>
                      <div className="text-[12px] font-semibold text-foreground group-hover:text-primary transition-colors">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {getLocalizedTreeName(preset.config.primaryTreeId!, lang)} + {getLocalizedTreeName(preset.config.secondaryTreeId!, lang)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Name */}
      <div className="mb-6">
        {editingName ? (
          <input
            autoFocus
            className="text-[18px] font-semibold text-foreground bg-transparent border-b border-primary/40 outline-none pb-0.5"
            value={currentPage.name}
            onChange={e => updatePage({ name: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => e.key === "Enter" && setEditingName(false)}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-[18px] font-semibold text-foreground hover:text-primary transition-colors"
          >
            {currentPage.name}
          </button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Left: Builder */}
        <div className="flex-1 space-y-6">
          {/* Primary Tree Selection */}
          <div className="bg-card border border-border/50 rounded-lg p-5">
            <TreeSelector
              label={t("runes.primaryPath")}
              selectedTreeId={currentPage.primaryTreeId}
              onSelect={selectPrimaryTree}
              lang={lang}
            />

            {primaryTreeData && primaryTree && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">{t("runes.keystone")}</div>
                <div className="flex gap-3 mb-5">
                  {primaryTreeData.keystones.map(ks => (
                    <RuneSlot
                      key={ks.id}
                      rune={ks}
                      isSelected={currentPage.keystoneId === ks.id}
                      isKeystone
                      onClick={() => updatePage({ keystoneId: ks.id })}
                      treeColor={primaryTree.colorHex}
                      localName={getLocalizedRuneName(ks.id, lang)}
                    />
                  ))}
                </div>

                {primaryTreeData.rows.map((row, ri) => (
                  <div key={ri} className="mb-4">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-2">
                      {t("runes.slot").replace("{num}", String(ri + 1))}
                    </div>
                    <div className="flex gap-3">
                      {row.map(rune => (
                        <RuneSlot
                          key={rune.id}
                          rune={rune}
                          isSelected={currentPage.primaryRunes[ri] === rune.id}
                          onClick={() => selectPrimaryRune(rune.id, ri)}
                          treeColor={primaryTree.colorHex}
                          localName={getLocalizedRuneName(rune.id, lang)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Secondary Tree */}
          <div className="bg-card border border-border/50 rounded-lg p-5">
            <TreeSelector
              label={t("runes.secondaryPath")}
              selectedTreeId={currentPage.secondaryTreeId}
              excludeTreeId={currentPage.primaryTreeId}
              onSelect={selectSecondaryTree}
              lang={lang}
            />

            {secondaryTreeRows && secondaryTree && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
                  {t("runes.pick2")}
                </div>
                {secondaryTreeRows.map((row, ri) => {
                  const rowNum = ri + 1;
                  const isRowFull = usedSecondaryRows.size >= 2 && !usedSecondaryRows.has(rowNum);
                  return (
                    <div key={ri} className="mb-4">
                      <div className="flex gap-3">
                        {row.map(rune => (
                          <RuneSlot
                            key={rune.id}
                            rune={rune}
                            isSelected={currentPage.secondaryRunes.includes(rune.id)}
                            isDisabled={isRowFull && !currentPage.secondaryRunes.includes(rune.id)}
                            onClick={() => selectSecondaryRune(rune.id, ri)}
                            treeColor={secondaryTree.colorHex}
                            localName={getLocalizedRuneName(rune.id, lang)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </div>

          {/* Stat Shards */}
          <div className="bg-card border border-border/50 rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
              {t("runes.statShards")}
            </div>
            {SHARD_ROWS.map((row, ri) => (
              <div key={ri} className="mb-3 flex items-center gap-3">
                <span className="text-[9px] text-muted-foreground/60 min-w-[50px] uppercase tracking-wider">
                  {SHARD_ROW_LABELS[ri]}
                </span>
                <div className="flex gap-2">
                  {row.map(shardId => {
                    const shard = STAT_SHARDS[shardId];
                    if (!shard) return null;
                    return (
                      <ShardSlot
                        key={`${ri}-${shardId}`}
                        shard={shard}
                        isSelected={currentPage.statShards[ri] === shardId}
                        onClick={() => selectStatShard(shardId, ri)}
                        localName={getLocalizedShardName(shardId, lang)}
                        localDesc={getLocalizedShardDesc(shardId, lang)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Preview + Saved Pages */}
        <div className="w-[280px] shrink-0 space-y-5">
          <RunePreview config={currentPage} t={t} lang={lang} />

          {/* Saved Pages */}
          <div className="bg-card border border-border/50 rounded-lg p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t("runes.savedPages").replace("{count}", String(savedPages.length))}
            </div>
            {savedPages.length === 0 ? (
              <div className="text-[11px] text-muted-foreground/60 italic py-3 text-center flex flex-col items-center gap-2">
                <span>{t("runes.noSavedPages")}</span>
                <span className="text-[10px]">{t("qol.noSavedPagesDesc")}</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {savedPages.map(page => {
                  const tree = page.primaryTreeId ? RUNE_TREES[page.primaryTreeId] : null;
                  const ks = page.keystoneId ? RUNE_DATA[page.keystoneId] : null;
                  return (
                    <div
                      key={page.id}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-md border transition-all cursor-pointer group",
                        page.id === currentPage.id
                          ? "bg-primary/8 border-primary/25"
                          : "bg-secondary/20 border-border/30 hover:border-border/50",
                      )}
                      onClick={() => setCurrentPage(page)}
                    >
                      {ks && (
                        <div
                          className="w-7 h-7 rounded-full border flex items-center justify-center bg-black/20 shrink-0"
                          style={{ borderColor: tree?.colorHex + "60" }}
                        >
                          <img src={getRuneIconUrl(ks.id)} alt={getLocalizedRuneName(ks.id, lang)} className="w-5 h-5 rounded-full" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-foreground truncate">{page.name}</div>
                        <div className="text-[9px] text-muted-foreground truncate">
                          {page.primaryTreeId ? getLocalizedTreeName(page.primaryTreeId, lang) : "—"}{" "}
                          {page.secondaryTreeId ? `+ ${getLocalizedTreeName(page.secondaryTreeId, lang)}` : ""}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingDeletePageId(page.id); }}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(pendingDeletePageId)}
        title={t("common.confirmDeleteRune")}
        description={t("common.confirmDeleteRuneDesc")}
        onConfirm={() => {
          if (pendingDeletePageId) deleteSavedPage(pendingDeletePageId);
          setPendingDeletePageId(null);
        }}
        onCancel={() => setPendingDeletePageId(null)}
      />
    </div>
  );
}