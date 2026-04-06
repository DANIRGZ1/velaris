/**
 * ShareCardModal — renders a stat summary card to a canvas, lets the user
 * copy it to the clipboard or save it as a PNG.
 *
 * No external image libraries are needed; everything is drawn via Canvas 2D.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { X, Copy, Download, Check, Share2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./ui/utils";
import { useLanguage } from "../contexts/LanguageContext";
import type { SummonerInfo } from "../services/dataService";
import type { MatchData } from "../utils/analytics";
import { getLPHistory, computeLPStats } from "../services/lpTracker";
import { computeDailyStreak } from "../services/dailyStreakService";

// ─── Card dimensions ──────────────────────────────────────────────────────────
const W = 800;
const H = 420;

// ─── Rank colour map (hex, for canvas) ────────────────────────────────────────
function rankHex(rank: string): string {
  const tier = rank?.toUpperCase();
  if (tier === "IRON")         return "#a8a29e";
  if (tier === "BRONZE")       return "#b45309";
  if (tier === "SILVER")       return "#94a3b8";
  if (tier === "GOLD")         return "#eab308";
  if (tier === "PLATINUM")     return "#22d3ee";
  if (tier === "EMERALD")      return "#34d399";
  if (tier === "DIAMOND")      return "#60a5fa";
  if (tier === "MASTER")       return "#a78bfa";
  if (tier === "GRANDMASTER")  return "#f87171";
  if (tier === "CHALLENGER")   return "#fbbf24";
  return "#9ca3af";
}

// ─── Derive stats from raw match history ─────────────────────────────────────
interface CardStats {
  winRate: number;
  wins: number;
  losses: number;
  kda: string;
  topChamp: string;
  topChampGames: number;
  topChampWr: number;
  weeklyLP: number;
  streak: number;
}

function deriveStats(matches: MatchData[], summoner: SummonerInfo): CardStats {
  const wins   = summoner.wins   ?? 0;
  const losses = summoner.losses ?? 0;
  const total  = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  // KDA from last 20 games
  const recent = [...matches].sort((a, b) => b.gameCreation - a.gameCreation).slice(0, 20);
  let k = 0, d = 0, a = 0;
  for (const m of recent) {
    const p = m.participants[m.playerParticipantIndex];
    if (!p) continue;
    k += p.kills; d += p.deaths; a += p.assists;
  }
  const n = recent.length || 1;
  const kdaNum = d / n > 0 ? (k / n + a / n) / (d / n) : k / n + a / n;
  const kda = kdaNum.toFixed(2);

  // Top champ from all matches
  const champMap: Record<string, { wins: number; total: number }> = {};
  for (const m of matches) {
    const p = m.participants[m.playerParticipantIndex];
    if (!p) continue;
    const c = p.championName;
    if (!champMap[c]) champMap[c] = { wins: 0, total: 0 };
    champMap[c].total++;
    if (p.win) champMap[c].wins++;
  }
  const sorted = Object.entries(champMap).sort((a, b) => b[1].total - a[1].total);
  const [topChamp, topChampData] = sorted[0] ?? ["—", { wins: 0, total: 1 }];
  const topChampGames = topChampData.total;
  const topChampWr = Math.round((topChampData.wins / topChampData.total) * 100);

  // Weekly LP
  const lpStats = computeLPStats(getLPHistory());
  const weeklyLP = lpStats?.last7DaysGain ?? 0;

  // Streak
  const streak = computeDailyStreak(matches).current;

  return { winRate, wins, losses, kda, topChamp, topChampGames, topChampWr, weeklyLP, streak };
}

// ─── Canvas draw ─────────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawCard(
  canvas: HTMLCanvasElement,
  summoner: SummonerInfo,
  stats: CardStats,
  labels: {
    winRate: string; kda: string; topChamp: string; weeklyLP: string;
    streak: string; madeWith: string; games: string; thisWeek: string;
  },
) {
  const ctx = canvas.getContext("2d")!;
  canvas.width  = W;
  canvas.height = H;

  const accent     = rankHex(summoner.rank);
  const BG         = "#0d0f14";
  const CARD       = "#13161d";
  const BORDER     = "#1e2330";
  const TEXT       = "#f1f5f9";
  const MUTED      = "#64748b";
  const SUBTLE     = "#1a1e28";

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Ambient glow top-right
  const grd = ctx.createRadialGradient(W * 0.8, 0, 0, W * 0.8, 0, 300);
  grd.addColorStop(0, accent + "18");
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  // ── Top accent bar ──────────────────────────────────────────────────────────
  const barGrd = ctx.createLinearGradient(0, 0, W, 0);
  barGrd.addColorStop(0, accent);
  barGrd.addColorStop(0.6, accent + "80");
  barGrd.addColorStop(1, "transparent");
  ctx.fillStyle = barGrd;
  ctx.fillRect(0, 0, W, 3);

  // ── VELARIS wordmark ────────────────────────────────────────────────────────
  ctx.font = "bold 15px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = accent;
  ctx.letterSpacing = "3px";
  ctx.fillText("VELARIS", 36, 44);
  ctx.letterSpacing = "0px";

  // ── Separator ───────────────────────────────────────────────────────────────
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(36, 58);
  ctx.lineTo(W - 36, 58);
  ctx.stroke();

  // ── Summoner name ───────────────────────────────────────────────────────────
  const displayName = summoner.name + (summoner.tag ? ` #${summoner.tag}` : "");
  ctx.font = "bold 32px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = TEXT;
  ctx.fillText(displayName, 36, 110);

  // ── Rank badge ───────────────────────────────────────────────────────────────
  const rankStr = summoner.rank
    ? `${summoner.rank} ${summoner.division} · ${summoner.lp} LP`
    : "Unranked";
  ctx.font = "600 16px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = accent;
  ctx.fillText(rankStr, 36, 138);

  // ── Win / loss line ──────────────────────────────────────────────────────────
  ctx.font = "14px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = MUTED;
  ctx.fillText(`${stats.wins}W  ${stats.losses}L`, 36, 162);

  // ── Stat cards row (4 cards) ─────────────────────────────────────────────────
  const CARD_Y = 200;
  const CARD_H = 138;
  const GAP    = 12;
  const CARD_W = (W - 72 - GAP * 3) / 4;

  const statCards = [
    {
      label: labels.winRate,
      value: `${stats.winRate}%`,
      sub: `${stats.wins}W ${stats.losses}L`,
      color: stats.winRate >= 55 ? "#34d399" : stats.winRate >= 50 ? TEXT : "#f87171",
    },
    {
      label: labels.kda,
      value: stats.kda,
      sub: `${labels.games} 20`,
      color: parseFloat(stats.kda) >= 3 ? "#34d399" : parseFloat(stats.kda) >= 2 ? TEXT : "#fb923c",
    },
    {
      label: labels.topChamp,
      value: stats.topChamp,
      sub: `${stats.topChampGames}g · ${stats.topChampWr}%`,
      color: accent,
    },
    {
      label: labels.weeklyLP,
      value: (stats.weeklyLP >= 0 ? "+" : "") + stats.weeklyLP,
      sub: labels.thisWeek,
      color: stats.weeklyLP > 0 ? "#34d399" : stats.weeklyLP < 0 ? "#f87171" : MUTED,
    },
  ];

  statCards.forEach((card, i) => {
    const x = 36 + i * (CARD_W + GAP);

    // Card bg
    roundRect(ctx, x, CARD_Y, CARD_W, CARD_H, 10);
    ctx.fillStyle = CARD;
    ctx.fill();
    roundRect(ctx, x, CARD_Y, CARD_W, CARD_H, 10);
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label
    ctx.font = "11px 'Inter', system-ui, sans-serif";
    ctx.fillStyle = MUTED;
    ctx.fillText(card.label.toUpperCase(), x + 14, CARD_Y + 26);

    // Value
    const isBigText = card.value.length > 6;
    ctx.font = `bold ${isBigText ? 20 : 28}px 'Inter', system-ui, sans-serif`;
    ctx.fillStyle = card.color;
    ctx.fillText(card.value, x + 14, CARD_Y + 72);

    // Sub
    ctx.font = "12px 'Inter', system-ui, sans-serif";
    ctx.fillStyle = MUTED;
    ctx.fillText(card.sub, x + 14, CARD_Y + 96);

    // Streak pill on last card if active
    if (i === 3 && stats.streak >= 1) {
      ctx.font = "bold 11px 'Inter', system-ui, sans-serif";
      ctx.fillStyle = "#f97316";
      ctx.fillText(`🔥 ${stats.streak}d`, x + 14, CARD_Y + 118);
    }
  });

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY = H - 22;
  ctx.font = "12px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = MUTED;
  ctx.fillText(labels.madeWith, 36, footerY);

  // Date right-aligned
  const dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  ctx.textAlign = "right";
  ctx.fillText(dateStr, W - 36, footerY);
  ctx.textAlign = "left";

  // Bottom subtle line
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(36, H - 36);
  ctx.lineTo(W - 36, H - 36);
  ctx.stroke();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  summoner: SummonerInfo;
  matches: MatchData[];
  onClose: () => void;
}

export function ShareCardModal({ summoner, matches, onClose }: Props) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [textCopied, setTextCopied] = useState(false);

  const stats = useMemo(() => deriveStats(matches, summoner), [matches, summoner]);

  const discordText = useMemo(() => {
    const rank = summoner.rank
      ? `${summoner.rank} ${summoner.division} ${summoner.lp} LP`
      : "Unranked";
    const weekly = stats.weeklyLP >= 0 ? `+${stats.weeklyLP}` : String(stats.weeklyLP);
    return [
      `**${summoner.name}${summoner.tag ? `#${summoner.tag}` : ""}** — ${rank}`,
      `📊 ${stats.winRate}% WR (${stats.wins}W/${stats.losses}L) · ⚔️ ${stats.kda} KDA`,
      `🏆 Main: ${stats.topChamp} (${stats.topChampGames}g · ${stats.topChampWr}%)`,
      `📈 ${weekly} LP ${t("share.thisweek")}${stats.streak >= 3 ? ` · 🔥 ${stats.streak}d streak` : ""}`,
      `_${t("share.footer")}_`,
    ].join("\n");
  }, [stats, summoner, t]);

  const labels = {
    winRate:  t("share.stat.winrate"),
    kda:      t("share.stat.kda"),
    topChamp: t("share.stat.topchamp"),
    weeklyLP: t("share.stat.weeklylp"),
    streak:   t("share.stat.streak"),
    madeWith: t("share.footer"),
    games:    t("share.games"),
    thisWeek: t("share.thisweek"),
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !summoner) return;
    drawCard(canvas, summoner, stats, labels);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summoner, stats]);

  const getBlob = useCallback((): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) return reject(new Error("no canvas"));
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png");
    }), []);

  const handleCopy = useCallback(async () => {
    try {
      const blob = await getBlob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }, [getBlob]);

  const handleSave = useCallback(async () => {
    try {
      const blob = await getBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `velaris-${summoner.name.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Save failed:", err);
    }
  }, [getBlob, summoner.name]);

  const handleCopyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(discordText);
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 2500);
    } catch { /* ignore */ }
  }, [discordText]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Dialog */}
        <motion.div
          className="relative z-10 flex flex-col gap-4 bg-[#0d0f14] border border-white/10 rounded-2xl p-6 shadow-2xl"
          style={{ width: Math.min(W + 48, window.innerWidth - 48) }}
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">{t("share.title")}</span>
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Card preview */}
          <div className="rounded-xl overflow-hidden border border-white/8 shadow-lg">
            <canvas
              ref={canvasRef}
              className="w-full h-auto block"
              style={{ aspectRatio: `${W}/${H}` }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border",
                copied
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-secondary/40 text-foreground border-border/40 hover:bg-secondary/70"
              )}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {t(copied ? "share.copied" : "share.copy")}
            </button>
            <button
              onClick={handleSave}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border",
                saved
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
              )}
            >
              {saved ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {t(saved ? "share.saved" : "share.save")}
            </button>
            <button
              onClick={handleCopyText}
              title={t("share.copytext.hint")}
              className={cn(
                "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border shrink-0",
                textCopied
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-secondary/30 text-muted-foreground border-border/40 hover:text-foreground hover:bg-secondary/60"
              )}
            >
              {textCopied ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              {t(textCopied ? "share.copied" : "share.copytext")}
            </button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground/50">
            {t("share.hint")}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
