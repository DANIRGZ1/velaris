import { motion, AnimatePresence } from "motion/react";
import { CircleCheck, Circle, CirclePlay, MoreHorizontal, Loader2, Info, ArrowUpDown, ChevronsDownUp, EyeOff, ListTodo, Plus, X, Check } from "lucide-react";
import { cn } from "../components/ui/utils";
import { getLearningTasks, type LearningTask } from "../services/dataService";
import { useAsyncData } from "../hooks/useAsyncData";
import { useState, useRef, useEffect, useMemo } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { PageHeader } from "../components/PageHeader";
import { LearningSkeleton } from "../components/Skeletons";
import { ErrorState } from "../components/ErrorState";

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-500 bg-red-500/10",
  medium: "text-amber-500 bg-amber-500/10",
  low: "text-blue-500 bg-blue-500/10",
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const CUSTOM_TASKS_KEY = "velaris-custom-learning-tasks";

function loadCustomTasks(): LearningTask[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomTasks(tasks: LearningTask[]) {
  try { localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(tasks)); } catch {}
}

export function LearningPath() {
  const { t } = useLanguage();
  const { data: generatedTasks, isLoading, error } = useAsyncData(() => getLearningTasks(t), [t]);
  const [customTasks, setCustomTasks] = useState<LearningTask[]>(() => loadCustomTasks());
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");

  const tasks = useMemo(() => {
    const base = generatedTasks ?? [];
    return [...base, ...customTasks];
  }, [generatedTasks, customTasks]);

  const addCustomTask = () => {
    if (!newTaskTitle.trim()) return;
    const task: LearningTask = {
      id: `custom-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || t("learn.customTask"),
      type: "custom",
      priority: newTaskPriority,
      estimatedLpGain: "0",
      source: t("learn.createdManually"),
      status: "todo",
    };
    const updated = [...customTasks, task];
    setCustomTasks(updated);
    saveCustomTasks(updated);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskPriority("medium");
    setShowNewTask(false);
  };

  const removeCustomTask = (id: string) => {
    const updated = customTasks.filter(t => t.id !== id);
    setCustomTasks(updated);
    saveCustomTasks(updated);
  };

  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(new Set());
  const [sortedCols, setSortedCols] = useState<Set<string>>(new Set());
  const [hideMasteredCompleted, setHideMasteredCompleted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (isLoading && !tasks) {
    return <LearningSkeleton />;
  }
  if (error && !tasks) {
    return <ErrorState error={error} />;
  }

  const columns: { id: LearningTask["status"]; title: string; color: string; icon: typeof Circle }[] = [
    { id: "todo", title: t("learn.todo"), color: "bg-muted text-muted-foreground", icon: Circle },
    { id: "in_progress", title: t("learn.inProgress"), color: "bg-primary/20 text-primary", icon: CirclePlay },
    { id: "mastered", title: t("learn.mastered"), color: "bg-green-500/20 text-green-500", icon: CircleCheck },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full flex flex-col font-sans h-full pt-4 pb-20">
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader
          title={t("learn.title")}
          subtitle={t("learn.objectives").replace("{count}", String(tasks.length))}
          icon={ListTodo}
          className="mb-0"
        />
        <button
          onClick={() => setShowNewTask(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 transition-opacity cursor-pointer shrink-0 mt-1"
        >
          <Plus className="w-4 h-4" />
          Nueva tarea
        </button>
      </div>

      {/* New custom task form */}
      <AnimatePresence>
        {showNewTask && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="p-5 rounded-2xl bg-card border border-primary/20 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">{t("learn.newCustomTask")}</span>
                <button onClick={() => setShowNewTask(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <input
                type="text"
                placeholder={t("learn.taskTitlePlaceholder")}
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-[13px] focus:outline-none focus:border-primary/40"
                autoFocus
              />
              <input
                type="text"
                placeholder={t("learn.taskDescPlaceholder")}
                value={newTaskDesc}
                onChange={e => setNewTaskDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-[12px] focus:outline-none focus:border-primary/40"
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{t("learn.priority")}</span>
                {(["high", "medium", "low"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewTaskPriority(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer",
                      newTaskPriority === p ? PRIORITY_COLORS[p] + " border-current/30" : "bg-secondary/50 text-muted-foreground border-border/40"
                    )}
                  >
                    {p === "high" ? t("learn.priorityHigh") : p === "medium" ? t("learn.priorityMedium") : t("learn.priorityLow")}
                  </button>
                ))}
                <div className="ml-auto flex gap-2">
                  <button onClick={() => setShowNewTask(false)} className="px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{t("common.cancel")}</button>
                  <button
                    onClick={addCustomTask}
                    disabled={!newTaskTitle.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" /> {t("learn.create")}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {columns.map(col => {
          const Icon = col.icon;
          let colTasks = tasks.filter(t => t.status === col.id);
          // Hide completed in "mastered" column if option is on
          if (hideMasteredCompleted && col.id === "mastered") {
            colTasks = [];
          }
          // Sort by priority if toggled
          if (sortedCols.has(col.id)) {
            colTasks = [...colTasks].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99));
          }
          const isCollapsed = collapsedCols.has(col.id);
          return (
            <div key={col.id} className="flex-1 min-w-[300px] flex flex-col gap-4">
              <div className="flex items-center justify-between group relative">
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", col.color.split(" ")[1])} strokeWidth={2.5} />
                  <h3 className="text-[14px] font-medium text-foreground">{col.title}</h3>
                  <span className="text-[12px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded-md">{colTasks.length}</span>
                  {sortedCols.has(col.id) && <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">{t("learn.priority")}</span>}
                </div>
                <div ref={openMenu === col.id ? menuRef : undefined} className="relative">
                  <button onClick={() => setOpenMenu(openMenu === col.id ? null : col.id)} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded cursor-pointer">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {openMenu === col.id && (
                    <div className="absolute right-0 top-full mt-1 bg-card border border-border/60 rounded-lg shadow-xl z-30 overflow-hidden min-w-[180px]">
                      <button onClick={() => { setSortedCols(prev => { const n = new Set(prev); n.has(col.id) ? n.delete(col.id) : n.add(col.id); return n; }); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-secondary/50 transition-colors flex items-center gap-2 cursor-pointer text-foreground">
                        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                        {sortedCols.has(col.id) ? t("learn.removeSort") : t("learn.sortByPriority")}
                      </button>
                      <button onClick={() => { setCollapsedCols(prev => { const n = new Set(prev); n.has(col.id) ? n.delete(col.id) : n.add(col.id); return n; }); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-secondary/50 transition-colors flex items-center gap-2 cursor-pointer text-foreground">
                        <ChevronsDownUp className="w-3.5 h-3.5 text-muted-foreground" />
                        {isCollapsed ? t("learn.expandCol") : t("learn.collapseCol")}
                      </button>
                      {col.id === "mastered" && (
                        <button onClick={() => { setHideMasteredCompleted(!hideMasteredCompleted); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-secondary/50 transition-colors flex items-center gap-2 cursor-pointer text-foreground">
                          <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                          {hideMasteredCompleted ? t("learn.showCompleted") : t("learn.hideCompleted")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!isCollapsed && (
                <div className="flex flex-col gap-3">
                  {colTasks.map(task => {
                    const isExpanded = expandedTask === task.id;
                    return (
                      <div key={task.id} className="bg-card border border-border/60 hover:border-primary/50 transition-colors p-4 rounded-xl cursor-pointer shadow-sm flex flex-col gap-3 card-lift card-shine" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-medium text-foreground leading-snug flex-1">{task.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", PRIORITY_COLORS[task.priority])}>{t(`priority.${task.priority}`)}</span>
                            {task.id.startsWith("custom-") && (
                              <button
                                onClick={(e) => { e.stopPropagation(); removeCustomTask(task.id); }}
                                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                title="Eliminar tarea"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[12px] text-muted-foreground leading-relaxed">{task.description}</p>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">{task.id}</span>
                            <span className="text-[11px] bg-secondary text-foreground px-2 py-0.5 rounded font-medium">{task.type}</span>
                          </div>
                          <span className="text-[12px] font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded">{task.estimatedLpGain} LP</span>
                        </div>
                        {isExpanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 pt-2 border-t border-border/40">
                            <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/60 bg-secondary/30 p-2 rounded">
                              <Info className="w-3 h-3 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 block mb-0.5">{t("learn.sourceLabel")}</span>
                                {task.source}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div className="py-8 text-center text-[13px] text-muted-foreground/50 border border-dashed border-border/40 rounded-xl">{t("learn.noTasks")}</div>
                  )}
                </div>
              )}
              {isCollapsed && (
                <div className="py-6 text-center text-[12px] text-muted-foreground/50 border border-dashed border-border/40 rounded-xl cursor-pointer hover:bg-secondary/20 transition-colors" onClick={() => setCollapsedCols(prev => { const n = new Set(prev); n.delete(col.id); return n; })}>
                  {colTasks.length} {t("learn.hiddenTasks")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}