/**
 * DataExport — Velaris
 * 
 * Generates shareable "Player Cards" and JSON/CSV exports of match data.
 * Player Card renders as a styled div that can be copied via clipboard API.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Share2, Copy, Check, FileJson, FileText, Image, X } from "lucide-react";
import { cn } from "./ui/utils";
import { toast } from "sonner";
import type { MatchData } from "../utils/analytics";
import type { SummonerInfo } from "../services/dataService";
import { useLanguage } from "../contexts/LanguageContext";

interface DataExportProps {
  matches: MatchData[];
  summoner: SummonerInfo;
  className?: string;
}

export function DataExportButton({ matches, summoner, className }: DataExportProps) {
  const [showPanel, setShowPanel] = useState(false);
  const { t } = useLanguage();

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary/50 hover:bg-secondary border border-border/50 rounded-lg transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" />
        {t("export.title")}
      </button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{t("export.title")}</h3>
              <button onClick={() => setShowPanel(false)} className="w-6 h-6 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="p-3 flex flex-col gap-1.5">
              <ExportOption
                icon={<Copy className="w-4 h-4" />}
                title={t("export.playerCard")}
                description={t("export.playerCardDesc")}
                onClick={() => {
                  copyPlayerCard(matches, summoner, t);
                  setShowPanel(false);
                }}
              />
              <ExportOption
                icon={<FileJson className="w-4 h-4" />}
                title={t("export.exportJson")}
                description={t("export.exportJsonDesc")}
                onClick={() => {
                  exportJSON(matches, summoner, t);
                  setShowPanel(false);
                }}
              />
              <ExportOption
                icon={<FileText className="w-4 h-4" />}
                title={t("export.exportCsv")}
                description={t("export.exportCsvDesc")}
                onClick={() => {
                  exportCSV(matches, t);
                  setShowPanel(false);
                }}
              />
              <ExportOption
                icon={<Image className="w-4 h-4" />}
                title={t("export.statsImage") || "Tarjeta de Stats (PNG)"}
                description={t("export.statsImageDesc") || "Descarga una imagen compartible con tus estadísticas"}
                onClick={() => {
                  exportStatsImage(matches, summoner);
                  setShowPanel(false);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExportOption({ icon, title, description, onClick }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors text-left w-full group"
    >
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

// ─── Export Functions ──────────────────────────────────────────────────────────

function copyPlayerCard(matches: MatchData[], summoner: SummonerInfo, t: (key: string) => string) {
  const players = matches.map(m => m.participants[m.playerParticipantIndex]);
  const wins = players.filter(p => p.win).length;
  const losses = players.length - wins;
  const wr = Math.round((wins / players.length) * 100);
  
  const avgKda = players.reduce((s, p) => s + (p.kills + p.assists) / Math.max(p.deaths, 1), 0) / players.length;
  const avgCsm = players.reduce((s, p, i) => {
    const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
    return s + cs / (matches[i].gameDuration / 60);
  }, 0) / players.length;

  // Champion stats
  const champMap: Record<string, { games: number; wins: number }> = {};
  players.forEach(p => {
    if (!champMap[p.championName]) champMap[p.championName] = { games: 0, wins: 0 };
    champMap[p.championName].games++;
    if (p.win) champMap[p.championName].wins++;
  });
  const topChamps = Object.entries(champMap)
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 3)
    .map(([name, s]) => `${name} (${s.games}G ${Math.round((s.wins / s.games) * 100)}% WR)`)
    .join(", ");

  const card = `
━━━━━━━━━━━━━━━━━━━━━━━━━
  🏆 VELARIS PLAYER CARD
━━━━━━━━━━━━━━━━━━━━━━━━━
  ${summoner.name}#${summoner.tag}
  ${summoner.rank} ${summoner.division} • ${summoner.lp} LP

  📊 Season Stats (${matches.length} games)
  W/L: ${wins}W ${losses}L (${wr}% WR)
  KDA: ${avgKda.toFixed(2)} avg
  CS/min: ${avgCsm.toFixed(1)} avg

  🗡️ Top Champions
  ${topChamps}

  Generated by Velaris • ${new Date().toLocaleDateString()}
━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

  navigator.clipboard.writeText(card).then(() => {
    toast.success(t("export.copied"));
  }).catch(() => {
    toast.error(t("export.copyFailed"));
  });
}

function exportJSON(matches: MatchData[], summoner: SummonerInfo, t: (key: string) => string) {
  const data = {
    summoner: {
      name: summoner.name,
      tag: summoner.tag,
      rank: `${summoner.rank} ${summoner.division}`,
      lp: summoner.lp,
    },
    exportedAt: new Date().toISOString(),
    matchCount: matches.length,
    matches: matches.map(m => {
      const p = m.participants[m.playerParticipantIndex];
      return {
        matchId: m.matchId,
        date: new Date(m.gameCreation).toISOString(),
        duration: m.gameDuration,
        champion: p.championName,
        role: p.teamPosition,
        result: p.win ? "WIN" : "LOSS",
        kda: `${p.kills}/${p.deaths}/${p.assists}`,
        cs: p.totalMinionsKilled + p.neutralMinionsKilled,
        damage: p.totalDamageDealtToChampions,
        vision: p.visionScore,
        gold: p.goldEarned,
      };
    }),
  };

  downloadFile(JSON.stringify(data, null, 2), `velaris-export-${summoner.name}.json`, "application/json");
  toast.success(t("export.downloadedJson"));
}

function exportCSV(matches: MatchData[], t: (key: string) => string) {
  const headers = ["Match ID", "Date", "Champion", "Role", "Result", "K", "D", "A", "CS", "CS/min", "Damage", "Vision", "Gold", "Duration"];
  const rows = matches.map(m => {
    const p = m.participants[m.playerParticipantIndex];
    const durationMin = m.gameDuration / 60;
    const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
    return [
      m.matchId,
      new Date(m.gameCreation).toISOString().split("T")[0],
      p.championName,
      p.teamPosition,
      p.win ? "WIN" : "LOSS",
      p.kills,
      p.deaths,
      p.assists,
      cs,
      (cs / durationMin).toFixed(1),
      p.totalDamageDealtToChampions,
      p.visionScore,
      p.goldEarned,
      `${Math.floor(durationMin)}:${String(m.gameDuration % 60).padStart(2, "0")}`,
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  downloadFile(csv, "velaris-matches.csv", "text/csv");
  toast.success(t("export.downloadedCsv"));
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Stats Image Export (Canvas) ──────────────────────────────────────────────

function exportStatsImage(matches: MatchData[], summoner: SummonerInfo) {
  const W = 520, H = 320;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2; // retina
  canvas.height = H * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  // ── Background ──
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#0f0f14");
  grad.addColorStop(1, "#141420");
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.fill();

  // Subtle top accent line
  const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
  accentGrad.addColorStop(0, "rgba(139,92,246,0)");
  accentGrad.addColorStop(0.4, "rgba(139,92,246,0.8)");
  accentGrad.addColorStop(1, "rgba(139,92,246,0)");
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, W, 2);

  // ── Player name & rank ──
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(`${summoner.name}`, 24, 44);

  ctx.fillStyle = "#8b5cf6";
  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, sans-serif";
  const rankText = summoner.rank && summoner.division
    ? `${summoner.rank} ${summoner.division} • ${summoner.lp} LP`
    : "Sin clasificar";
  ctx.fillText(rankText, 24, 64);

  // ── Divider ──
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, 78);
  ctx.lineTo(W - 24, 78);
  ctx.stroke();

  // ── Stats ──
  const players = matches.map(m => m.participants[m.playerParticipantIndex]);
  const wins = players.filter(p => p.win).length;
  const losses = players.length - wins;
  const wr = players.length > 0 ? Math.round((wins / players.length) * 100) : 0;
  const avgKda = players.length > 0
    ? (players.reduce((s, p) => s + (p.kills + p.assists) / Math.max(p.deaths, 1), 0) / players.length).toFixed(2)
    : "0.00";
  const avgCsm = players.length > 0
    ? (players.reduce((s, p, i) => {
        const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
        return s + cs / (matches[i].gameDuration / 60);
      }, 0) / players.length).toFixed(1)
    : "0.0";

  const stats = [
    { label: "Partidas", value: String(matches.length) },
    { label: "Victorias", value: String(wins) },
    { label: "Derrotas", value: String(losses) },
    { label: "Winrate", value: `${wr}%` },
    { label: "KDA Avg", value: avgKda },
    { label: "CS/min", value: avgCsm },
  ];

  const colW = (W - 48) / 3;
  stats.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 24 + col * colW;
    const y = 100 + row * 70;

    // Pill background
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    roundRect(ctx, x, y, colW - 8, 56, 10);
    ctx.fill();

    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(s.label.toUpperCase(), x + 12, y + 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(s.value, x + 12, y + 44);
  });

  // ── Top champs ──
  const champMap: Record<string, { games: number; wins: number }> = {};
  players.forEach(p => {
    if (!champMap[p.championName]) champMap[p.championName] = { games: 0, wins: 0 };
    champMap[p.championName].games++;
    if (p.win) champMap[p.championName].wins++;
  });
  const topChamps = Object.entries(champMap)
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 3);

  if (topChamps.length > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("TOP CAMPEONES", 24, 252);

    topChamps.forEach(([name, s], i) => {
      const champWr = Math.round((s.wins / s.games) * 100);
      const x = 24 + i * 160;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(ctx, x, 260, 150, 32, 8);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(name, x + 10, 279);

      ctx.fillStyle = champWr >= 55 ? "#10b981" : champWr >= 50 ? "#60a5fa" : "#f87171";
      ctx.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(`${s.games}G ${champWr}%WR`, x + 10, 292);
    });
  }

  // ── Branding ──
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`VELARIS • ${new Date().toLocaleDateString("es-ES")}`, W - 24, H - 16);
  ctx.textAlign = "left";

  // ── Download ──
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `velaris-${summoner.name}-stats.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Imagen descargada");
  }, "image/png");
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}