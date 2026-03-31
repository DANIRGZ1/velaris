/**
 * Compare — Side-by-side player comparison with real Match-v5 stats
 */

import { motion, AnimatePresence } from "motion/react";
import { Search, Users, ArrowLeftRight, Trophy, Loader2, AlertCircle, X, ChevronDown, Swords, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../components/ui/utils";
import { useState, useRef } from "react";
import { lookupFullProfile, displayRegionToPlatform, type SummonerSearchResult } from "../services/riotApi";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { getStoredIdentity } from "../services/dataService";
import { useLanguage } from "../contexts/LanguageContext";
import { IS_TAURI, tauriInvoke } from "../helpers/tauriWindow";

// ─── Types ────────────────────────────────────────────────────────────────────

type LookupState = "idle" | "loading" | "found" | "error";

interface MatchStats {
  avgKDA: number;
  avgCsMin: number;
  avgVision: number;
  winrate: number;
  games: number;
  topChamps: { name: string; games: number; wr: number }[];
  recentForm: boolean[]; // last 5: true=win
}

interface PlayerSlot {
  state: LookupState;
  query: string;
  region: string;
  profile: SummonerSearchResult | null;
  stats: MatchStats | null;
  statsLoading: boolean;
  error: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REGIONS = ["EUW", "EUNE", "NA", "KR", "BR", "LAN", "LAS", "OCE", "TR", "RU", "JP"];

const PLATFORM_TO_REGIONAL: Record<string, string> = {
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe",
  na1: "americas", br1: "americas", la1: "americas", la2: "americas", oc1: "americas",
  kr: "asia", jp1: "asia",
  ph2: "sea", sg2: "sea", th2: "sea", tw2: "sea", vn2: "sea",
};

const TIER_COLORS: Record<string, string> = {
  IRON: "text-stone-400", BRONZE: "text-amber-700", SILVER: "text-slate-400",
  GOLD: "text-yellow-500", PLATINUM: "text-teal-400", EMERALD: "text-emerald-500",
  DIAMOND: "text-blue-400", MASTER: "text-purple-400", GRANDMASTER: "text-rose-500",
  CHALLENGER: "text-yellow-300",
};

const TIER_BG: Record<string, string> = {
  IRON: "bg-stone-500/10", BRONZE: "bg-amber-700/10", SILVER: "bg-slate-500/10",
  GOLD: "bg-yellow-500/10", PLATINUM: "bg-teal-500/10", EMERALD: "bg-emerald-500/10",
  DIAMOND: "bg-blue-500/10", MASTER: "bg-purple-500/10", GRANDMASTER: "bg-rose-500/10",
  CHALLENGER: "bg-yellow-400/10", UNRANKED: "bg-secondary/30",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTier(soloRank: string | null) {
  if (!soloRank) return { tier: "UNRANKED", division: "", tierIdx: -1 };
  const parts = soloRank.trim().split(" ");
  const tier = parts[0]?.toUpperCase() || "UNRANKED";
  const division = parts[1] || "";
  const ORDER = ["IRON","BRONZE","SILVER","GOLD","PLATINUM","EMERALD","DIAMOND","MASTER","GRANDMASTER","CHALLENGER"];
  return { tier, division, tierIdx: ORDER.indexOf(tier) };
}

function rankScore(p: SummonerSearchResult): number {
  const { tier, division, tierIdx } = parseTier(p.soloRank);
  if (tierIdx < 0) return -1;
  const apex = ["MASTER","GRANDMASTER","CHALLENGER"].includes(tier);
  const divVal = apex ? 0 : ({ I:300, II:200, III:100, IV:0 }[division] ?? 0);
  return tierIdx * 400 + divVal + p.soloLP;
}

function profileWinrate(p: SummonerSearchResult): number {
  const t = p.soloWins + p.soloLosses;
  return t > 0 ? Math.round((p.soloWins / t) * 100) : 0;
}

async function fetchMatchStats(puuid: string, regional: string): Promise<MatchStats | null> {
  if (!IS_TAURI) return null;
  try {
    const raw = await tauriInvoke<any[]>("riot_get_matches_by_puuid", { puuid, regional, count: 20 });
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const champMap: Record<string, { games: number; wins: number }> = {};
    let totalKDA = 0, totalCsMin = 0, totalVision = 0, wins = 0;
    const recentForm: boolean[] = [];

    for (const match of raw) {
      const p = match.info?.participants?.find((x: any) => x.puuid === puuid);
      if (!p) continue;
      const dur = match.info.gameDuration / 60;
      const kda = p.deaths === 0 ? (p.kills + p.assists) : (p.kills + p.assists) / p.deaths;
      totalKDA += kda;
      totalCsMin += (p.totalMinionsKilled + p.neutralMinionsKilled) / dur;
      totalVision += p.visionScore;
      if (p.win) wins++;
      if (recentForm.length < 5) recentForm.push(p.win);

      const champ = p.championName || "Unknown";
      if (!champMap[champ]) champMap[champ] = { games: 0, wins: 0 };
      champMap[champ].games++;
      if (p.win) champMap[champ].wins++;
    }

    const n = raw.length;
    const topChamps = Object.entries(champMap)
      .sort((a, b) => b[1].games - a[1].games)
      .slice(0, 3)
      .map(([name, s]) => ({ name, games: s.games, wr: Math.round((s.wins / s.games) * 100) }));

    return {
      avgKDA: parseFloat((totalKDA / n).toFixed(2)),
      avgCsMin: parseFloat((totalCsMin / n).toFixed(1)),
      avgVision: parseFloat((totalVision / n).toFixed(1)),
      winrate: Math.round((wins / n) * 100),
      games: n,
      topChamps,
      recentForm,
    };
  } catch {
    return null;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RegionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2.5 h-9 rounded-lg bg-secondary/50 border border-border/60 text-[12px] font-semibold text-foreground hover:bg-secondary transition-colors">
        {value}<ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border/60 rounded-xl shadow-xl overflow-hidden min-w-[90px]">
            {REGIONS.map(r => (
              <button key={r} type="button" onClick={() => { onChange(r); setOpen(false); }}
                className={cn("w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-secondary/60 transition-colors",
                  r === value ? "text-primary bg-primary/5" : "text-foreground")}>
                {r}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecentForm({ form, t }: { form: boolean[]; t: (k: string) => string }) {
  return (
    <div className="flex gap-1">
      {form.map((w, i) => (
        <div key={i} className={cn("w-4 h-4 rounded-sm text-[9px] font-bold flex items-center justify-center",
          w ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500")}>
          {w ? t("compare.winsLabel") : t("compare.lossesLabel")}
        </div>
      ))}
    </div>
  );
}

function PlayerCard({ slot, onClear, side, version, t }: {
  slot: PlayerSlot; onClear: () => void; side: "left" | "right"; version: string;
  t: (k: string) => string;
}) {
  const p = slot.profile;
  const s = slot.stats;

  if (slot.state === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (slot.state === "error") {
    return (
      <div className={cn("flex-1 flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-destructive/30 rounded-2xl", side === "left" ? "mr-2" : "ml-2")}>
        <AlertCircle className="w-5 h-5 text-destructive" />
        <span className="text-[12px] text-muted-foreground text-center max-w-[180px]">{slot.error}</span>
      </div>
    );
  }

  if (!p) {
    return (
      <div className={cn("flex-1 flex flex-col items-center justify-center py-20 gap-2 border-2 border-dashed border-border/40 rounded-2xl", side === "left" ? "mr-2" : "ml-2")}>
        <Users className="w-8 h-8 text-muted-foreground/40" />
        <span className="text-[13px] text-muted-foreground/60">{t("compare.searchPlayer")}</span>
      </div>
    );
  }

  const { tier, division } = parseTier(p.soloRank);
  const color = TIER_COLORS[tier] || "text-muted-foreground";
  const bg = TIER_BG[tier] || "bg-secondary/20";
  const isApex = ["MASTER","GRANDMASTER","CHALLENGER"].includes(tier);
  const hasRank = tier !== "UNRANKED";
  const wr = hasRank ? profileWinrate(p) : (s?.winrate ?? 0);
  const totalGames = hasRank ? (p.soloWins + p.soloLosses) : (s?.games ?? 0);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }} className="flex-1 flex flex-col gap-3 relative min-w-0">
      <button onClick={onClear}
        className="absolute top-0 right-0 w-6 h-6 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary z-10">
        <X className="w-3 h-3 text-muted-foreground" />
      </button>

      {/* Header */}
      <div className={cn("flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-border/60 bg-card card-shine", bg)}>
        <div className="relative">
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${p.profileIconId}.png`}
            alt={p.gameName}
            className="w-14 h-14 rounded-full border-2 border-border/40"
            onError={e => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/1.png`; }}
          />
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-background border border-border/60 rounded-full text-[9px] font-bold text-muted-foreground whitespace-nowrap">
            {t("compare.level")}{p.summonerLevel}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[14px] font-bold text-foreground">{p.gameName}</div>
          <div className="text-[11px] text-muted-foreground">#{p.tagLine} · {p.region}</div>
        </div>
        {/* Recent form */}
        {s?.recentForm && s.recentForm.length > 0 && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t("compare.recentGames")}</span>
            <RecentForm form={s.recentForm} t={t} />
          </div>
        )}
      </div>

      {/* Rank */}
      <div className="flex flex-col items-center gap-1 p-3.5 rounded-2xl border border-border/60 bg-card card-lift card-shine">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Solo/Duo</span>
        {hasRank ? (
          <>
            <span className={cn("text-[18px] font-extrabold tracking-tight", color)}>
              {tier}{!isApex && ` ${division}`}
            </span>
            <span className={cn("text-[12px] font-semibold", color)}>{p.soloLP} LP</span>
          </>
        ) : (
          <span className="text-[14px] font-semibold text-muted-foreground">{t("compare.unranked")}</span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "WR", value: `${wr}%`, good: wr >= 55 },
          { label: "KDA", value: s ? s.avgKDA.toString() : (hasRank ? "—" : "—"), good: s ? s.avgKDA >= 3 : false },
          { label: "CS/m", value: s ? s.avgCsMin.toString() : "—", good: s ? s.avgCsMin >= 7 : false },
        ].map(stat => (
          <div key={stat.label} className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-secondary/40 border border-border/40">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            <span className={cn("text-[13px] font-bold", stat.good ? "text-emerald-500" : "text-foreground")}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* W/L */}
      {(hasRank || (s && s.games > 0)) && (
        <div className="flex flex-col gap-1 p-3 rounded-2xl border border-border/60 bg-card card-lift card-shine">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              {hasRank ? t("compare.ranked") : t("compare.lastN").replace("{count}", String(s?.games ?? 0))}
            </span>
            <span className={cn("text-[12px] font-bold",
              wr >= 55 ? "text-emerald-500" : wr >= 50 ? "text-blue-400" : "text-rose-500")}>
              {wr}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden flex">
            <motion.div
              className={cn("h-full rounded-l-full", wr >= 55 ? "bg-emerald-500" : wr >= 50 ? "bg-blue-400" : "bg-rose-500")}
              initial={{ width: 0 }}
              animate={{ width: `${wr}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            <div className={cn("h-full rounded-r-full flex-1", wr >= 55 ? "bg-rose-500/30" : wr >= 50 ? "bg-rose-500/30" : "bg-rose-500/60")} />
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-emerald-500 font-semibold">{hasRank ? p.soloWins : (s?.games ? Math.round(s.games * wr / 100) : 0)}{t("compare.winsLabel")}</span>
            <span className="text-muted-foreground">{totalGames} {t("compare.gamesLabel")}</span>
            <span className="text-rose-500 font-semibold">{hasRank ? p.soloLosses : (s?.games ? Math.round(s.games * (100 - wr) / 100) : 0)}{t("compare.lossesLabel")}</span>
          </div>
        </div>
      )}

      {/* Top champs */}
      {s?.topChamps && s.topChamps.length > 0 && (
        <div className="flex flex-col gap-1.5 p-3 rounded-2xl border border-border/60 bg-card card-lift card-shine">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t("compare.topChamps")}</span>
          {s.topChamps.map(c => (
            <div key={c.name} className="flex items-center gap-2">
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.name}.png`}
                className="w-6 h-6 rounded-md"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="text-[12px] font-medium text-foreground flex-1 truncate">{c.name}</span>
              <span className="text-[11px] text-muted-foreground">{c.games}G</span>
              <span className={cn("text-[11px] font-bold", c.wr >= 55 ? "text-emerald-500" : c.wr >= 50 ? "text-blue-400" : "text-rose-500")}>
                {c.wr}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Stats loading */}
      {slot.statsLoading && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground justify-center py-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          {t("compare.loadingHistory")}
        </div>
      )}
    </motion.div>
  );
}

// ─── Comparison table ─────────────────────────────────────────────────────────

function CompareRow({ label, leftVal, rightVal, leftDisplay, rightDisplay, higherIsBetter = true }: {
  label: string;
  leftVal: number; rightVal: number;
  leftDisplay: string; rightDisplay: string;
  higherIsBetter?: boolean;
}) {
  const leftWins = higherIsBetter ? leftVal > rightVal : leftVal < rightVal;
  const rightWins = higherIsBetter ? rightVal > leftVal : rightVal < leftVal;
  const total = leftVal + rightVal;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      <div className={cn("text-[13px] font-bold min-w-[52px] text-right tabular-nums",
        leftWins ? "text-primary" : "text-muted-foreground")}>
        {leftDisplay}
        {leftWins && <span className="text-[9px] ml-1">▲</span>}
      </div>
      <div className="flex-1 flex flex-col items-center gap-1">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden flex">
          <motion.div
            className={cn("h-full transition-colors", leftWins ? "bg-primary" : rightWins ? "bg-muted-foreground/40" : "bg-muted-foreground/30")}
            initial={{ width: 0 }}
            animate={{ width: total > 0 ? `${(leftVal / total) * 100}%` : "50%" }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
          <motion.div
            className={cn("h-full transition-colors", rightWins ? "bg-primary" : leftWins ? "bg-muted-foreground/40" : "bg-muted-foreground/30")}
            initial={{ width: 0 }}
            animate={{ width: total > 0 ? `${(rightVal / total) * 100}%` : "50%" }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </div>
      </div>
      <div className={cn("text-[13px] font-bold min-w-[52px] text-left tabular-nums",
        rightWins ? "text-primary" : "text-muted-foreground")}>
        {rightWins && <span className="text-[9px] mr-1">▲</span>}
        {rightDisplay}
      </div>
    </div>
  );
}

function Verdict({ left, right, leftStats, rightStats, t }: {
  left: SummonerSearchResult; right: SummonerSearchResult;
  leftStats: MatchStats | null; rightStats: MatchStats | null;
  t: (k: string) => string;
}) {
  const lRank = rankScore(left);
  const rRank = rankScore(right);
  const lWR = leftStats?.winrate ?? profileWinrate(left);
  const rWR = rightStats?.winrate ?? profileWinrate(right);
  const lKDA = leftStats?.avgKDA ?? 0;
  const rKDA = rightStats?.avgKDA ?? 0;

  let leftPoints = 0, rightPoints = 0;
  if (lRank > rRank) leftPoints += 2; else if (rRank > lRank) rightPoints += 2;
  if (lWR > rWR) leftPoints++; else if (rWR > lWR) rightPoints++;
  if (lKDA > rKDA) leftPoints++; else if (rKDA > lKDA) rightPoints++;

  if (leftPoints === rightPoints) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/60 bg-card justify-center">
        <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
        <span className="text-[13px] text-muted-foreground">{t("compare.verdictTie")}</span>
      </div>
    );
  }

  const winner = leftPoints > rightPoints ? left : right;
  const loser = leftPoints > rightPoints ? right : left;
  const diff = Math.abs(leftPoints - rightPoints);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-4 rounded-2xl border border-primary/30 bg-primary/5 justify-center">
      <Trophy className="w-4 h-4 text-primary shrink-0" />
      <span className="text-[13px] font-semibold text-foreground text-center">
        {t("compare.verdictBeats")
          .replace("{winner}", winner.gameName)
          .replace("{loser}", loser.gameName)}{" "}
        {diff >= 3 ? t("compare.verdictClearly") : t("compare.verdictClose")}
      </span>
    </motion.div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────

function SearchBar({ slot, onChange, onSearch, t }: {
  slot: PlayerSlot;
  onChange: (q: string, region: string) => void;
  onSearch: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="flex items-center gap-2 w-full">
      <RegionSelect value={slot.region} onChange={r => onChange(slot.query, r)} />
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input type="text" value={slot.query}
          onChange={e => onChange(e.target.value, slot.region)}
          onKeyDown={e => e.key === "Enter" && onSearch()}
          placeholder={t("compare.searchPlaceholder")}
          className="w-full pl-9 pr-3 h-9 bg-secondary/50 border border-border/60 rounded-lg text-[13px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors" />
      </div>
      <button onClick={onSearch}
        disabled={slot.state === "loading" || !slot.query.includes("#")}
        className="px-3 h-9 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">
        {slot.state === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : t("compare.search")}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const defaultSlot = (region: string): PlayerSlot => ({
  state: "idle", query: "", region, profile: null, stats: null, statsLoading: false, error: null,
});

export function Compare() {
  const storedRegion = getStoredIdentity()?.region || "EUW";
  const [left, setLeft] = useState<PlayerSlot>(defaultSlot(storedRegion));
  const [right, setRight] = useState<PlayerSlot>(defaultSlot(storedRegion));
  const { version } = usePatchVersion();
  const { t } = useLanguage();

  const update = (side: "left" | "right", patch: Partial<PlayerSlot>) => {
    if (side === "left") setLeft(s => ({ ...s, ...patch }));
    else setRight(s => ({ ...s, ...patch }));
  };

  const search = async (side: "left" | "right") => {
    const slot = side === "left" ? left : right;
    if (!slot.query.includes("#")) return;
    const [name, tag] = slot.query.split("#");
    if (!name || !tag) return;

    update(side, { state: "loading", error: null, stats: null });

    try {
      const platform = displayRegionToPlatform(slot.region);
      const result = await lookupFullProfile(name.trim(), tag.trim(), platform);
      if (!result) {
        update(side, { state: "error", error: t("compare.errorNotFound") });
        return;
      }
      update(side, { state: "found", profile: result, statsLoading: true });

      // Fetch match stats in background
      const regional = PLATFORM_TO_REGIONAL[platform] || "europe";
      const stats = await fetchMatchStats(result.puuid, regional);
      update(side, { stats, statsLoading: false });
    } catch (e) {
      const msg = String(e).includes("API key") || String(e).includes("403")
        ? t("compare.errorApiKey")
        : t("compare.errorNetwork");
      update(side, { state: "error", error: msg });
    }
  };

  const clear = (side: "left" | "right") => {
    const slot = side === "left" ? left : right;
    update(side, defaultSlot(slot.region));
  };

  const bothFound = !!(left.profile && right.profile);
  const canCompare = bothFound && (left.stats || right.stats || left.profile!.soloWins > 0 || right.profile!.soloWins > 0);

  const lStats = left.stats;
  const rStats = right.stats;
  const lP = left.profile;
  const rP = right.profile;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      className="w-full flex flex-col gap-5 pb-20">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Swords className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">{t("compare.title")}</h1>
          <p className="text-[12px] text-muted-foreground">{t("compare.subtitle")}</p>
        </div>
      </div>

      {/* Search bars */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("compare.player1")}</span>
          <SearchBar slot={left} onChange={(q, r) => update("left", { query: q, region: r })} onSearch={() => search("left")} t={t} />
        </div>
        <div className="flex items-center justify-center pb-0.5 shrink-0">
          <div className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center">
            <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("compare.player2")}</span>
          <SearchBar slot={right} onChange={(q, r) => update("right", { query: q, region: r })} onSearch={() => search("right")} t={t} />
        </div>
      </div>

      {/* Cards */}
      <div className="flex gap-4 items-start">
        <PlayerCard slot={left} onClear={() => clear("left")} side="left" version={version} t={t} />
        <PlayerCard slot={right} onClear={() => clear("right")} side="right" version={version} t={t} />
      </div>

      {/* Comparison table */}
      <AnimatePresence>
        {canCompare && lP && rP && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }} className="flex flex-col gap-3">
            <div className="p-4 rounded-2xl border border-border/60 bg-card card-shine">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border/40">
                <span className="text-[13px] font-bold text-foreground truncate flex-1">{lP.gameName}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3">{t("compare.comparison")}</span>
                <span className="text-[13px] font-bold text-foreground truncate flex-1 text-right">{rP.gameName}</span>
              </div>

              <CompareRow label={t("compare.rowRank")} leftVal={Math.max(rankScore(lP), 0)} rightVal={Math.max(rankScore(rP), 0)}
                leftDisplay={lP.soloRank ? `${parseTier(lP.soloRank).tier.slice(0,3)} ${lP.soloLP}LP` : "Unr."}
                rightDisplay={rP.soloRank ? `${parseTier(rP.soloRank).tier.slice(0,3)} ${rP.soloLP}LP` : "Unr."} />

              <CompareRow label={t("compare.rowWinrate")} leftVal={lStats?.winrate ?? profileWinrate(lP)} rightVal={rStats?.winrate ?? profileWinrate(rP)}
                leftDisplay={`${lStats?.winrate ?? profileWinrate(lP)}%`}
                rightDisplay={`${rStats?.winrate ?? profileWinrate(rP)}%`} />

              {(lStats || rStats) && (
                <>
                  <CompareRow label={t("compare.rowKDA")} leftVal={lStats?.avgKDA ?? 0} rightVal={rStats?.avgKDA ?? 0}
                    leftDisplay={lStats ? lStats.avgKDA.toString() : "—"}
                    rightDisplay={rStats ? rStats.avgKDA.toString() : "—"} />
                  <CompareRow label={t("compare.rowCSMin")} leftVal={lStats?.avgCsMin ?? 0} rightVal={rStats?.avgCsMin ?? 0}
                    leftDisplay={lStats ? lStats.avgCsMin.toString() : "—"}
                    rightDisplay={rStats ? rStats.avgCsMin.toString() : "—"} />
                  <CompareRow label={t("compare.rowVision")} leftVal={lStats?.avgVision ?? 0} rightVal={rStats?.avgVision ?? 0}
                    leftDisplay={lStats ? lStats.avgVision.toString() : "—"}
                    rightDisplay={rStats ? rStats.avgVision.toString() : "—"} />
                </>
              )}

              <CompareRow label={t("compare.rowLevel")} leftVal={lP.summonerLevel} rightVal={rP.summonerLevel}
                leftDisplay={lP.summonerLevel.toString()} rightDisplay={rP.summonerLevel.toString()} />
            </div>

            <Verdict left={lP} right={rP} leftStats={lStats} rightStats={rStats} t={t} />
          </motion.div>
        )}
      </AnimatePresence>

      {!left.profile && !right.profile && (
        <div className="text-center text-[13px] text-muted-foreground/50 py-6">
          {t("compare.guideText").replace("{format}", t("compare.searchPlaceholder"))}
        </div>
      )}
    </motion.div>
  );
}
