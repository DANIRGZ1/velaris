import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { WifiOff, Gamepad2, Zap, Loader2, Skull, Shield, Swords } from "lucide-react";
import { cn } from "../components/ui/utils";
import { LiveGameSkeleton } from "../components/Skeletons";
import { getLiveGameData, getMockLiveGameData, getStoredIdentity, clearMatchCache, type LiveGameData } from "../services/dataService";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { useLanguage } from "../contexts/LanguageContext";

// ─── Tauri ───────────────────────────────────────────────────────────────────

import { IS_TAURI, tauriInvoke } from "../helpers/tauriWindow";

// ─── Asset URLs ───────────────────────────────────────────────────────────────

// Static fallback map: English display name → DDragon file ID
const SPELL_FILES: Record<string, string> = {
  // Standard ranked spells
  Flash: "SummonerFlash",
  Ignite: "SummonerDot",
  Teleport: "SummonerTeleport",
  "Unleashed Teleport": "SummonerTeleport",
  "Teleport (Unleashed)": "SummonerTeleport",
  Smite: "SummonerSmite",
  "Challenging Smite": "SummonerSmiteAvatarOffensive",
  "Chilling Smite": "SummonerSmiteAvatarUtility",
  Ghost: "SummonerHaste",
  Heal: "SummonerHeal",
  Barrier: "SummonerBarrier",
  Exhaust: "SummonerExhaust",
  Cleanse: "SummonerBoost",
  Clarity: "SummonerMana",
  // ARAM / special modes
  Mark: "SummonerSnowball",
  Snowball: "SummonerSnowball",
  "Poro Toss": "SummonerSnowball",
  Dash: "SummonerSnowball",
};

// Dynamic map built from DDragon summoner.json — covers future renames
let _dynamicSpellMap: Record<string, string> | null = null;

// idByKey: "4" → "SummonerFlash", "14" → "SummonerDot", etc.
let _idByKey: Record<string, string> = {};

async function loadDynamicSpellMap(patch: string): Promise<Record<string, string>> {
  if (_dynamicSpellMap) return _dynamicSpellMap;
  const cacheKey = `velaris-spell-map-${patch}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { nameMap, keyMap } = JSON.parse(cached) as { nameMap: Record<string, string>; keyMap: Record<string, string> };
      _dynamicSpellMap = { ...SPELL_FILES, ...nameMap };
      _idByKey = keyMap ?? {};
      return _dynamicSpellMap as Record<string, string>;
    }
  } catch {}
  try {
    const res = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${patch}/data/en_US/summoner.json`
    );
    const data = await res.json();
    const nameMap: Record<string, string> = {};
    const keyMap: Record<string, string> = {};
    for (const [fileId, spell] of Object.entries(data.data as Record<string, { name: string; key: string }>)) {
      nameMap[spell.name] = fileId;   // "Flash" → "SummonerFlash"
      keyMap[spell.key] = fileId;     // "4"     → "SummonerFlash"
    }
    _dynamicSpellMap = { ...SPELL_FILES, ...nameMap };
    _idByKey = keyMap;
    try { localStorage.setItem(cacheKey, JSON.stringify({ nameMap, keyMap })); } catch {}
    return _dynamicSpellMap;
  } catch {
    _dynamicSpellMap = { ...SPELL_FILES };
    return _dynamicSpellMap;
  }
}

function spellUrl(spell: { displayName: string; rawDisplayName: string }, patch: string, dynamicMap: Record<string, string>): string {
  // Layer 1: rawDisplayName is locale-independent
  // Format A: "GeneratedTip_SummonerKey_SummonerFlash_DisplayName"
  // Format B: "SummonerFlash" (some patches return the ID directly)
  if (spell.rawDisplayName) {
    const m = spell.rawDisplayName.match(/SummonerKey_(\w+?)(?:_DisplayName|$)/);
    if (m?.[1]) return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/spell/${m[1]}.png`;
    if (/^Summoner\w+$/.test(spell.rawDisplayName))
      return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/spell/${spell.rawDisplayName}.png`;
  }
  // Layer 2: displayName lookup via dynamic DDragon map (any locale once loaded)
  const fileId = dynamicMap[spell.displayName] ?? SPELL_FILES[spell.displayName];
  if (fileId) return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/spell/${fileId}.png`;
  // Layer 3: last resort — blank (broken img hidden by onError)
  console.warn("[Spells] could not resolve icon for:", spell.displayName, spell.rawDisplayName);
  return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/spell/SummonerFlash.png`;
}
const champLoadingUrl = (name: string) =>
  `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${name}_0.jpg`;
const champIconUrl = (name: string, patch: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${name}.png`;

// ─── Rank ─────────────────────────────────────────────────────────────────────

const RANK_COLOR: Record<string, string> = {
  IRON: "#8e8e8e", BRONZE: "#c07a3a", SILVER: "#9fb0c4", GOLD: "#dba830",
  PLATINUM: "#4aab96", EMERALD: "#2fb46d", DIAMOND: "#4db6e8",
  MASTER: "#9b5de5", GRANDMASTER: "#d4380d", CHALLENGER: "#f5a420",
};

const RANK_ORDER: Record<string, number> = {
  IRON: 1, BRONZE: 2, SILVER: 3, GOLD: 4, PLATINUM: 5,
  EMERALD: 6, DIAMOND: 7, MASTER: 8, GRANDMASTER: 9, CHALLENGER: 10,
};

interface PlayerRank { tier: string; rank: string; lp: number }

function extractSoloRank(entries: unknown[]): PlayerRank | null {
  if (!Array.isArray(entries)) return null;
  const solo = entries.find((e: any) => e?.queueType === "RANKED_SOLO_5x5") as any;
  if (!solo) return null;
  return { tier: solo.tier ?? "", rank: solo.rank ?? "", lp: solo.leaguePoints ?? 0 };
}

async function fetchPlayerRank(name: string, platform: string): Promise<PlayerRank | null> {
  if (!IS_TAURI) return null;
  try {
    const entries = await tauriInvoke<unknown[]>("riot_get_rank_by_summoner_name", { summonerName: name, platform });
    return extractSoloRank(entries);
  } catch { return null; }
}

function resolvePlatform(region: string): string {
  const map: Record<string, string> = {
    EUW: "euw1", EUNE: "eun1", NA: "na1", KR: "kr", BR: "br1",
    LAN: "la1", LAS: "la2", OCE: "oc1", TR: "tr1", RU: "ru", JP: "jp1",
  };
  return map[region?.toUpperCase()] ?? "euw1";
}

function formatRank(rank: PlayerRank): string {
  const tier = rank.tier.charAt(0) + rank.tier.slice(1).toLowerCase();
  const divisionMap: Record<string, string> = { IV: "IV", III: "III", II: "II", I: "I" };
  const div = divisionMap[rank.rank] ?? rank.rank;
  return `${tier} ${div}`;
}

function avgRank(players: LiveGameData["allPlayers"], ranks: Record<string, PlayerRank | null | undefined>): string {
  const resolved = players.map(p => ranks[p.summonerName]).filter((r): r is PlayerRank => !!r);
  if (!resolved.length) return "—";
  const avg = resolved.reduce((s, r) => s + (RANK_ORDER[r.tier] ?? 4), 0) / resolved.length;
  const tiers = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"];
  return tiers[Math.round(avg) - 1] ?? "Gold";
}

// ─── Game timer helper ────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Summoner spell map hook ──────────────────────────────────────────────────

function useSummonerSpellMap(patch: string): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>(SPELL_FILES);
  useEffect(() => {
    if (!patch) return;
    loadDynamicSpellMap(patch).then(setMap);
  }, [patch]);
  return map;
}

// ─── Badge system ─────────────────────────────────────────────────────────────

interface Badge { label: string; cls: string }

function computeBadges(allPlayers: LiveGameData["allPlayers"]): Record<string, Badge[]> {
  if (!allPlayers.length) return {};
  const kdaOf = (p: LiveGameData["allPlayers"][number]) =>
    p.scores.deaths === 0 ? p.scores.kills + p.scores.assists : (p.scores.kills + p.scores.assists) / p.scores.deaths;

  const maxKda = Math.max(...allPlayers.map(kdaOf));
  const maxCs  = Math.max(...allPlayers.map(p => p.scores.creepScore));
  const maxDth = Math.max(...allPlayers.map(p => p.scores.deaths));
  const maxKl  = Math.max(...allPlayers.map(p => p.scores.kills));

  const result: Record<string, Badge[]> = {};
  for (const p of allPlayers) {
    const b: Badge[] = [];
    if (kdaOf(p) === maxKda && maxKda > 0)       b.push({ label: "MVP",     cls: "text-amber-500 bg-amber-500/10 border-amber-500/30" });
    if (p.scores.kills === maxKl && maxKl > 2)    b.push({ label: "Líder",   cls: "text-blue-400 bg-blue-500/10 border-blue-500/30" });
    if (p.scores.creepScore === maxCs && maxCs > 50) b.push({ label: "Top CS", cls: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" });
    if (p.scores.deaths === maxDth && maxDth > 2) b.push({ label: "Feeding", cls: "text-red-400 bg-red-500/10 border-red-500/30" });
    result[p.summonerName] = b;
  }
  return result;
}

// ─── Champion portrait ────────────────────────────────────────────────────────

function ChampPortrait({ player, patch, size = 44 }: { player: LiveGameData["allPlayers"][number]; patch: string; size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 shadow-md">
        <img
          src={champLoadingUrl(player.championName)}
          alt={player.championName}
          className="w-full h-full object-cover object-top scale-[1.4] -translate-y-1"
          onError={e => { (e.target as HTMLImageElement).src = champIconUrl(player.championName, patch); }}
        />
      </div>
      <div className="absolute bottom-0 right-0 bg-black/80 text-white text-[8px] font-bold px-1 py-0.5 rounded-tl-md leading-none">
        {player.level}
      </div>
      {player.isDead && (
        <div className="absolute inset-0 rounded-xl bg-black/75 flex flex-col items-center justify-center gap-0.5">
          <Skull className="w-3.5 h-3.5 text-red-400" />
          {player.respawnTimer > 0 && (
            <span className="text-[8px] font-bold text-red-400 font-mono leading-none">{Math.ceil(player.respawnTimer)}s</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Player Card (horizontal) ─────────────────────────────────────────────────

interface PlayerCardProps {
  player: LiveGameData["allPlayers"][number];
  isYou: boolean;
  rank: PlayerRank | null | undefined;
  patch: string;
  spellMap: Record<string, string>;
  badges: Badge[];
  youLabel: string;
  side: "blue" | "red";
  delay: number;
}

function PlayerCard({ player, isYou, rank, patch, spellMap, badges, youLabel, side, delay }: PlayerCardProps) {
  const isBlue = side === "blue";
  const teamColor = isBlue ? "#3b82f6" : "#ef4444";
  const { kills, deaths, assists, creepScore } = player.scores;
  const rankColor = rank ? (RANK_COLOR[rank.tier] ?? "#aaa") : "#555";
  const spellData = [player.summonerSpells.summonerSpellOne, player.summonerSpells.summonerSpellTwo];

  const kdaBlock = (
    <div className={cn("shrink-0 flex flex-col min-w-[48px]", isBlue ? "items-end" : "items-start")}>
      <span className="text-[11px] font-mono font-bold tabular-nums leading-tight">
        <span className="text-emerald-400">{kills}</span>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-red-400">{deaths}</span>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-sky-400">{assists}</span>
      </span>
      <span className="text-[9px] text-muted-foreground/40 font-mono">{creepScore} cs</span>
    </div>
  );

  const spellsBlock = (
    <div className="flex flex-col gap-1 shrink-0">
      {spellData.map((sp, i) => (
        <img key={i} src={spellUrl(sp, patch, spellMap)} alt={sp.displayName} title={sp.displayName}
          className="w-[22px] h-[22px] rounded-[5px] border border-white/10 shadow-sm object-cover"
          onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
      ))}
    </div>
  );

  const infoBlock = (
    <div className={cn("flex-1 min-w-0 flex flex-col gap-0.5", !isBlue && "items-end")}>
      <div className={cn("flex items-center gap-1", !isBlue && "flex-row-reverse")}>
        <span className={cn("text-[12px] font-semibold truncate max-w-[90px]", isYou ? "text-primary" : "text-foreground")}>
          {player.summonerName}
        </span>
        {isYou && (
          <span className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground uppercase tracking-wider leading-none">
            {youLabel}
          </span>
        )}
      </div>
      <div>
        {rank === undefined ? (
          <Loader2 className="w-2.5 h-2.5 animate-spin text-muted-foreground/30" />
        ) : rank === null ? (
          <span className="text-[10px] text-muted-foreground/40">Unranked</span>
        ) : (
          <span className="text-[10px] font-bold leading-none" style={{ color: rankColor }}>
            {formatRank(rank)} · {rank.lp} LP
          </span>
        )}
      </div>
      {badges.length > 0 && (
        <div className={cn("flex gap-1 flex-wrap mt-0.5", !isBlue && "justify-end")}>
          {badges.slice(0, 2).map(b => (
            <span key={b.label} className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full border leading-none", b.cls)}>
              {b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: isBlue ? -10 : 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border flex-1 min-w-0 overflow-hidden",
        "hover:bg-secondary/30 transition-colors duration-150 cursor-default",
        isYou ? "bg-primary/6 border-primary/25" : "bg-card/60 border-border/30",
        player.isDead && "opacity-55",
      )}
    >
      <div className={cn("absolute top-0 bottom-0 w-[3px] opacity-50", isBlue ? "left-0" : "right-0")}
        style={{ background: isYou ? "var(--color-primary)" : teamColor }} />
      {isBlue ? (
        <><ChampPortrait player={player} patch={patch} size={40} />{spellsBlock}{infoBlock}{kdaBlock}</>
      ) : (
        <>{kdaBlock}{infoBlock}{spellsBlock}<ChampPortrait player={player} patch={patch} size={40} /></>
      )}
    </motion.div>
  );
}

// ─── Matchup rows (blue ←→ red) ───────────────────────────────────────────────

interface MatchupRowsProps {
  orderTeam: LiveGameData["allPlayers"];
  chaosTeam: LiveGameData["allPlayers"];
  myName: string;
  ranks: Record<string, PlayerRank | null | undefined>;
  patch: string;
  spellMap: Record<string, string>;
  t: (key: string) => string;
}

function MatchupRows({ orderTeam, chaosTeam, myName, ranks, patch, spellMap, t }: MatchupRowsProps) {
  const badges = computeBadges([...orderTeam, ...chaosTeam]);
  const blueAvg = avgRank(orderTeam, ranks);
  const redAvg  = avgRank(chaosTeam, ranks);
  const count   = Math.max(orderTeam.length, chaosTeam.length);

  return (
    <div className="flex flex-col gap-2">
      {/* Team headers */}
      <div className="flex items-center gap-2 mb-1 px-1">
        <div className="flex items-center gap-1.5 flex-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_#3b82f6]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/80">{t("live.blueTeam")}</span>
          <span className="text-[9px] text-muted-foreground/40 ml-auto">{t("live.avg") || "avg"} {blueAvg}</span>
        </div>
        <div className="w-14 text-center text-[9px] font-black text-muted-foreground/20 tracking-widest shrink-0">VS</div>
        <div className="flex items-center gap-1.5 flex-1 flex-row-reverse">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/80">{t("live.redTeam")}</span>
          <span className="text-[9px] text-muted-foreground/40 mr-auto">{t("live.avg") || "avg"} {redAvg}</span>
        </div>
      </div>

      {/* Paired rows */}
      {Array.from({ length: count }).map((_, idx) => {
        const bp = orderTeam[idx];
        const rp = chaosTeam[idx];
        return (
          <div key={idx} className="flex items-stretch gap-1.5">
            {bp ? (
              <PlayerCard
                player={bp} isYou={bp.summonerName === myName}
                rank={ranks[bp.summonerName]} patch={patch} spellMap={spellMap}
                badges={badges[bp.summonerName] ?? []} youLabel={t("live.you")}
                side="blue" delay={idx * 0.045}
              />
            ) : <div className="flex-1" />}

            {/* VS connector */}
            <div className="w-8 shrink-0 flex flex-col items-center justify-center self-stretch gap-1">
              <div className="flex-1 w-px bg-border/20" />
              <span className="text-[8px] font-black text-muted-foreground/20 tracking-widest">vs</span>
              <div className="flex-1 w-px bg-border/20" />
            </div>

            {rp ? (
              <PlayerCard
                player={rp} isYou={rp.summonerName === myName}
                rank={ranks[rp.summonerName]} patch={patch} spellMap={spellMap}
                badges={badges[rp.summonerName] ?? []} youLabel={t("live.you")}
                side="red" delay={idx * 0.045 + 0.02}
              />
            ) : <div className="flex-1" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── VS Divider ───────────────────────────────────────────────────────────────

function VsDivider({ gameTime, gameMode }: { gameTime: number; gameMode: string }) {
  const [elapsed, setElapsed] = useState(gameTime);

  useEffect(() => {
    setElapsed(gameTime);
    const id = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(id);
  }, [gameTime]);

  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <div className="flex-1 h-px bg-border/20" />
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/35">
          {gameMode.replace(/_/g, " ")}
        </span>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/40 shadow-inner">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_4px_#22c55e]" />
          <span className="text-[13px] font-mono font-black text-foreground tabular-nums">{formatTime(elapsed)}</span>
          <span className="text-[9px] font-bold text-green-500 uppercase tracking-wider">Live</span>
        </div>
      </div>
      <div className="flex-1 h-px bg-border/20" />
    </div>
  );
}

// ─── Active player stats bar ──────────────────────────────────────────────────

type AllPlayer = LiveGameData["allPlayers"][number];

function MyStatsBar({ player, patch }: { player: AllPlayer; patch: string }) {
  const { kills, deaths, assists, creepScore } = player.scores;
  const kda = !deaths ? "Perfect" : ((kills + assists) / deaths).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
      className="flex items-center justify-between px-5 py-3 rounded-2xl bg-primary/5 border border-primary/20 mb-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl overflow-hidden border border-primary/30 shrink-0">
          <img
            src={champLoadingUrl(player.championName)}
            alt={player.championName}
            className="w-full h-full object-cover object-top scale-[1.4] -translate-y-1"
            onError={e => { (e.target as HTMLImageElement).src = champIconUrl(player.championName, patch); }}
          />
        </div>
        <div>
          <p className="text-[12px] font-bold text-primary leading-tight">{player.summonerName}</p>
          <p className="text-[11px] text-muted-foreground">{player.championName}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {[
          { label: "K/D/A", value: `${kills}/${deaths}/${assists}` },
          { label: "KDA", value: kda },
          { label: "CS", value: String(creepScore) },
        ].map(stat => (
          <div key={stat.label} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider">{stat.label}</span>
            <span className="text-[13px] font-mono font-bold text-foreground tabular-nums">{stat.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function LiveGame() {
  const { t } = useLanguage();
  const { version: patch } = usePatchVersion();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMock = searchParams.get("mock") === "true";
  const [gameData, setGameData] = useState<LiveGameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ranks, setRanks] = useState<Record<string, PlayerRank | null | undefined>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ranksLoadedRef = useRef(false);
  // Game-end detection: track consecutive null results after a game was active
  const hadGameRef = useRef(false);
  const gameEndCountRef = useRef(0);
  const gameTimeRef = useRef(0);
  // Lock flag: prevents two concurrent polls from both triggering navigation
  const navigatingRef = useRef(false);

  const identity = getStoredIdentity();
  const platform = resolvePlatform(identity?.region ?? "EUW");

  const fetchGameData = useCallback(async () => {
    if (isMock) {
      const data = getMockLiveGameData();
      setGameData(data);
      setLoading(false);
      return data;
    }
    const data = await getLiveGameData();
    setGameData(data);
    setLoading(false);
    if (data) {
      hadGameRef.current = true;
      gameEndCountRef.current = 0;
      gameTimeRef.current = data.gameData?.gameTime ?? 0;
    } else if (hadGameRef.current && gameTimeRef.current > 300 && !navigatingRef.current) {
      // Game was running for >5min and now API returned null → game probably ended
      gameEndCountRef.current += 1;
      if (gameEndCountRef.current >= 2) {
        navigatingRef.current = true; // lock: only one navigation
        hadGameRef.current = false;
        gameEndCountRef.current = 0;
        clearMatchCache(); // force fresh match history on next load
        navigate("/post-game");
      }
    }
    return data;
  }, [isMock, navigate]);

  const fetchRanks = useCallback(async (players: LiveGameData["allPlayers"]) => {
    if (ranksLoadedRef.current) return;
    ranksLoadedRef.current = true;
    setRanks(Object.fromEntries(players.map(p => [p.summonerName, undefined])));
    const results = await Promise.allSettled(
      players.map((p, i) =>
        new Promise<[string, PlayerRank | null]>(resolve =>
          setTimeout(async () => resolve([p.summonerName, await fetchPlayerRank(p.summonerName, platform)]), i * 150)
        )
      )
    );
    setRanks(prev => {
      const next = { ...prev };
      results.forEach(r => { if (r.status === "fulfilled") next[r.value[0]] = r.value[1]; });
      return next;
    });
  }, [platform]);

  useEffect(() => {
    fetchGameData().then(d => { if (d) fetchRanks(d.allPlayers); });
    // Poll every 3s — detects game start/end quickly
    pollRef.current = setInterval(async () => {
      const d = await fetchGameData();
      if (d && !ranksLoadedRef.current) fetchRanks(d.allPlayers);
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchGameData, fetchRanks]);

  useEffect(() => {
    if (!gameData) { ranksLoadedRef.current = false; setRanks({}); }
  }, [gameData]);

  const spellMap = useSummonerSpellMap(patch);

  const myName = gameData?.activePlayer?.summonerName ?? identity?.name ?? "";
  const orderTeam = gameData?.allPlayers?.filter(p => p.team === "ORDER") ?? [];
  const chaosTeam = gameData?.allPlayers?.filter(p => p.team === "CHAOS") ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full flex flex-col font-sans pb-20"
    >
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-3">
            {t("live.title")}
            {gameData ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[11px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_#22c55e]" />
                {t("live.inGame") || "En Partida"}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-secondary/60 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                {t("live.inactive") || "Esperando"}
              </span>
            )}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {gameData
              ? `${gameData.gameData.gameMode.replace(/_/g, " ")} · ${orderTeam.length + chaosTeam.length} jugadores`
              : t("live.waiting.desc")}
          </p>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <LiveGameSkeleton key="loading" />

        ) : !gameData ? (
          <WaitingState key="waiting" t={t} />

        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4"
          >
            {/* My stats bar — find active player in allPlayers for full stats */}
            {(() => {
              const me = gameData.allPlayers.find(p => p.summonerName === myName);
              return me ? <MyStatsBar player={me} patch={patch} /> : null;
            })()}

            {/* ── Game timer ───────────────────────────────────────── */}
            <VsDivider
              gameTime={gameData.gameData.gameTime}
              gameMode={gameData.gameData.gameMode}
            />

            {/* ── Matchup rows ─────────────────────────────────────── */}
            <MatchupRows
              orderTeam={orderTeam}
              chaosTeam={chaosTeam}
              myName={myName}
              ranks={ranks}
              patch={patch}
              spellMap={spellMap}
              t={t}
            />

            {/* ── Damage race bar ──────────────────────────────────── */}
            <DamageRace orderTeam={orderTeam} chaosTeam={chaosTeam} t={t} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Damage Race ──────────────────────────────────────────────────────────────

function DamageRace({
  orderTeam,
  chaosTeam,
  t,
}: {
  orderTeam: LiveGameData["allPlayers"];
  chaosTeam: LiveGameData["allPlayers"];
  t: (k: string) => string;
}) {
  const blueKills = orderTeam.reduce((s, p) => s + p.scores.kills, 0);
  const redKills = chaosTeam.reduce((s, p) => s + p.scores.kills, 0);
  const blueCs = orderTeam.reduce((s, p) => s + p.scores.creepScore, 0);
  const redCs = chaosTeam.reduce((s, p) => s + p.scores.creepScore, 0);
  const total = blueKills + redKills || 1;
  const bluePct = Math.round((blueKills / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.3, ease: "easeOut" }}
      className="mt-2 rounded-2xl border border-border/40 bg-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Swords className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">
            {t("live.teamStats") || "Stats del equipo"}
          </span>
        </div>
      </div>

      {/* Kills bar */}
      <div className="flex flex-col gap-3">
        {[
          {
            label: t("live.kills") || "Bajas",
            blue: blueKills,
            red: redKills,
          },
          {
            label: "CS",
            blue: blueCs,
            red: redCs,
          },
        ].map(({ label, blue, red }) => {
          const tot = blue + red || 1;
          const pct = Math.round((blue / tot) * 100);
          return (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-blue-400 tabular-nums w-8">{blue}</span>
                <span className="text-muted-foreground/50 font-medium">{label}</span>
                <span className="font-bold text-red-400 tabular-nums w-8 text-right">{red}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-secondary/50 flex">
                <motion.div
                  className="h-full bg-blue-500/70 rounded-l-full"
                  initial={{ width: "50%" }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
                />
                <motion.div
                  className="h-full bg-red-500/70 rounded-r-full flex-1"
                  initial={{ width: "50%" }}
                  animate={{ width: `${100 - pct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Team kill score */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[12px] font-semibold text-blue-400">
            {orderTeam.filter(p => !p.isDead).length}/{orderTeam.length} {t("live.alive") || "vivos"}
          </span>
        </div>
        <div className="text-[11px] font-black text-muted-foreground/30 tracking-[0.2em]">
          {blueKills} — {redKills}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-red-400">
            {chaosTeam.filter(p => !p.isDead).length}/{chaosTeam.length} {t("live.alive") || "vivos"}
          </span>
          <Shield className="w-3.5 h-3.5 text-red-400" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Waiting ──────────────────────────────────────────────────────────────────

function WaitingState({ t }: { t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 flex flex-col items-center justify-center text-center gap-7 py-20"
    >
      {/* Icon stack with rings */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse rings */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-primary/15"
            style={{ width: 80 + i * 32, height: 80 + i * 32 }}
            animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.06, 1] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.6, ease: "easeInOut" }}
          />
        ))}

        {/* Icon box */}
        <div className="relative w-20 h-20 rounded-2xl bg-secondary/60 border border-border/60 flex items-center justify-center shadow-lg">
          <Gamepad2 className="w-9 h-9 text-muted-foreground/40" />

          {/* Corner dots */}
          {["-top-1 -left-1", "-top-1 -right-1", "-bottom-1 -left-1", "-bottom-1 -right-1"].map((pos, i) => (
            <motion.div
              key={i}
              className={cn("absolute w-1.5 h-1.5 rounded-full bg-primary/40", pos)}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col gap-2 max-w-[280px]">
        <p className="text-[16px] font-semibold text-foreground leading-tight">
          {t("live.waiting.title")}
        </p>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {t("live.waiting.desc")}
        </p>
      </div>

      {/* Scanning bar */}
      <div className="flex flex-col items-center gap-3 w-48">
        <div className="w-full h-[2px] rounded-full bg-border/40 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary/50"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: "40%" }}
          />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/40">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-primary/50"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <WifiOff className="w-3 h-3" />
          {t("live.waiting.port")}
        </div>
      </div>

      {/* Hint pills */}
      <div className="flex gap-2 flex-wrap justify-center">
        {["Liga abierta", "En partida", "Puerto 2999"].map((label, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.35, ease: "easeOut" }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/30 bg-secondary/30 text-[11px] text-muted-foreground/50"
          >
            <Zap className="w-2.5 h-2.5" />
            {label}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
