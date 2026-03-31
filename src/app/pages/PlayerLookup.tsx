import { motion, AnimatePresence } from "motion/react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Search, User, Trophy, Swords, Shield, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronDown, Star, Clock, Flame, Crown, Target, Globe, ArrowLeft, Loader2, X, Eye, Users } from "lucide-react";
import { cn } from "../components/ui/utils";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { useLanguage } from "../contexts/LanguageContext";
import { useChampionDrawer } from "../contexts/ChampionDrawerContext";
import { searchSummoners, lookupFullProfile, formatRank, getRankColor, displayRegionToPlatform, type SummonerSearchResult } from "../services/riotApi";
import { getStoredIdentity } from "../services/dataService";
import { IS_TAURI, tauriInvoke } from "../helpers/tauriWindow";

// ─── Mock Extended Profile Data ──────────────────────────────────────────────

interface ExtendedProfile extends SummonerSearchResult {
  flexRank: string | null;
  flexLP: number;
  flexWins: number;
  flexLosses: number;
  topChampions: { name: string; mastery: number; level: number; winrate: number; games: number; kda: string }[];
  recentMatches: { champion: string; result: "WIN" | "LOSS"; kills: number; deaths: number; assists: number; cs: number; duration: string; queue: string; timeAgo: string }[];
  playstyle: string;
  avgKDA: string;
  avgCS: number;
  avgVision: number;
  preferredRole: string;
}

function generateExtendedProfile(base: SummonerSearchResult): ExtendedProfile {
  // Generate realistic-looking extended data based on the base profile
  const isHighElo = base.soloRank?.includes("CHALLENGER") || base.soloRank?.includes("GRANDMASTER") || base.soloRank?.includes("MASTER");
  const winrate = base.soloWins && base.soloLosses ? Math.round((base.soloWins / (base.soloWins + base.soloLosses)) * 100) : 50;
  
  const CHAMP_POOLS: Record<string, { name: string; mastery: number; level: number; winrate: number; games: number; kda: string }[]> = {
    "Faker": [
      { name: "Azir", mastery: 890234, level: 7, winrate: 67, games: 89, kda: "5.2/2.1/6.8" },
      { name: "Ahri", mastery: 756123, level: 7, winrate: 72, games: 67, kda: "6.1/1.9/7.2" },
      { name: "Syndra", mastery: 645890, level: 7, winrate: 64, games: 56, kda: "5.8/2.3/5.4" },
      { name: "LeBlanc", mastery: 534567, level: 7, winrate: 69, games: 45, kda: "7.2/2.5/4.9" },
      { name: "Ryze", mastery: 423456, level: 7, winrate: 61, games: 38, kda: "4.9/2.0/6.1" },
    ],
    "Caps": [
      { name: "Sylas", mastery: 678901, level: 7, winrate: 65, games: 78, kda: "6.4/2.8/5.9" },
      { name: "Akali", mastery: 567890, level: 7, winrate: 63, games: 62, kda: "7.1/3.1/4.2" },
      { name: "Orianna", mastery: 456789, level: 7, winrate: 68, games: 51, kda: "5.3/1.8/8.1" },
      { name: "LeBlanc", mastery: 345678, level: 7, winrate: 71, games: 42, kda: "7.8/2.4/5.6" },
      { name: "Yasuo", mastery: 289012, level: 7, winrate: 58, games: 36, kda: "6.9/3.5/4.1" },
    ],
    "Gumayusi": [
      { name: "Jinx", mastery: 712345, level: 7, winrate: 71, games: 82, kda: "8.2/2.1/6.3" },
      { name: "Ezreal", mastery: 623456, level: 7, winrate: 66, games: 71, kda: "6.8/2.4/7.1" },
      { name: "Kaisa", mastery: 534567, level: 7, winrate: 69, games: 59, kda: "7.5/2.6/5.8" },
      { name: "Varus", mastery: 445678, level: 7, winrate: 64, games: 47, kda: "6.1/2.0/8.2" },
      { name: "Aphelios", mastery: 356789, level: 7, winrate: 62, games: 38, kda: "7.9/2.9/5.1" },
    ],
    "Zeus": [
      { name: "Jayce", mastery: 645890, level: 7, winrate: 68, games: 75, kda: "5.8/2.0/4.9" },
      { name: "Gnar", mastery: 534567, level: 7, winrate: 65, games: 63, kda: "4.2/1.8/6.7" },
      { name: "Aatrox", mastery: 489012, level: 7, winrate: 62, games: 52, kda: "5.1/2.3/5.4" },
      { name: "Kennen", mastery: 378901, level: 7, winrate: 70, games: 41, kda: "4.8/1.5/7.8" },
      { name: "Fiora", mastery: 267890, level: 7, winrate: 66, games: 34, kda: "6.9/2.7/3.2" },
    ],
    "Canyon": [
      { name: "Viego", mastery: 789012, level: 7, winrate: 69, games: 86, kda: "6.7/2.3/7.1" },
      { name: "LeeSin", mastery: 678901, level: 7, winrate: 64, games: 74, kda: "5.4/2.8/8.9" },
      { name: "Graves", mastery: 567890, level: 7, winrate: 67, games: 58, kda: "6.1/2.1/6.4" },
      { name: "Nidalee", mastery: 456789, level: 7, winrate: 71, games: 43, kda: "5.9/2.5/7.2" },
      { name: "Kindred", mastery: 345678, level: 7, winrate: 63, games: 37, kda: "7.2/2.9/5.8" },
    ],
  };

  const defaultChamps = [
    { name: "Jinx", mastery: 234567, level: 6, winrate: 58, games: 45, kda: "5.2/3.1/6.8" },
    { name: "Ezreal", mastery: 189012, level: 6, winrate: 55, games: 38, kda: "4.8/2.8/5.9" },
    { name: "Ahri", mastery: 156789, level: 5, winrate: 52, games: 32, kda: "5.1/2.5/6.1" },
    { name: "LeeSin", mastery: 123456, level: 5, winrate: 54, games: 28, kda: "4.5/3.2/7.4" },
    { name: "Thresh", mastery: 98765, level: 5, winrate: 56, games: 24, kda: "2.1/3.8/12.5" },
  ];

  const topChampions = CHAMP_POOLS[base.gameName] || defaultChamps;

  const champNames = topChampions.map(c => c.name);
  const results: ("WIN" | "LOSS")[] = ["WIN", "WIN", "LOSS", "WIN", "LOSS", "WIN", "WIN", "LOSS", "WIN", "WIN"];
  const queues = ["Ranked Solo", "Ranked Solo", "Ranked Solo", "Ranked Flex", "Ranked Solo", "Ranked Solo", "Normal Draft", "Ranked Solo", "Ranked Solo", "Ranked Solo"];
  const timesAgo = ["2h ago", "4h ago", "6h ago", "Yesterday", "Yesterday", "2d ago", "2d ago", "3d ago", "3d ago", "4d ago"];

  const recentMatches = results.map((result, i) => ({
    champion: champNames[i % champNames.length],
    result,
    kills: result === "WIN" ? Math.floor(Math.random() * 8 + 4) : Math.floor(Math.random() * 5 + 1),
    deaths: result === "WIN" ? Math.floor(Math.random() * 3 + 1) : Math.floor(Math.random() * 6 + 3),
    assists: Math.floor(Math.random() * 10 + 3),
    cs: Math.floor(Math.random() * 100 + 150),
    duration: `${Math.floor(Math.random() * 15 + 20)}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
    queue: queues[i],
    timeAgo: timesAgo[i],
  }));

  const roles = ["MID", "TOP", "JGL", "ADC", "SUP"];
  const preferredRole = base.gameName === "Faker" || base.gameName === "Caps" || base.gameName === "ShowMaker" || base.gameName === "Chovy" ? "MID"
    : base.gameName === "Zeus" || base.gameName === "TheShy" ? "TOP"
    : base.gameName === "Canyon" ? "JGL"
    : base.gameName === "Gumayusi" || base.gameName === "Viper" || base.gameName === "Deft" || base.gameName === "Ruler" || base.gameName === "Doublelift" ? "ADC"
    : base.gameName === "Keria" || base.gameName === "BeryL" || base.gameName === "CoreJJ" ? "SUP"
    : roles[Math.floor(Math.random() * 5)];

  return {
    ...base,
    flexRank: isHighElo ? "MASTER I" : base.soloRank ? "GOLD II" : null,
    flexLP: isHighElo ? 234 : 56,
    flexWins: Math.floor((base.soloWins || 100) * 0.4),
    flexLosses: Math.floor((base.soloLosses || 80) * 0.4),
    topChampions,
    recentMatches,
    playstyle: isHighElo ? "Aggressive" : "Balanced",
    avgKDA: isHighElo ? "5.8/2.2/6.9" : "4.1/3.4/5.6",
    avgCS: isHighElo ? 8.4 : 6.2,
    avgVision: isHighElo ? 1.8 : 1.2,
    preferredRole,
  };
}

// ─── Rank Emblem Colors ──────────────────────────────────────────────────────

function getRankBg(rank: string | null): string {
  if (!rank) return "from-zinc-800/30 to-zinc-900/30";
  const tier = rank.split(" ")[0]?.toUpperCase();
  switch (tier) {
    case "IRON": return "from-stone-700/20 to-stone-900/20";
    case "BRONZE": return "from-amber-900/20 to-amber-950/20";
    case "SILVER": return "from-slate-500/20 to-slate-700/20";
    case "GOLD": return "from-yellow-600/20 to-yellow-800/20";
    case "PLATINUM": return "from-cyan-600/20 to-cyan-800/20";
    case "EMERALD": return "from-emerald-600/20 to-emerald-800/20";
    case "DIAMOND": return "from-blue-500/20 to-blue-700/20";
    case "MASTER": return "from-purple-500/20 to-purple-700/20";
    case "GRANDMASTER": return "from-red-500/20 to-red-700/20";
    case "CHALLENGER": return "from-amber-400/20 to-amber-600/20";
    default: return "from-zinc-800/30 to-zinc-900/30";
  }
}

function buildExtendedProfile(base: SummonerSearchResult): ExtendedProfile {
  if (IS_TAURI) {
    return {
      ...base,
      flexRank: null, flexLP: 0, flexWins: 0, flexLosses: 0,
      topChampions: [], recentMatches: [],
      playstyle: "—", avgKDA: "—", avgCS: 0, avgVision: 0, preferredRole: "—",
    };
  }
  return generateExtendedProfile(base);
}

const PLATFORM_TO_REGIONAL_MAP: Record<string, string> = {
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe",
  na1: "americas", br1: "americas", la1: "americas", la2: "americas", oc1: "americas",
  kr: "asia", jp1: "asia",
  ph2: "sea", sg2: "sea", th2: "sea", tw2: "sea", vn2: "sea",
};


async function enrichWithMatchHistory(
  base: ExtendedProfile,
  platform: string,
  onUpdate: (updated: ExtendedProfile) => void,
): Promise<void> {
  if (!IS_TAURI) return;
  try {
    const regional = PLATFORM_TO_REGIONAL_MAP[platform] || "europe";
    const raw = await tauriInvoke<any[]>("riot_get_matches_by_puuid", { puuid: base.puuid, regional, count: 20 });
    if (!Array.isArray(raw) || raw.length === 0) return;

    const champMap: Record<string, { games: number; wins: number; kills: number; deaths: number; assists: number }> = {};
    let totalKDA = 0, totalCs = 0, totalVision = 0, totalWins = 0;
    const recentMatches: ExtendedProfile["recentMatches"] = [];

    for (const match of raw) {
      const p = match.info?.participants?.find((x: any) => x.puuid === base.puuid);
      if (!p) continue;
      const dur = match.info.gameDuration;
      const durMin = dur / 60;
      const kda = p.deaths === 0 ? (p.kills + p.assists) : (p.kills + p.assists) / p.deaths;
      totalKDA += kda;
      totalCs += (p.totalMinionsKilled + p.neutralMinionsKilled) / durMin;
      totalVision += p.visionScore;
      if (p.win) totalWins++;

      const champ = p.championName || "Unknown";
      if (!champMap[champ]) champMap[champ] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
      champMap[champ].games++;
      champMap[champ].kills += p.kills;
      champMap[champ].deaths += p.deaths;
      champMap[champ].assists += p.assists;
      if (p.win) champMap[champ].wins++;

      if (recentMatches.length < 10) {
        const mins = Math.floor(durMin);
        const secs = String(dur % 60).padStart(2, "0");
        const gameDate = new Date(match.info.gameCreation);
        const diffH = Math.floor((Date.now() - gameDate.getTime()) / 3600000);
        const timeAgo = diffH < 1 ? "Hace <1h" : diffH < 24 ? `Hace ${diffH}h` : `Hace ${Math.floor(diffH / 24)}d`;
        recentMatches.push({
          champion: champ,
          result: p.win ? "WIN" : "LOSS",
          kills: p.kills, deaths: p.deaths, assists: p.assists,
          cs: Math.round((p.totalMinionsKilled + p.neutralMinionsKilled) / durMin * 10) / 10,
          duration: `${mins}:${secs}`,
          queue: match.info.queueId === 420 ? "Ranked Solo" : match.info.queueId === 440 ? "Ranked Flex" : "Normal",
          timeAgo,
        });
      }
    }

    const n = raw.length;
    const topChampions = Object.entries(champMap)
      .sort((a, b) => b[1].games - a[1].games)
      .slice(0, 5)
      .map(([name, s]) => ({
        name,
        mastery: s.games * 10000,
        level: 7,
        winrate: Math.round((s.wins / s.games) * 100),
        games: s.games,
        kda: `${(s.kills / s.games).toFixed(1)}/${(s.deaths / s.games).toFixed(1)}/${(s.assists / s.games).toFixed(1)}`,
      }));

    const avgKDA = (totalKDA / n).toFixed(2);
    const avgCS = parseFloat((totalCs / n).toFixed(1));
    const avgVision = parseFloat((totalVision / n).toFixed(1));

    // Detect preferred role from participants' teamPosition
    const roleCount: Record<string, number> = {};
    for (const match of raw) {
      const p = match.info?.participants?.find((x: any) => x.puuid === base.puuid);
      if (p?.teamPosition) {
        const r = p.teamPosition;
        roleCount[r] = (roleCount[r] || 0) + 1;
      }
    }
    const preferredRole = Object.entries(roleCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const roleLabels: Record<string, string> = { TOP:"TOP", JUNGLE:"JGL", MIDDLE:"MID", BOTTOM:"ADC", UTILITY:"SUP" };

    onUpdate({
      ...base,
      topChampions,
      recentMatches,
      avgKDA,
      avgCS,
      avgVision,
      preferredRole: roleLabels[preferredRole] || preferredRole,
      playstyle: totalWins / n >= 0.55 ? "Dominant" : totalWins / n >= 0.5 ? "Balanced" : "Struggling",
    });
  } catch {
    // Silently skip — base profile still shows
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

const REGIONS = ["EUW", "EUNE", "NA", "KR", "BR", "LAN", "LAS", "OCE", "TR", "RU", "JP"];

export function PlayerLookup() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SummonerSearchResult[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ExtendedProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  // Default region from stored identity, fallback to EUW
  const [selectedRegion, setSelectedRegion] = useState<string>(() => {
    const identity = getStoredIdentity();
    return identity?.region || "EUW";
  });
  const { version: patchVersion } = usePatchVersion();
  const { t } = useLanguage();
  const { openChampion } = useChampionDrawer();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Auto-search from URL params (coming from TitleBarSearch)
  const autoSearched = useRef(false);
  useEffect(() => {
    const name = searchParams.get("name");
    const tag = searchParams.get("tag");
    if (name && !autoSearched.current) {
      autoSearched.current = true;
      const hasTag = tag && tag.trim().length > 0;
      const riotId = hasTag ? `${name}#${tag}` : name;
      setSearchQuery(riotId);

      // In Tauri without a tag, don't auto-search — just pre-fill the input
      // so the user can complete the Riot ID and search manually
      if (IS_TAURI && !hasTag) return;

      const platform = displayRegionToPlatform(selectedRegion);
      (async () => {
        setIsSearching(true);
        setSearchResults([]);
        try {
          const results = await searchSummoners(riotId, platform);
          setSearchResults(results);
          if (results.length === 1) {
            setIsLoadingProfile(true);
            const extended = buildExtendedProfile(results[0]);
            setSelectedProfile(extended);
            setIsLoadingProfile(false);
            setSearchResults([]);
            enrichWithMatchHistory(extended, platform, setSelectedProfile);
          }
        } finally {
          setIsSearching(false);
        }
      })();
    }
  }, [searchParams]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    if (IS_TAURI && !searchQuery.includes("#")) {
      setLookupError(t("playerLookup.needsTag") || "Usa el formato NombreDeInvocador#TAG (ej: Panzer#ALC)");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setLookupError(null);
    try {
      const results = await searchSummoners(searchQuery, displayRegionToPlatform(selectedRegion));
      if (results.length === 0 && IS_TAURI) {
        setLookupError(t("playerLookup.notFound") || "Invocador no encontrado. Verifica el Riot ID y la región.");
      }
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlayer = async (result: SummonerSearchResult) => {
    setIsLoadingProfile(true);
    setSelectedProfile(null);
    setLookupError(null);
    const extended = buildExtendedProfile(result);
    setSelectedProfile(extended);
    setIsLoadingProfile(false);
    setSearchResults([]);
    // Enrich with real match data async (non-blocking)
    const platform = displayRegionToPlatform(selectedRegion);
    enrichWithMatchHistory(extended, platform, setSelectedProfile);
  };

  const patch = patchVersion || "14.10.1";
  const wr = selectedProfile && selectedProfile.soloWins + selectedProfile.soloLosses > 0
    ? Math.round((selectedProfile.soloWins / (selectedProfile.soloWins + selectedProfile.soloLosses)) * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex flex-col font-sans pb-20"
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-3">
          <Search className="w-7 h-7 text-primary" />
          {t("playerLookup.title") || "Player Lookup"}
        </h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          {t("playerLookup.subtitle") || "Search any summoner by Riot ID to view their profile, rank, champions and match history"}
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder={t("playerLookup.searchPlaceholder") || "Riot ID (ej: Panzer#ALC)"}
            className="w-full h-11 pl-10 pr-4 bg-card border border-border/50 rounded-xl text-[14px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer">
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
        </div>
        {/* Region selector */}
        <select
          value={selectedRegion}
          onChange={e => setSelectedRegion(e.target.value)}
          className="h-11 px-3 bg-card border border-border/50 rounded-xl text-[13px] font-mono font-medium text-foreground outline-none focus:border-primary/40 cursor-pointer shrink-0"
        >
          {REGIONS.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="h-11 px-6 bg-primary text-primary-foreground rounded-xl text-[13px] font-medium hover:bg-primary/90 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-2"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {t("playerLookup.search") || "Buscar"}
        </button>
      </div>

      {/* Format hint in Tauri when no #TAG yet */}
      {IS_TAURI && searchQuery && !searchQuery.includes("#") && !lookupError && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-[12px] text-primary/70">
          Añade tu tag personalizado de Riot ID: <span className="font-mono font-medium text-primary">{searchQuery}#TAG</span> — el tag lo ves en el cliente de LoL o en tu perfil de Riot Games
        </div>
      )}

      {/* Error state */}
      {lookupError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/8 border border-destructive/20 text-[13px] text-destructive">
          {lookupError}
        </div>
      )}

      {/* Quick suggestions */}
      {!selectedProfile && searchResults.length === 0 && !isLoadingProfile && !lookupError && (
        <div className="mb-6">
          <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-medium mb-2 block">
            {t("playerLookup.trySearching") || "Try searching"}
          </span>
          <div className="flex flex-wrap gap-2">
            {["Faker#T1", "Caps#CAPS", "Canyon#Deft", "Gumayusi#T1", "Chovy#Gen", "Doublelift#DL"].map(name => (
              <button
                key={name}
                onClick={() => { setSearchQuery(name); }}
                className="px-3 py-1.5 bg-secondary/60 border border-border/30 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all cursor-pointer"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {searchResults.length > 0 && !selectedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-6 border border-border/50 rounded-xl bg-card overflow-hidden"
          >
            <div className="px-4 py-2 border-b border-border/30">
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-mono">
                {searchResults.length} {t("playerLookup.resultsFound") || "results found"}
              </span>
            </div>
            {searchResults.map(result => (
              <button
                key={result.puuid}
                onClick={() => handleSelectPlayer(result)}
                className="flex items-center gap-4 w-full px-4 py-3 hover:bg-secondary/40 transition-colors text-left cursor-pointer border-b border-border/20 last:border-0"
              >
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/profileicon/${result.profileIconId}.png`}
                  className="w-10 h-10 rounded-full border border-border/40 object-cover"
                  alt=""
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/profileicon/1.png`; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-foreground">{result.gameName}</span>
                    <span className="text-[11px] text-muted-foreground/50">#{result.tagLine}</span>
                    <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground/60 font-mono">{result.region}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={cn("text-[12px] font-medium", getRankColor(result.soloRank))}>
                      {result.soloRank ? formatRank(result.soloRank) : "Unranked"}
                    </span>
                    {result.soloRank && <span className="text-[11px] text-muted-foreground/50">{result.soloLP} LP</span>}
                    <span className="text-[11px] text-muted-foreground/40">Lvl {result.summonerLevel}</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/30" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isLoadingProfile && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="text-[13px] text-muted-foreground">{t("playerLookup.loading") || "Loading profile..."}</span>
        </div>
      )}

      {/* Profile View */}
      <AnimatePresence mode="wait">
        {selectedProfile && (
          <motion.div
            key={selectedProfile.puuid}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6"
          >
            {/* Back button */}
            <button
              onClick={() => { setSelectedProfile(null); setSearchResults([]); }}
              className="flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer self-start"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t("playerLookup.backToSearch") || "Back to search"}
            </button>

            {/* Profile Header */}
            <div className={cn("relative rounded-2xl border border-border/40 overflow-hidden bg-gradient-to-br", getRankBg(selectedProfile.soloRank))}>
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 bg-primary/5 pointer-events-none" />
              <div className="relative z-10 p-6 flex items-center gap-6">
                <div className="relative">
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/profileicon/${selectedProfile.profileIconId}.png`}
                    className="w-20 h-20 rounded-2xl border-2 border-border/40 object-cover shadow-lg"
                    alt=""
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/profileicon/1.png`; }}
                  />
                  <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-card border border-border/40 rounded-md text-[10px] font-mono font-bold text-foreground shadow-sm">
                    {selectedProfile.summonerLevel}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-[24px] font-bold text-foreground">{selectedProfile.gameName}</h2>
                    <span className="text-[14px] text-muted-foreground/50">#{selectedProfile.tagLine}</span>
                    <span className="px-2 py-0.5 bg-secondary/60 border border-border/30 rounded text-[10px] font-mono text-muted-foreground/60">{selectedProfile.region}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn("text-[16px] font-bold", getRankColor(selectedProfile.soloRank))}>
                      {selectedProfile.soloRank ? formatRank(selectedProfile.soloRank) : "Unranked"}
                    </span>
                    {selectedProfile.soloRank && (
                      <span className="text-[13px] text-muted-foreground/60 font-mono">{selectedProfile.soloLP} LP</span>
                    )}
                    {wr !== null && (
                      <span className={cn("text-[12px] font-medium", wr >= 55 ? "text-green-500" : wr >= 50 ? "text-foreground/70" : "text-red-400")}>
                        {wr}% WR
                      </span>
                    )}
                    <span className="text-[12px] text-muted-foreground/40">{selectedProfile.soloWins}W {selectedProfile.soloLosses}L</span>
                  </div>
                  {!IS_TAURI && (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                        <Target className="w-3 h-3" /> {selectedProfile.preferredRole}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                        <Flame className="w-3 h-3" /> {selectedProfile.playstyle}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                        <Swords className="w-3 h-3" /> KDA {selectedProfile.avgKDA}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid — only shown in web preview with mock data */}
            {!IS_TAURI && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Avg KDA", value: selectedProfile.avgKDA, icon: Swords },
                  { label: "CS/min", value: selectedProfile.avgCS.toFixed(1), icon: Target },
                  { label: "Vision/min", value: selectedProfile.avgVision.toFixed(1), icon: Eye },
                  { label: "Preferred Role", value: selectedProfile.preferredRole, icon: Crown },
                ].map(stat => (
                  <div key={stat.label} className="p-4 rounded-xl bg-card border border-border/50 flex items-center gap-3 card-lift card-shine">
                    <div className="w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center">
                      <stat.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block">{stat.label}</span>
                      <span className="text-[16px] font-bold text-foreground font-mono">{stat.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ranked Queues */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Solo/Duo */}
              <div className="p-5 rounded-xl bg-card border border-border/50 card-lift card-shine">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-[12px] font-bold text-foreground uppercase tracking-wider">Ranked Solo/Duo</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className={cn("w-16 h-16 rounded-xl bg-gradient-to-br flex items-center justify-center", getRankBg(selectedProfile.soloRank))}>
                    <Crown className={cn("w-8 h-8", getRankColor(selectedProfile.soloRank))} />
                  </div>
                  <div className="flex-1">
                    <span className={cn("text-[18px] font-bold block", getRankColor(selectedProfile.soloRank))}>
                      {selectedProfile.soloRank ? formatRank(selectedProfile.soloRank) : "Unranked"}
                    </span>
                    {selectedProfile.soloRank && (
                      <span className="text-[12px] text-muted-foreground font-mono">{selectedProfile.soloLP} LP</span>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-green-500">{selectedProfile.soloWins}W</span>
                      <span className="text-[11px] text-red-400">{selectedProfile.soloLosses}L</span>
                      {wr !== null && (
                        <span className={cn("text-[11px] font-medium", wr >= 50 ? "text-foreground/70" : "text-red-400")}>{wr}%</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Flex */}
              <div className="p-5 rounded-xl bg-card border border-border/50 card-lift card-shine">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[12px] font-bold text-foreground uppercase tracking-wider">Ranked Flex</span>
                </div>
                {selectedProfile.flexWins > 0 || selectedProfile.flexLosses > 0 ? (
                  <div className="flex items-center gap-4">
                    <div className={cn("w-16 h-16 rounded-xl bg-gradient-to-br flex items-center justify-center", getRankBg(selectedProfile.flexRank))}>
                      <Shield className={cn("w-8 h-8", getRankColor(selectedProfile.flexRank))} />
                    </div>
                    <div className="flex-1">
                      <span className={cn("text-[18px] font-bold block", getRankColor(selectedProfile.flexRank))}>
                        {selectedProfile.flexRank ? formatRank(selectedProfile.flexRank) : "Unranked"}
                      </span>
                      {selectedProfile.flexRank && (
                        <span className="text-[12px] text-muted-foreground font-mono">{selectedProfile.flexLP} LP</span>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-green-500">{selectedProfile.flexWins}W</span>
                        <span className="text-[11px] text-red-400">{selectedProfile.flexLosses}L</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-secondary/30 flex items-center justify-center">
                      <Shield className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <span className="text-[16px] font-bold text-muted-foreground/40">Unranked</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top Champions */}
            <div className="p-5 rounded-xl bg-card border border-border/50 card-lift card-shine">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-[12px] font-bold text-foreground uppercase tracking-wider">{t("playerLookup.topChampions") || "Top Champions"}</span>
              </div>
              {selectedProfile.topChampions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {selectedProfile.topChampions.map((champ) => (
                    <button
                      key={champ.name}
                      onClick={() => openChampion(champ.name)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary/30 border border-border/20 hover:border-primary/30 hover:bg-secondary/50 transition-all cursor-pointer group"
                    >
                      <div className="relative">
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${champ.name}.png`}
                          className="w-12 h-12 rounded-xl object-cover border border-border/30 group-hover:border-primary/30 transition-colors"
                          alt={champ.name}
                        />
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary/80 text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                          M{champ.level}
                        </div>
                      </div>
                      <span className="text-[12px] font-medium text-foreground">{champ.name}</span>
                      <div className="flex flex-col items-center gap-0.5 w-full">
                        <span className={cn("text-[11px] font-mono font-bold", champ.winrate >= 55 ? "text-green-500" : champ.winrate >= 50 ? "text-foreground/60" : "text-red-400")}>
                          {champ.winrate}% WR
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">{champ.games} games</span>
                        <span className="text-[10px] text-muted-foreground/40 font-mono">{champ.kda}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 py-4 text-[13px] text-muted-foreground/50">
                  <Star className="w-4 h-4 shrink-0" />
                  {t("playerLookup.championsUnavailable") || "Champion mastery data requires Riot API access and is not available for external profiles."}
                </div>
              )}
            </div>

            {/* Recent Matches */}
            <div className="p-5 rounded-xl bg-card border border-border/50 card-lift card-shine">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-[12px] font-bold text-foreground uppercase tracking-wider">{t("playerLookup.recentMatches") || "Recent Matches"}</span>
              </div>
              {selectedProfile.recentMatches.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {selectedProfile.recentMatches.map((match, i) => {
                    const kda = match.deaths > 0 ? ((match.kills + match.assists) / match.deaths).toFixed(1) : "Perfect";
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-4 px-4 py-2.5 rounded-lg border transition-colors",
                          match.result === "WIN"
                            ? "bg-green-500/5 border-green-500/15 hover:bg-green-500/10"
                            : "bg-red-500/5 border-red-500/15 hover:bg-red-500/10"
                        )}
                      >
                        <div className={cn("w-1 h-8 rounded-full", match.result === "WIN" ? "bg-green-500" : "bg-red-500")} />
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${match.champion}.png`}
                          className="w-8 h-8 rounded-lg object-cover border border-border/30"
                          alt={match.champion}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[12px] font-bold", match.result === "WIN" ? "text-green-500" : "text-red-400")}>
                              {match.result}
                            </span>
                            <span className="text-[11px] text-muted-foreground/50">{match.queue}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground/40">{match.champion} · {match.duration}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[13px] font-mono font-bold text-foreground block">
                            {match.kills}/{match.deaths}/{match.assists}
                          </span>
                          <span className={cn(
                            "text-[10px] font-mono",
                            Number(kda) >= 4 ? "text-green-500" : Number(kda) >= 2.5 ? "text-foreground/50" : "text-red-400"
                          )}>
                            {kda} KDA
                          </span>
                        </div>
                        <div className="text-center w-14">
                          <span className="text-[12px] font-mono text-foreground block">{match.cs}</span>
                          <span className="text-[9px] text-muted-foreground/40">CS</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/40 w-16 text-right">{match.timeAgo}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-3 py-4">
                  <p className="text-[13px] text-muted-foreground/50 flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    {t("playerLookup.matchesUnavailable") || "Match history is only available for your own account in the Activity Log."}
                  </p>
                  <button
                    onClick={() => navigate("/matches")}
                    className="self-start px-4 py-2 bg-secondary/60 border border-border/30 rounded-lg text-[12px] text-foreground hover:bg-secondary transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {t("playerLookup.goToActivityLog") || "View your Activity Log"}
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/30 px-1">
              <Shield className="w-3 h-3" />
              {t("playerLookup.disclaimer") || "Data from Riot Games API. Velaris is not endorsed by Riot Games."}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}