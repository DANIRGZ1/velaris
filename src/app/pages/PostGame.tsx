import { motion } from "motion/react";
import { ArrowUpRight, ArrowDownRight, ArrowRight, Sparkles, BarChart3, AlertCircle, LayoutDashboard, History, StickyNote, Check } from "lucide-react";
import { cn } from "../components/ui/utils";
import { getPostGameAnalysis } from "../services/dataService";
import { useAsyncData } from "../hooks/useAsyncData";
import { useLanguage } from "../contexts/LanguageContext";
import { RuneTreeFull } from "../components/RuneTreeDisplay";
import { GameTimeline } from "../components/GameTimeline";
import { ItemBuildDisplay } from "../components/ItemBuildDisplay";
import { PostGameSkeleton } from "../components/Skeletons";
import { LaneComparison } from "../components/LaneComparison";
import { DeathMap } from "../components/DeathMap";
import { useCelebration } from "../contexts/CelebrationContext";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useCountUp } from "../hooks/useCountUp";
import { useNotes } from "../contexts/NotesContext";
import { toast } from "sonner";

// Animated stat card — each mounts with its own count-up animation
function StatCard({ stat, index }: { stat: { label: string; value: string; sub: string; color: string; raw?: number; format?: (n: number) => string }; index: number }) {
  const animated = useCountUp(stat.raw ?? 0, 900, index * 60);
  const display = stat.raw !== undefined && stat.format ? stat.format(animated) : stat.value;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.05, duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-1 p-4 rounded-xl border border-border/40 bg-card hover:bg-secondary/20 transition-colors"
    >
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
      <span className={cn("text-[20px] font-mono font-bold mt-1 tabular-nums", stat.color)}>{display}</span>
      <span className="text-[11px] text-muted-foreground">{stat.sub}</span>
    </motion.div>
  );
}

const PHASE_COLORS: Record<string, string> = {
  winning: "bg-emerald-500",
  neutral: "bg-muted-foreground/30",
  losing: "bg-destructive",
};

export function PostGame() {
  const { t } = useLanguage();
  const { checkForCelebrations } = useCelebration();
  const { version: patchVersion } = usePatchVersion();
  const [searchParams] = useSearchParams();
  const matchIndex = Math.max(0, parseInt(searchParams.get("match") ?? "0", 10) || 0);
  const { data, isLoading, error } = useAsyncData(() => getPostGameAnalysis(matchIndex, t), [matchIndex, t]);
  const navigate = useNavigate();
  const { addNote } = useNotes();
  const [noteSaved, setNoteSaved] = useState(false);

  // Trigger celebration check immediately when PostGame mounts (new match just ended).
  // checkForCelebrations is stable (useCallback in CelebrationProvider), safe in deps.
  useEffect(() => {
    checkForCelebrations();
  }, [checkForCelebrations]);

  if (isLoading && !data) {
    return <PostGameSkeleton />;
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="w-6 h-6 text-destructive" />
        <span className="text-sm text-muted-foreground">{error}</span>
      </div>
    );
  }

  if (!data) return null;

  const { player, match, allies, enemies, csPerMin, kda, damageShare, goldShare, visionPerMin, killParticipation, strengths, criticalError, coachSummary, phases } = data;

  // Find lane opponent
  const laneOpponent = player.teamPosition
    ? enemies.find(e => e.teamPosition === player.teamPosition)
    : undefined;

  const durationMin = Math.floor(match.gameDuration / 60);
  const durationSec = match.gameDuration % 60;
  const durationStr = `${durationMin}:${String(durationSec).padStart(2, "0")}`;

  const posLabel = (pos: string) => pos === "MIDDLE" ? t("role.mid") || "MID" : pos === "BOTTOM" ? t("role.adc") || "ADC" : pos === "JUNGLE" ? t("role.jgl") || "JGL" : pos === "UTILITY" ? t("role.sup") || "SUP" : pos === "TOP" ? t("role.top") || "TOP" : pos;

  const dmgData = allies.map((p) => ({
    name: `${p.puuid === player.puuid ? t("postgame.you") : posLabel(p.teamPosition)} (${p.championName})`,
    dmg: p.totalDamageDealtToChampions,
    isYou: p.puuid === player.puuid,
  })).sort((a, b) => b.dmg - a.dmg);

  const stats = [
    { label: "KDA", value: `${player.kills}/${player.deaths}/${player.assists}`, sub: `${kda} Ratio`, color: player.win ? "text-emerald-500" : "text-destructive" },
    { label: "CS/Min", value: String(csPerMin), sub: `${player.totalMinionsKilled + player.neutralMinionsKilled} Total`, color: csPerMin >= 7.5 ? "text-emerald-500" : "text-amber-500", raw: Math.round(csPerMin * 10), format: (n: number) => (n / 10).toFixed(1) },
    { label: t("postgame.killPart"), value: `${killParticipation}%`, sub: `${t("common.average")}: 55%`, color: killParticipation >= 55 ? "text-emerald-500" : "text-amber-500", raw: killParticipation, format: (n: number) => `${n}%` },
    { label: t("postgame.vision"), value: String(player.visionScore), sub: `${visionPerMin}/min`, color: visionPerMin >= 1.0 ? "text-primary" : "text-muted-foreground", raw: player.visionScore, format: (n: number) => String(n) },
    { label: t("postgame.dmg"), value: `${(player.totalDamageDealtToChampions / 1000).toFixed(1)}k`, sub: `${damageShare}% ${t("postgame.ofTeam")}`, color: "text-foreground", raw: Math.round(player.totalDamageDealtToChampions / 100), format: (n: number) => `${(n / 10).toFixed(1)}k` },
    { label: t("postgame.gold"), value: `${(player.goldEarned / 1000).toFixed(1)}k`, sub: `${Math.round(player.goldEarned / durationMin)}/min`, color: "text-yellow-500", raw: Math.round(player.goldEarned / 100), format: (n: number) => `${(n / 10).toFixed(1)}k` },
    { label: t("postgame.goldSpent"), value: `${(player.goldSpent / 1000).toFixed(1)}k`, sub: `${goldShare}% ${t("postgame.ofTeam")}`, color: "text-foreground", raw: Math.round(player.goldSpent / 100), format: (n: number) => `${(n / 10).toFixed(1)}k` },
    { label: t("postgame.dmgTaken"), value: `${(player.totalDamageTaken / 1000).toFixed(1)}k`, sub: t("common.total"), color: "text-muted-foreground", raw: Math.round(player.totalDamageTaken / 100), format: (n: number) => `${(n / 10).toFixed(1)}k` },
  ];

  const roleLabel = posLabel(player.teamPosition);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }} className="w-full flex flex-col gap-10 pb-20 font-sans">
      {/* Animated Gradient Header */}
      <header className="relative rounded-[20px] overflow-hidden border border-border/40">
        {/* Gradient background */}
        <div className={cn(
          "absolute inset-0",
          player.win
            ? "bg-gradient-to-br from-emerald-500/15 via-emerald-600/8 to-transparent"
            : "bg-gradient-to-br from-red-500/15 via-red-600/8 to-transparent"
        )} />
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "absolute rounded-full",
                player.win ? "bg-emerald-400/20" : "bg-red-400/20"
              )}
              style={{
                width: 4 + (i % 3) * 3,
                height: 4 + (i % 3) * 3,
                left: `${15 + i * 14}%`,
                top: `${20 + (i % 2) * 40}%`,
              }}
              animate={{
                y: [0, -12, 0],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 2.5 + i * 0.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 px-8 py-7 flex items-center gap-6">
          {/* Champion portrait */}
          <div className={cn(
            "w-16 h-16 rounded-2xl overflow-hidden border-2 shrink-0 shadow-lg",
            player.win ? "border-emerald-500/50" : "border-red-500/50"
          )}>
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${player.championName}.png`}
              alt={player.championName}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className={cn(
                "text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full",
                player.win
                  ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                  : "bg-red-500/15 text-red-500 border border-red-500/20"
              )}>
                {player.win ? t("common.victory") : t("common.defeat")}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">{durationStr}</span>
              <span className="text-[11px] text-muted-foreground">&bull;</span>
              <span className="text-[11px] text-muted-foreground">{roleLabel}</span>
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground">{t("postgame.matchReview")}</h1>
            <div className="flex items-center gap-4 mt-1.5">
              <span className={cn(
                "text-[15px] font-mono font-bold",
                player.win ? "text-emerald-500" : "text-foreground"
              )}>
                {player.kills}/{player.deaths}/{player.assists}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {csPerMin} CS/m &bull; {killParticipation}% KP &bull; {damageShare}% DMG
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Coach Summary */}
      <div className="bg-card border border-border shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)] rounded-[20px] p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="relative z-10 flex items-start gap-5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm shrink-0">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">{t("postgame.coachSummary")}</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-3xl">{coachSummary}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid — each stat animates in with a count-up */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={i} stat={stat} index={i} />
        ))}
      </div>

      {/* Build & Runes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Item Build */}
        {(() => {
          const items = [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5, player.item6].filter(Boolean);
          if (items.length === 0) return null;
          return (
            <div className="bg-card border border-border shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)] rounded-[20px] p-6 flex flex-col gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{t("postgame.itemBuild") || "Item Build"}</h3>
              <ItemBuildDisplay items={items} variant="full" />
            </div>
          );
        })()}
        
        {/* Runes */}
        {(player.perk0 && player.perk0 > 0) && (
          <div className="bg-card border border-border shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)] rounded-[20px] p-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{t("postgame.runesUsed") || "Runes"}</h3>
            <RuneTreeFull perks={player} />
          </div>
        )}
      </div>

      {/* Lane Matchup Comparison */}
      {laneOpponent && (
        <LaneComparison
          player={player}
          opponent={laneOpponent}
          gameDuration={match.gameDuration}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Damage Chart */}
        <div className="flex flex-col gap-5 bg-card border border-border shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)] rounded-[20px] p-6 lg:col-span-1">
          <div className="flex items-center gap-2 pb-4 border-b border-border">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{t("postgame.dmgChampions")}</h3>
          </div>
          <div className="flex flex-col gap-3 mt-2">
            {dmgData.map((entry, index) => {
              const maxDmg = Math.max(...dmgData.map(d => d.dmg), 1);
              const pct = (entry.dmg / maxDmg) * 100;
              return (
                <div key={index} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[12px] font-mono", entry.isYou ? "text-primary font-semibold" : "text-muted-foreground")}>{entry.name}</span>
                    <span className={cn("text-[12px] font-mono tabular-nums", entry.isYou ? "text-primary font-semibold" : "text-muted-foreground")}>{(entry.dmg / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", entry.isYou ? "bg-primary" : "bg-muted-foreground/40")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:col-span-2">
          {/* Strengths */}
          <div className="flex flex-col gap-5 bg-card border border-border shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)] rounded-[20px] p-6">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
              <ArrowUpRight className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{t("postgame.whatWentWell")}</h3>
            </div>
            <div className="flex flex-col gap-4">
              {strengths.map((s, i) => (
                <div key={i} className="flex flex-col gap-1.5 p-4 bg-secondary/50 rounded-xl border border-border/50">
                  <h4 className="font-semibold text-foreground text-[15px]">{s.title}</h4>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Error */}
          {criticalError ? (
            <div className="flex flex-col gap-5 bg-card border border-destructive/20 shadow-[0_2px_12px_-4px_rgba(255,59,48,0.08)] rounded-[20px] p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
              <div className="relative z-10 flex items-center gap-2 pb-4 border-b border-destructive/10">
                <ArrowDownRight className="w-5 h-5 text-destructive" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-destructive">{t("postgame.criticalError")} ({criticalError.timestamp})</h3>
              </div>
              <div className="relative z-10 flex flex-col gap-4">
                <h4 className="font-semibold text-foreground text-[16px]">{criticalError.title}</h4>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{criticalError.description}</p>
                <div className="mt-2 p-4 bg-foreground rounded-xl shadow-lg flex items-start gap-3">
                  <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-background/60 mb-1">{t("postgame.solution")}</span>
                    <span className="text-[13px] text-background/90 leading-relaxed">{criticalError.solution}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 bg-card border border-emerald-500/20 rounded-[20px] p-6 relative overflow-hidden">
              <div className="relative z-10 flex items-center gap-2 pb-4 border-b border-emerald-500/10">
                <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-500">{t("postgame.noCriticalErrors")}</h3>
              </div>
              <p className="text-[14px] text-muted-foreground leading-relaxed relative z-10">
                {t("postgame.noCriticalDesc")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Game Flow Phases */}
      <div className="bg-card border border-border shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)] rounded-[20px] p-6 flex flex-col gap-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-2">{t("postgame.gameFlow")}</h3>
        <div className="relative h-2 bg-secondary rounded-full overflow-hidden flex">
          {phases.map((phase, i) => (
            <div key={i} className={cn("h-full transition-all duration-1000", PHASE_COLORS[phase.type])} style={{ width: `${phase.width}%` }} />
          ))}
        </div>
        <div className="flex justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-widest font-mono">
          {phases.map((phase, i) => (<span key={i}>{phase.label.split(" - ")[0]}</span>))}
          <span>{durationStr}</span>
        </div>
      </div>

      {/* Interactive Event Timeline */}
      <div className="bg-card border border-border shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)] rounded-[20px] p-6 flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{t("postgame.eventTimeline") || "Event Timeline"}</h3>
        <GameTimeline match={match} />
      </div>

      {/* Death Map */}
      {player.deathTimestamps.length > 0 && (
        <DeathMap
          deathTimestamps={player.deathTimestamps}
          gameDuration={match.gameDuration}
          championName={player.championName}
          win={player.win}
        />
      )}

      {/* Navigation CTAs */}
      <div className="flex items-center justify-center gap-3 pt-4 pb-2 flex-wrap">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[13px] font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4" />
          {t("postgame.backToDashboard")}
        </button>
        <button
          onClick={() => navigate("/matches")}
          className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-[13px] font-medium hover:bg-secondary/80 transition-colors cursor-pointer"
        >
          <History className="w-4 h-4" />
          {t("postgame.viewHistory")}
        </button>
        <button
          disabled={noteSaved}
          onClick={() => {
            const dateStr = new Date(match.gameCreation).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
            const result = player.win ? (t("common.victory") || "Victoria") : (t("common.defeat") || "Derrota");
            const kdaStr = `${player.kills}/${player.deaths}/${player.assists}`;
            const noteContent = [
              `**${player.championName}** · ${kdaStr} · ${result}`,
              `CS/min: ${csPerMin} · KP: ${killParticipation}% · Daño: ${(player.totalDamageDealtToChampions / 1000).toFixed(1)}k`,
              ``,
              `### Análisis`,
              coachSummary,
              ...(criticalError ? [``, `### Error crítico: ${criticalError.title}`, criticalError.description, `**Solución:** ${criticalError.solution}`] : []),
              ...(strengths.length > 0 ? [``, `### Puntos fuertes`, ...strengths.map(s => `- **${s.title}**: ${s.description}`)] : []),
            ].join("\n");
            addNote({
              title: `${player.championName} — ${result} (${dateStr})`,
              content: noteContent,
              champion: player.championName,
              linkedMatchId: match.matchId,
              tags: [player.win ? "victoria" : "derrota", player.teamPosition?.toLowerCase() ?? ""],
              pinned: false,
            });
            setNoteSaved(true);
            toast.success(t("postgame.noteSaved") || "Nota guardada", {
              action: { label: t("common.view") || "Ver", onClick: () => navigate("/notes") },
            });
          }}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors cursor-pointer border",
            noteSaved
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 cursor-default"
              : "bg-secondary/50 text-muted-foreground border-border/40 hover:bg-secondary hover:text-foreground"
          )}
        >
          {noteSaved ? <Check className="w-4 h-4" /> : <StickyNote className="w-4 h-4" />}
          {noteSaved ? (t("postgame.noteSaved") || "Nota guardada") : (t("postgame.saveNote") || "Guardar como nota")}
        </button>
      </div>
    </motion.div>
  );
}