import { motion, AnimatePresence } from "motion/react";
import { 
  HelpCircle, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Lightbulb,
  Search,
  ArrowRight,
  X,
  Zap,
  Users,
  AlertTriangle,
  Monitor,
  Swords,
  Ban,
  Star,
  Crown,
  Sparkles,
  Lock,
  Loader2,
  MousePointerClick,
  Crosshair,
  Target,
  TrendingUp,
  Flame,
  Eye
} from "lucide-react";
import { cn } from "../components/ui/utils";
import { useState, useEffect, useCallback, useMemo, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { useNavigate } from "react-router";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { getPlayerTitles, getChampSelectSession, executeChampSelectAction, focusVelarisWindow, getPersonalBestBuild, loadSettings, type ChampSelectSession, type ChampSelectAction, type PersonalBuild } from "../services/dataService";
import { CHAMPION_BUILDS } from "../data/champion-builds";
import { getBuildRec, getItemIdMap, enrichItemIds, importRunePage, type BuildRec } from "../services/buildService";
import { useAsyncData } from "../hooks/useAsyncData";
import { useChampionDrawer } from "../contexts/ChampionDrawerContext";
import { useLeagueClient } from "../contexts/LeagueClientContext";
import { toast } from "sonner";
import { getChampionAnalysis, getChampionCounters, getChampionTrait, getMatchupTip, getThreatLevel, getRecommendationsForRole, generateDraftGuide, getBanSuggestions, getChampionPowerCurve, type BanSuggestion } from "../utils/matchups";
import { useLanguage } from "../contexts/LanguageContext";
import { PreGameBriefing } from "../components/PreGameBriefing";
import { getRuneIconUrl } from "../data/runeData";

// Data Dragon champion icons mapping
const getChampIcon = (name: string, patch: string) => `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${name}.png`;
const getChampLoading = (name: string) => `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${name}_0.jpg`;

const allChampions = [
  "Aatrox", "Ahri", "Akali", "Akshan", "Alistar", "Amumu", "Anivia", "Annie", "Aphelios", "Ashe", 
  "AurelionSol", "Azir", "Bard", "Belveth", "Blitzcrank", "Brand", "Braum", "Briar", "Caitlyn", "Camille", 
  "Cassiopeia", "Chogath", "Corki", "Darius", "Diana", "Draven", "DrMundo", "Ekko", "Elise", "Evelynn", 
  "Ezreal", "Fiddlesticks", "Fiora", "Fizz", "Galio", "Gangplank", "Garen", "Gnar", "Gragas", "Graves", 
  "Gwen", "Hecarim", "Heimerdinger", "Hwei", "Illaoi", "Irelia", "Ivern", "Janna", "JarvanIV", "Jax", 
  "Jayce", "Jhin", "Jinx", "Kaisa", "Kalista", "Karma", "Karthus", "Kassadin", "Katarina", "Kayle", 
  "Kayn", "Kennen", "Khazix", "Kindred", "Kled", "KogMaw", "KSante", "Leblanc", "LeeSin", "Leona", 
  "Lillia", "Lissandra", "Lucian", "Lulu", "Lux", "Malphite", "Malzahar", "Maokai", "MasterYi", "Milio", 
  "MissFortune", "Mordekaiser", "Morgana", "Naafiri", "Nami", "Nasus", "Nautilus", "Neeko", "Nidalee", "Nilah", 
  "Nocturne", "Nunu", "Olaf", "Orianna", "Ornn", "Pantheon", "Poppy", "Pyke", "Qiyana", "Quinn", 
  "Rakan", "Rammus", "RekSai", "Rell", "Renata", "Renekton", "Rengar", "Riven", "Rumble", "Ryze", 
  "Samira", "Sejuani", "Senna", "Seraphine", "Sett", "Shaco", "Shen", "Shyvana", "Singed", "Sion", 
  "Sivir", "Skarner", "Smolder", "Sona", "Soraka", "Swain", "Sylas", "Syndra", "TahmKench", "Taliyah", 
  "Talon", "Taric", "Teemo", "Thresh", "Tristana", "Trundle", "Tryndamere", "TwistedFate", "Twitch", "Udyr", 
  "Urgot", "Varus", "Vayne", "Veigar", "Velkoz", "Vex", "Vi", "Viego", "Viktor", "Vladimir", 
  "Volibear", "Warwick", "Xayah", "Xerath", "XinZhao", "Yasuo", "Yone", "Yorick", "Yuumi", "Zac", 
  "Zed", "Zeri", "Ziggs", "Zilean", "Zoe", "Zyra"
];

// Helper: Map LCU position to display role
const positionToRole = (pos: string): string => {
  switch (pos.toLowerCase()) {
    case "top": return "TOP";
    case "jungle": return "JGL";
    case "middle": return "MID";
    case "bottom": return "ADC";
    case "utility": return "SUP";
    default: return pos.toUpperCase() || "???";
  }
};

// Difficulty badge colors
const difficultyColor = (d: "easy" | "medium" | "hard") => {
  if (d === "easy") return "text-emerald-500 bg-emerald-500/10";
  if (d === "hard") return "text-red-500 bg-red-500/10";
  return "text-amber-500 bg-amber-500/10";
};

// ─── Team Comp Classifier ──────────────────────────────────────────────────────

const AD_CHAMPS = new Set(["Aatrox","Akshan","Camille","Darius","Draven","Ezreal","Fiora","Gangplank","Garen","Gnar","Graves","Irelia","JarvanIV","Jax","Jayce","Jhin","Jinx","Kaisa","Kalista","Khazix","Kled","LeeSin","Lucian","MasterYi","MissFortune","Nasus","Nocturne","Olaf","Pantheon","Quinn","Renekton","Rengar","Riven","Samira","Sett","Shyvana","Sivir","Talon","Tristana","Tryndamere","Urgot","Varus","Vayne","Vi","Viego","Warwick","XinZhao","Yasuo","Yone","Yorick","Zed","Zeri"]);
const AP_CHAMPS = new Set(["Ahri","Akali","Amumu","Anivia","Annie","AurelionSol","Azir","Brand","Cassiopeia","Chogath","Diana","Ekko","Elise","Evelynn","Fiddlesticks","Fizz","Galio","Gragas","Hwei","Karthus","Kassadin","Katarina","Kayle","Kennen","KogMaw","Leblanc","Lissandra","Lux","Malzahar","Mordekaiser","Morgana","Nami","Neeko","Nidalee","Orianna","Rumble","Ryze","Seraphine","Sylas","Syndra","Taliyah","TwistedFate","Veigar","Velkoz","Vex","Viktor","Vladimir","Xerath","Yuumi","Zac","Ziggs","Zilean","Zoe","Zyra"]);
const TANK_CHAMPS = new Set(["Alistar","Amumu","Blitzcrank","Braum","Chogath","Galio","Gragas","Illaoi","Jarvan IV","JarvanIV","Leona","Malphite","Maokai","Nautilus","Ornn","Poppy","Rammus","Rell","Sejuani","Shen","Sion","Skarner","TahmKench","Taric","Thresh","Trundle","Udyr","Volibear","Warwick","Zac"]);
const CC_CHAMPS = new Set(["Alistar","Amumu","Ashe","Blitzcrank","Braum","Chogath","Fiddlesticks","Galio","Hecarim","JarvanIV","Leona","Lissandra","Malphite","Maokai","Morgana","Nautilus","Nocturne","Orianna","Ornn","Pantheon","Poppy","Rammus","Rell","Sejuani","Shen","Sion","Skarner","Swain","TahmKench","Thresh","Udyr","Veigar","Volibear","Zac","Zyra"]);
const PEEL_CHAMPS = new Set(["Alistar","Bard","Braum","Ivern","Janna","Karma","Lulu","Milio","Morgana","Nami","Poppy","Rakan","Seraphine","Sona","Soraka","Taric","Thresh","Yuumi","Zilean"]);

interface CompScore { ad: boolean; ap: boolean; tank: boolean; cc: boolean; peel: boolean }

function analyzeTeamComp(champNames: string[]): CompScore {
  return {
    ad: champNames.some(c => AD_CHAMPS.has(c)),
    ap: champNames.some(c => AP_CHAMPS.has(c)),
    tank: champNames.some(c => TANK_CHAMPS.has(c)),
    cc: champNames.some(c => CC_CHAMPS.has(c)),
    peel: champNames.some(c => PEEL_CHAMPS.has(c)),
  };
}

// ─── Ally card with splash parallax ──────────────────────────────────────────
interface AllyCardProps {
  ally: { role: string; champ: string; displayChamp?: string; player: string; rank: string; winrate: string; games: string; isYou?: boolean; trait: string; traitColor: string; traitBg: string };
  isSelected: boolean;
  idx: number;
  onSelect: () => void;
  youLabel: string;
  strongPointLabel: string;
  winrateLabel: string;
  gamesLabel: string;
}

function AllyLoadingCard({ ally, isSelected, idx, onSelect, youLabel, strongPointLabel, winrateLabel, gamesLabel }: AllyCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 18;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 14;
    setParallax({ x, y });
  };

  const handleMouseLeave = () => setParallax({ x: 0, y: 0 });

  return (
    <motion.div
      ref={cardRef}
      key={idx}
      onClick={onSelect}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: idx * 0.06, duration: 0.25, ease: "easeOut" }}
      className={cn(
        "relative rounded-2xl overflow-hidden border flex flex-col group shadow-lg cursor-pointer transition-all duration-300",
        isSelected ? "scale-[1.02] z-30" : "hover:scale-[1.01] hover:border-foreground/30",
        ally.isYou
          ? (isSelected ? "border-primary ring-4 ring-primary/60 shadow-[0_0_30px_rgba(var(--primary),0.3)]" : "border-primary ring-2 ring-primary/40")
          : (isSelected ? "border-foreground/50 ring-2 ring-foreground/30 bg-secondary/10" : "border-border/40 bg-card")
      )}
    >
      {ally.isYou && (
        <div className="absolute top-3 right-3 z-30 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-[0_0_15px_rgba(var(--primary),0.8)] border border-white/20">
          {youLabel}
        </div>
      )}
      <div className="h-[55%] w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
        <img
          src={getChampLoading(ally.champ)}
          alt={ally.champ}
          className="w-full h-full object-cover"
          style={{
            transform: `scale(1.12) translate(${parallax.x}px, ${parallax.y}px)`,
            transition: parallax.x === 0 && parallax.y === 0 ? "transform 0.6s ease-out" : "transform 0.08s linear",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80";
          }}
        />
        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col">
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">{ally.role}</span>
          <span className="text-[20px] font-bold text-white leading-none mb-1">{ally.displayChamp || ally.champ}</span>
          <span className="text-[13px] text-white/80 font-medium truncate">{ally.player} • <span className="text-white font-bold">{ally.rank}</span></span>
        </div>
      </div>
      <div className={cn("flex-1 p-4 flex flex-col gap-3 z-20 transition-colors", ally.isYou ? "bg-primary/5" : (isSelected ? "bg-secondary/20" : "bg-card"))}>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{strongPointLabel}</span>
          <div className={cn("inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[12px] font-bold mt-1 self-start", ally.traitBg, ally.traitColor)}>
            {ally.trait}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <div className="flex flex-col p-2 rounded-lg bg-secondary/50">
            <span className="text-[10px] text-muted-foreground mb-0.5">{winrateLabel}</span>
            <span className={cn("text-[13px] font-mono font-bold", parseInt(ally.winrate) >= 50 ? "text-green-500" : "text-red-500")}>
              {ally.winrate}
            </span>
          </div>
          <div className="flex flex-col p-2 rounded-lg bg-secondary/50">
            <span className="text-[10px] text-muted-foreground mb-0.5">{gamesLabel}</span>
            <span className="text-[13px] font-mono font-bold text-foreground">{ally.games}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ChampSelect() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState<"draft" | "loading">("draft");
  const [selectedRole, setSelectedRole] = useState("ADC");
  const [expandedTitle, setExpandedTitle] = useState<string | null>(null);
  const [showDraftGuide, setShowDraftGuide] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [hoveredChamp, setHoveredChamp] = useState<string | null>(null);
  const [showBanSuggestions, setShowBanSuggestions] = useState(true);
  const [showChecklist, setShowChecklist] = useState(() => {
    try { return localStorage.getItem("velaris-checklist-dismissed") !== "1"; } catch { return true; }
  });
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const lastFocusedActionRef = useRef<number | null>(null);
  const [personalBuild, setPersonalBuild] = useState<PersonalBuild | null>(null);
  const [buildForChamp, setBuildForChamp] = useState<string>("");
  const [liveBuild, setLiveBuild] = useState<BuildRec | null>(null);
  const [liveBuildChamp, setLiveBuildChamp] = useState<string>("");
  const { version: patchVersion, isLoading: patchLoading } = usePatchVersion();
  const { openChampion } = useChampionDrawer();
  const { clientState } = useLeagueClient();
  const [liveSession, setLiveSession] = useState<ChampSelectSession | null>(null);
  const { t } = useLanguage();
  const consecutiveFailsRef = useRef(0);
  const [autoImportState, setAutoImportState] = useState<"idle" | "importing" | "done" | "error">("idle");
  const autoImportedForRef = useRef<string>("");
  
  const filteredChamps = allChampions.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  // Poll LCU champ select session — only when phase is CHAMP_SELECT,
  // with exponential backoff on consecutive failures to prevent log spam
  const fetchSession = useCallback(async () => {
    if (clientState !== "CHAMP_SELECT") {
      setLiveSession(null);
      consecutiveFailsRef.current = 0;
      return;
    }
    try {
      const session = await getChampSelectSession();
      setLiveSession(session);
      consecutiveFailsRef.current = 0;
    } catch {
      consecutiveFailsRef.current += 1;
      if (consecutiveFailsRef.current <= 3) {
        console.warn(`[Velaris] ChampSelect fetch failed (attempt ${consecutiveFailsRef.current})`);
      }
      setLiveSession(null);
    }
  }, [clientState]);

  useEffect(() => {
    fetchSession();
    const baseInterval = 2000;
    const fails = consecutiveFailsRef.current;
    const interval = Math.min(baseInterval * Math.pow(2, Math.min(fails, 2)), 8000);
    const timer = setInterval(fetchSession, interval);
    return () => clearInterval(timer);
  }, [fetchSession]);

  // Build a fingerprint of picked champion IDs so derived data recalculates
  const sessionFingerprint = useMemo(() => {
    if (!liveSession) return "mock";
    const myChamps = liveSession.myTeam.map(p => p.championId).join(",");
    const theirChamps = liveSession.theirTeam.map(p => p.championId).join(",");
    return `${myChamps}|${theirChamps}`;
  }, [liveSession]);

  // Compute player scouting tags
  const { data: playerTitles } = useAsyncData(() => getPlayerTitles(t), [sessionFingerprint]);

  // Bans from live session — when a real session exists, always use live data (even if empty).
  // Empty slots show as placeholder circles instead of fake hardcoded champions.
  const bans = useMemo(() => {
    if (!liveSession) {
      // Mock fallback only when no live session at all (web preview or waiting)
      return {
        allyBans: ["Yasuo", "Yone", "Zed", "Katarina", "Sylas"],
        enemyBans: ["Tristana", "Jinx", "Vayne", "LeeSin", "Nautilus"],
      };
    }
    return {
      allyBans: (liveSession.bans?.myTeamBans || []).filter(Boolean),
      enemyBans: (liveSession.bans?.theirTeamBans || []).filter(Boolean),
    };
  }, [liveSession]);

  // ── Mock data uses the matchup system too ──
  const mockAllies = useMemo((): Array<{
    role: string; champ: string; player: string; winrate: string; games: string; rank: string;
    displayChamp?: string; highlight?: boolean; isYou?: boolean;
    trait: string; traitColor: string; traitBg: string;
    analysis: ReturnType<typeof getChampionAnalysis>;
  }> => [
    { 
      role: "TOP", champ: "Shen", player: "TopDiff", winrate: "51%", games: "85", rank: "Emerald II",
      ...getChampionTrait("Shen"), analysis: getChampionAnalysis("Shen"),
    },
    { 
      role: "JGL", champ: "LeeSin", player: "Jungle Diff", winrate: "48%", games: "310", displayChamp: "Lee Sin", rank: "Emerald IV",
      ...getChampionTrait("LeeSin"), analysis: getChampionAnalysis("LeeSin"),
    },
    { 
      role: "MID", champ: "Ahri", player: "MidKing", winrate: "61%", games: "45", highlight: true, rank: "Diamond IV",
      ...getChampionTrait("Ahri"), analysis: getChampionAnalysis("Ahri"),
    },
    { 
      role: "ADC", champ: "Tristana", player: t("champselect.you.picking"), winrate: "58%", games: "210", isYou: true, rank: "Emerald III",
      trait: "Hypercarry", traitColor: "text-primary", traitBg: "bg-primary/10",
      analysis: getChampionAnalysis("Tristana"),
    },
    { 
      role: "SUP", champ: "Bard", player: "HookMaster", winrate: "52%", games: "89", rank: "Emerald IV",
      ...getChampionTrait("Bard"), analysis: getChampionAnalysis("Bard"),
    },
  ], [t]);

  // Build allies from live session or fall back to mock
  const allies = useMemo(() => {
    if (!liveSession) return mockAllies;
    // Riot policy: non-party ally names must be anonymized in champion select.
    // Since we cannot determine party membership, all non-local allies are shown as "Ally #N".
    let allyIndex = 0;
    return liveSession.myTeam.map((p) => {
      const role = positionToRole(p.assignedPosition);
      const champName = p.championName || "???";
      const hasPicked = p.championId > 0 && champName && champName !== "???";
      const analysis = hasPicked ? getChampionAnalysis(champName) : {
        skills: ["Q", "W", "E"], maxOrder: "Q > W > E",
        strengths: [t("champselect.waitingSelection")], weaknesses: [] as string[],
        tip: t("champselect.analysisAutoUpdate")
      };
      const traitData = hasPicked ? getChampionTrait(champName) : { trait: t("champselect.picking"), traitColor: "text-muted-foreground", traitBg: "bg-secondary/50" };
      const displayName = p.isLocalPlayer ? (p.summonerName || role) : `Ally #${++allyIndex}`;
      return {
        role,
        champ: champName,
        displayChamp: champName,
        player: displayName,
        winrate: "--%",
        games: "--",
        rank: "--",
        isYou: p.isLocalPlayer,
        highlight: p.isLocalPlayer,
        trait: p.isLocalPlayer ? (hasPicked ? traitData.trait : t("champselect.yourPick")) : traitData.trait,
        traitColor: p.isLocalPlayer ? "text-primary" : traitData.traitColor,
        traitBg: p.isLocalPlayer ? "bg-primary/10" : traitData.traitBg,
        analysis,
      };
    });
  }, [sessionFingerprint, liveSession]);

  // Mock enemies
  const mockEnemies = useMemo((): Array<{
    role: string; champ: string; displayChamp?: string; hidden: boolean; counters: string[]; rank: string;
  }> => [
    { role: "TOP", champ: "Camille", hidden: false, counters: getChampionCounters("Camille", 3), rank: "Platinum I" },
    { role: "JGL", champ: "JarvanIV", displayChamp: "Jarvan IV", hidden: false, counters: getChampionCounters("JarvanIV", 3), rank: "Platinum II" },
    { role: "MID", champ: "Viktor", hidden: false, counters: getChampionCounters("Viktor", 3), rank: "Emerald IV" },
    { role: "ADC", champ: t("champselect.unknown"), hidden: true, counters: [] as string[], rank: t("champselect.hidden") },
    { role: "SUP", champ: t("champselect.unknown"), hidden: true, counters: [] as string[], rank: t("champselect.hidden") },
  ], [t]);

  // Build enemies — REACTIVE
  const enemies = useMemo(() => {
    if (!liveSession) return mockEnemies;
    return liveSession.theirTeam.map((p) => {
      const role = positionToRole(p.assignedPosition);
      const champName = p.championName;
      const hasPicked = p.championId > 0 && champName;
      return {
        role,
        champ: hasPicked ? champName : t("champselect.unknown"),
        displayChamp: hasPicked ? champName : t("champselect.unknown"),
        hidden: !hasPicked,
        counters: hasPicked ? getChampionCounters(champName, 3) : ([] as string[]),
        rank: "--",
      };
    });
  }, [sessionFingerprint, liveSession]);

  // Timer from live session — with local countdown between polls
  const [localTimer, setLocalTimer] = useState<number | null>(null);
  const lastServerTimer = useRef<number | null>(null);

  // Sync from server polls
  useEffect(() => {
    if (liveSession) {
      const serverSeconds = Math.max(0, Math.floor(liveSession.timer.adjustedTimeLeftInPhase));
      // Only reset if server value changed significantly (new phase or big jump)
      if (lastServerTimer.current === null || Math.abs(serverSeconds - (lastServerTimer.current)) > 2) {
        setLocalTimer(serverSeconds);
      }
      lastServerTimer.current = serverSeconds;
    } else {
      setLocalTimer(null);
      lastServerTimer.current = null;
    }
  }, [liveSession]);

  // Local countdown every second
  const timerActive = localTimer !== null && localTimer > 0;
  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(() => {
      setLocalTimer(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(id);
  }, [timerActive]);

  const timerSeconds = localTimer;

  // Timer phase label from LCU
  const timerPhase = liveSession?.timer?.phase || null;
  const phaseLabel = useMemo(() => {
    if (!timerPhase) return null;
    const map: Record<string, string> = {
      PLANNING: t("cs.phase.planning") || "PLANNING",
      BAN_PICK: t("cs.phase.banPick") || "BAN / PICK",
      FINALIZATION: t("cs.phase.finalization") || "FINALIZATION",
      GAME_STARTING: t("cs.phase.gameStarting") || "STARTING",
    };
    return map[timerPhase] || timerPhase;
  }, [timerPhase, t]);

  // Audio alert when timer drops below 5 seconds
  const hasPlayedAlert = useRef(false);
  useEffect(() => {
    if (timerSeconds !== null && timerSeconds <= 5 && timerSeconds > 0 && !hasPlayedAlert.current) {
      hasPlayedAlert.current = true;
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const playBeep = (freq: number, delay: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.2);
        };
        playBeep(880, 0);
        playBeep(1100, 0.2);
        playBeep(880, 0.4);
      } catch { /* Audio not available */ }
    }
    if (timerSeconds !== null && timerSeconds > 10) {
      hasPlayedAlert.current = false;
    }
  }, [timerSeconds]);

  // Find "your" champion for matchup analysis
  const yourAlly = useMemo(() => allies.find(a => a.isYou), [allies]);
  const yourChamp = yourAlly?.champ && yourAlly.champ !== "???" ? yourAlly.champ : "Tristana";
  const yourRole = yourAlly?.role || "ADC";

  // Opponent scanner — WR against each revealed enemy champ from match history
  const { data: matchHistory } = useAsyncData(() => import("../services/dataService").then(m => m.getMatchHistory()), []);
  const opponentInsights = useMemo(() => {
    if (!matchHistory || matchHistory.length === 0) return [];
    return enemies
      .filter(e => !e.hidden && e.champ && e.champ !== t("champselect.unknown") && e.champ !== "???")
      .map(e => {
        const vsGames = matchHistory.filter(m => {
          const me = m.participants[m.playerParticipantIndex];
          if (!me) return false;
          return m.participants.some((p, i) => i !== m.playerParticipantIndex && p.teamId !== me.teamId && p.championName === e.champ);
        });
        if (vsGames.length === 0) return null;
        const wins = vsGames.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
        const wr = Math.round((wins / vsGames.length) * 100);
        return { champ: e.champ, role: e.role, games: vsGames.length, wr };
      })
      .filter(Boolean) as { champ: string; role: string; games: number; wr: number }[];
  }, [enemies, matchHistory, t]);

  // Tilt pick warning — warn if player's recent WR with selected champ is <45% over ≥5 games
  const tiltPickWarning = useMemo(() => {
    if (!matchHistory || matchHistory.length === 0) return null;
    if (!yourChamp || yourChamp === "???" || yourChamp === "Tristana") return null;
    const champGames = matchHistory
      .filter(m => m.participants[m.playerParticipantIndex]?.championName === yourChamp)
      .sort((a, b) => b.gameCreation - a.gameCreation)
      .slice(0, 10);
    if (champGames.length < 5) return null;
    const wins = champGames.filter(m => m.participants[m.playerParticipantIndex]?.win).length;
    const wr = Math.round((wins / champGames.length) * 100);
    if (wr >= 45) return null;
    return { champ: yourChamp, wr, games: champGames.length };
  }, [yourChamp, matchHistory]);

  // Dynamic draft guide
  const draftGuide = useMemo(() => generateDraftGuide(
    allies.map(a => ({ role: a.role, champ: a.champ })),
    enemies.map(e => ({ role: e.role, champ: e.champ, hidden: e.hidden }))
  ), [allies, enemies]);

  // Recommendations for your role based on enemy matchup
  const enemyInYourRole = useMemo(() => {
    const e = enemies.find(e => e.role === yourRole);
    return e && !e.hidden ? e.champ : undefined;
  }, [enemies, yourRole]);

  const recommendations = useMemo(() => getRecommendationsForRole(yourRole, enemyInYourRole), [yourRole, enemyInYourRole]);

  // ── Pick & Ban Logic ──────────────────────────────────────────────────────

  const myActiveAction: ChampSelectAction | null | undefined = liveSession?.myActiveAction;
  const isBanPhase = myActiveAction?.type === "ban";
  const isPickPhase = myActiveAction?.type === "pick";
  const isMyTurn = !!myActiveAction;

  const allBannedNames = useMemo(() => {
    const all = [...(bans.allyBans || []), ...(bans.enemyBans || [])];
    return all.filter(Boolean);
  }, [bans]);

  const allPickedNames = useMemo(() => {
    const picked: string[] = [];
    for (const a of allies) {
      if (a.champ && a.champ !== "???") picked.push(a.champ);
    }
    for (const e of enemies) {
      if (!e.hidden && e.champ && e.champ !== "???") picked.push(e.champ);
    }
    return picked;
  }, [allies, enemies]);

  const banSuggestions = useMemo(
    () => getBanSuggestions(yourRole, allBannedNames),
    [yourRole, allBannedNames]
  );

  // Auto-focus Velaris when it's user's turn
  useEffect(() => {
    if (isMyTurn && myActiveAction && myActiveAction.id !== lastFocusedActionRef.current) {
      lastFocusedActionRef.current = myActiveAction.id;
      focusVelarisWindow();
    }
  }, [isMyTurn, myActiveAction]);

  // Fetch personal best build — updates when hovering during pick or when your champ changes
  const buildTarget = (isPickPhase && hoveredChamp) ? hoveredChamp : yourChamp;
  useEffect(() => {
    if (!buildTarget || buildTarget === "???") return;
    let cancelled = false;
    getPersonalBestBuild(buildTarget).then(build => {
      if (!cancelled) { setPersonalBuild(build); setBuildForChamp(buildTarget); }
    }).catch(() => { if (!cancelled) setPersonalBuild(null); });
    return () => { cancelled = true; };
  }, [buildTarget, isPickPhase]);

  // Fetch live build data (lolalytics → static fallback) with item icons
  useEffect(() => {
    if (!buildTarget || buildTarget === "???" || buildTarget === "Unknown") return;
    let cancelled = false;
    getBuildRec(buildTarget, yourRole).then(async rec => {
      if (cancelled || !rec) return;
      if (patchVersion) {
        const itemMap = await getItemIdMap(patchVersion);
        const enriched = enrichItemIds(rec, itemMap);
        if (!cancelled) { setLiveBuild(enriched); setLiveBuildChamp(buildTarget); }
      } else {
        if (!cancelled) { setLiveBuild(rec); setLiveBuildChamp(buildTarget); }
      }
    }).catch(() => { if (!cancelled) setLiveBuild(null); });
    return () => { cancelled = true; };
  }, [buildTarget, yourRole, patchVersion]);

  // ─── Auto-import runes when champion is locked ────────────────────────────
  useEffect(() => {
    if (!liveSession) {
      autoImportedForRef.current = "";
      setAutoImportState("idle");
      return;
    }
    // yourAlly.champ is the locked/hovered champ — only import when it's a real pick (not mock)
    const realChamp = yourAlly?.champ;
    if (!realChamp || realChamp === "???" || realChamp === "Unknown") return;
    if (!liveBuild?.keystoneRune) return;
    // Only import when the loaded build matches the locked champion (avoid importing stale build)
    if (liveBuildChamp !== realChamp) return;
    // Don't import again for the same champion this session
    if (autoImportedForRef.current === realChamp) return;
    autoImportedForRef.current = realChamp;
    setAutoImportState("importing");
    importRunePage(liveBuild, `Velaris — ${realChamp}`)
      .then(() => {
        setAutoImportState("done");
        toast.success(t("cs.runesImported").replace("{champ}", realChamp), { duration: 3000 });
      })
      .catch(() => {
        setAutoImportState("error");
        autoImportedForRef.current = ""; // allow retry
        toast.error(t("cs.runesImportError"), { duration: 4000 });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yourAlly?.champ, liveBuild, liveSession]);

  // ─── Save pregame snapshot for loading screen overlay ────────────────────
  useEffect(() => {
    if (!liveSession || allies.length === 0) return;
    // Build rich player data from live session
    let snapshotAllyIndex = 0;
    const buildPlayer = (p: typeof liveSession.myTeam[0], isAlly: boolean) => ({
      role: positionToRole(p.assignedPosition),
      champ: p.championName || "???",
      // Riot policy: anonymize non-local ally names in champion select
      player: isAlly && !p.isLocalPlayer ? `Ally #${++snapshotAllyIndex}` : (p.summonerName || ""),
      isYou: p.isLocalPlayer,
      spell1Id: p.spell1Id || 0,
      spell2Id: p.spell2Id || 0,
      hidden: !isAlly && (!p.championId || p.championId === 0),
    });
    const snapshot = {
      allies: liveSession.myTeam.map(p => buildPlayer(p, true)),
      enemies: liveSession.theirTeam.map(p => buildPlayer(p, false)),
      myChamp: yourChamp,
      myRole: yourRole,
      savedAt: Date.now(),
    };
    try { localStorage.setItem("velaris-pregame-snapshot", JSON.stringify(snapshot)); } catch {}
  }, [sessionFingerprint]);

  const handleChampAction = useCallback(async (champName: string, lock: boolean = true) => {
    if (!myActiveAction) {
      toast.error(t("cs.notYourTurn"));
      return;
    }
    setActionInProgress(champName);
    try {
      const result = await executeChampSelectAction(myActiveAction.id, champName, lock, myActiveAction.type);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      toast.error(`Error: ${e}`);
    } finally {
      setActionInProgress(null);
    }
  }, [myActiveAction]);

  const handleHover = useCallback(async (champName: string) => {
    if (!myActiveAction) return;
    setHoveredChamp(champName);
    try {
      await executeChampSelectAction(myActiveAction.id, champName, false);
    } catch (e) {
      // Hover preview failures are intentionally silent to avoid toast spam.
      // Logged for debugging purposes only.
      console.warn("[ChampSelect] Hover preview failed:", e);
    }
  }, [myActiveAction]);

  // ─── Waiting State: No active champ select session ───────────────────────────
  if (!liveSession) {
    const isConnected = clientState !== 'DISCONNECTED' && clientState !== 'CONNECTING';
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full flex flex-col font-sans pb-20"
      >
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-3">
            {t("champ.draftAnalysis")}
            <span className="px-2.5 py-1 rounded-full bg-secondary/80 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">{t("champ.inactive")}</span>
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1 flex items-center gap-2">
            <span className="bg-secondary px-2 py-0.5 rounded text-[11px] font-mono text-foreground">
              {patchLoading ? t("common.loading") : `${t("common.patch")} ${patchVersion}`}
            </span>
            {t("champ.activateAuto")}
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center min-h-[500px]">
          <div className="flex flex-col items-center gap-6 max-w-md text-center">
            {/* Animated icon with rings */}
            <div className="relative flex items-center justify-center">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border border-primary/12"
                  style={{ width: 80 + i * 36, height: 80 + i * 36 }}
                  animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.05, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, delay: i * 0.7, ease: "easeInOut" }}
                />
              ))}
              <div className="relative w-20 h-20 rounded-2xl bg-secondary/50 border border-border/60 flex items-center justify-center shadow-lg">
                <Swords className="w-9 h-9 text-muted-foreground/40" />
                {["-top-1 -left-1", "-top-1 -right-1", "-bottom-1 -left-1", "-bottom-1 -right-1"].map((pos, i) => (
                  <motion.div
                    key={i}
                    className={cn("absolute w-1.5 h-1.5 rounded-full bg-primary/35", pos)}
                    animate={{ opacity: [0.2, 0.9, 0.2] }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-[18px] font-semibold text-foreground">
                {t("champ.waitingSelect")}
              </h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {t("champ.waitingSelectDesc")}
              </p>
            </div>

            {/* Scanning bar */}
            <div className="flex flex-col items-center gap-2 w-52">
              <div className="w-full h-[2px] rounded-full bg-border/40 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary/50"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ width: "40%" }}
                />
              </div>
            </div>

            <div className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-[12px] font-medium",
              isConnected
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600"
                : "bg-amber-500/5 border-amber-500/20 text-amber-600"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"
              )} />
              {isConnected
                ? t("champ.connectedListening")
                : t("champ.waitingClient")
              }
            </div>

            <div className="grid grid-cols-3 gap-3 w-full mt-4">
              {[
                { icon: Users, label: t("champ.teamAnalysis"), desc: t("champ.teamAnalysisDesc") },
                { icon: Shield, label: t("champ.reactiveMatchups"), desc: t("champ.reactiveMatchupsDesc") },
                { icon: Lightbulb, label: t("champ.recommendations"), desc: t("champ.recommendationsDesc") },
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.2, ease: "easeOut" }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/40"
                >
                  <feature.icon className="w-5 h-5 text-primary/60" />
                  <span className="text-[11px] font-semibold text-foreground">{feature.label}</span>
                  <span className="text-[10px] text-muted-foreground">{feature.desc}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 mt-2">
              <Monitor className="w-3 h-3" />
              {t("champ.detectionInfo")}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (phase === "loading") {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full flex flex-col font-sans pb-20 h-full"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-3">
              {t("champ.matchLoading")}
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider animate-pulse">{t("champ.analyzing")}</span>
            </h1>
            <p className="text-[14px] text-muted-foreground mt-1 flex items-center gap-2">
              <span className="bg-secondary px-2 py-0.5 rounded text-[11px] font-mono text-foreground">
                {patchLoading ? t("common.loading") : `${t("common.patch")} ${patchVersion}`}
              </span>
              {t("champ.evaluating")}
            </p>
          </div>
          <button
            onClick={() => setPhase("draft")}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-[13px] font-medium hover:bg-secondary/80 transition-colors"
          >
            {t("champ.backToDraft")}
          </button>
        </div>

        {/* Pre-game briefing — shows when your champion is known */}
        <PreGameBriefing
          champName={yourChamp}
          role={yourRole}
          enemyChamp={enemyInYourRole}
          matches={matchHistory ?? []}
        />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-[420px]">
          {allies.map((ally, idx) => (
            <AllyLoadingCard
              key={idx}
              ally={ally}
              isSelected={ally.role === selectedRole}
              idx={idx}
              onSelect={() => setSelectedRole(ally.role)}
              youLabel={t("cs.you")}
              strongPointLabel={t("cs.strongPoint")}
              winrateLabel={t("cs.winrate")}
              gamesLabel={t("cs.games")}
            />
          ))}
        </div>

        {/* Tactical Analysis Section for the Selected Champion */}
        {(() => {
          const selectedAlly = allies.find(a => a.role === selectedRole) || allies[3];
          const selectedEnemy = enemies.find(e => e.role === selectedRole);
          const enemyName = selectedEnemy?.displayChamp || selectedEnemy?.champ || t("champselect.unknown");
          const matchupTip = getMatchupTip(selectedAlly.champ, enemyName);
          const threat = getThreatLevel(selectedAlly.champ, enemyName);
          const allyPowerCurve = getChampionPowerCurve(selectedAlly.champ);
          const enemyPowerCurve = !selectedEnemy?.hidden ? getChampionPowerCurve(enemyName) : null;

          return (
            <AnimatePresence mode="wait">
              <motion.div 
                key={selectedRole}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                  "mt-6 border rounded-2xl p-5 flex flex-col gap-5 relative overflow-hidden transition-all duration-500",
                  selectedAlly.isYou 
                    ? "bg-card border-primary/40 shadow-[0_0_40px_rgba(var(--primary),0.08)]" 
                    : "bg-card/50 border-border/60 shadow-lg shadow-black/5"
                )}
              >
              {selectedAlly.isYou && (
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              )}
              
              <div className="flex items-center gap-3">
                <Lightbulb className={cn("w-5 h-5", selectedAlly.isYou ? "text-primary" : "text-muted-foreground")} />
                <h3 className="text-[16px] font-semibold text-foreground">
                  {t("cs.gamePlan", { ally: selectedAlly.displayChamp || selectedAlly.champ, enemy: enemyName })}
                  <span className="text-muted-foreground text-[14px] font-normal ml-2">({selectedEnemy?.rank})</span>
                  {selectedAlly.isYou && <span className="ml-3 text-[11px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">{t("cs.yourMatchup")}</span>}
                  {threat === "high" && <span className="ml-2 text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">{t("cs.difficult")}</span>}
                  {threat === "low" && <span className="ml-2 text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">{t("cs.favorable")}</span>}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                <div className="flex flex-col gap-3">
                  <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{t("cs.skillPriority")}</span>
                  <div className="flex items-center gap-2">
                    {selectedAlly.analysis?.skills.map((skill, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded border flex items-center justify-center font-mono font-bold text-[14px] shadow-sm transition-colors",
                          selectedAlly.isYou ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary border-border/60 text-foreground"
                        )}>
                          {skill}
                        </div>
                        {i < 2 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 text-[13px] text-muted-foreground flex items-center gap-2">
                    <span className="font-medium text-foreground">{t("cs.maximize")}</span> 
                    <span className={cn(
                      "font-mono px-2 py-0.5 rounded font-medium",
                      selectedAlly.isYou ? "bg-primary/10 text-primary" : "bg-secondary/50 text-foreground"
                    )}>
                      {selectedAlly.analysis?.maxOrder}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{t("cs.quickAnalysis")}</span>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      {selectedAlly.analysis?.strengths.map((str, i) => (
                        <div key={`s-${i}`} className="flex items-start gap-2 text-[13px] text-foreground">
                          <ArrowUpRight className="w-4 h-4 text-green-500 shrink-0" />
                          <span>{str}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      {selectedAlly.analysis?.weaknesses.map((wk, i) => (
                        <div key={`w-${i}`} className="flex items-start gap-2 text-[13px] text-foreground">
                          <ArrowDownRight className="w-4 h-4 text-red-500 shrink-0" />
                          <span>{wk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{t("champselect.tacticalTip")} {enemyName !== t("champselect.unknown") && <span className="text-primary/60 normal-case font-normal ml-1">vs {enemyName}</span>}</span>
                  <p className="text-[13px] text-muted-foreground leading-relaxed bg-secondary/30 p-3 rounded-xl border border-border/40">
                    {matchupTip || selectedAlly.analysis?.tip}
                  </p>
                  <div className="mt-auto flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                    <Shield className="w-3 h-3" />
                    {t("cs.riotCompliant")}
                  </div>
                </div>
              </div>

              {/* Power Spike Timeline — Loading Phase */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border/30 relative z-10">
                <div className="flex items-center gap-2">
                  <TrendingUp className={cn("w-4 h-4", selectedAlly.isYou ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Power Curve — {selectedAlly.displayChamp || selectedAlly.champ}</span>
                  {enemyPowerCurve && <span className="text-[10px] text-red-400/60 ml-1">vs {enemyName}</span>}
                </div>
                <div className="flex items-center gap-6">
                  {/* Power bars */}
                  <div className="flex items-end gap-1 h-12 flex-1">
                    {(["early", "mid", "late"] as const).map((phase) => {
                      const allyVal = allyPowerCurve[phase];
                      const enemyVal = enemyPowerCurve?.[phase];
                      const phaseLabel = phase === "early" ? "Early" : phase === "mid" ? "Mid" : "Late";
                      const isStronger = enemyVal ? allyVal > enemyVal : false;
                      const isWeaker = enemyVal ? allyVal < enemyVal : false;
                      return (
                        <div key={phase} className="flex-1 flex flex-col items-center gap-1">
                          <div className="flex items-end gap-1 w-full justify-center h-9">
                            <div
                              className={cn(
                                "w-5 rounded-t-sm transition-all",
                                isStronger ? "bg-green-500/70" : isWeaker ? "bg-red-400/50" : selectedAlly.isYou ? "bg-primary/50" : "bg-foreground/20"
                              )}
                              style={{ height: `${(allyVal / 100) * 36}px` }}
                            />
                            {enemyVal !== undefined && enemyVal !== null && (
                              <div
                                className="w-5 rounded-t-sm bg-red-500/20 border border-red-500/15"
                                style={{ height: `${(enemyVal / 100) * 36}px` }}
                              />
                            )}
                          </div>
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider",
                            isStronger ? "text-green-500" : isWeaker ? "text-red-400/70" : "text-muted-foreground/50"
                          )}>
                            {phaseLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Spike markers */}
                  <div className="flex flex-wrap gap-1.5 flex-[2]">
                    {allyPowerCurve.spikes.map((spike, i) => (
                      <div
                        key={i}
                        className={cn(
                          "group/spike relative flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border cursor-help",
                          spike.phase === "early" ? "bg-amber-500/8 border-amber-500/20 text-amber-500/80"
                          : spike.phase === "late" ? "bg-blue-500/8 border-blue-500/20 text-blue-500/80"
                          : selectedAlly.isYou ? "bg-primary/8 border-primary/20 text-primary/80" : "bg-secondary/50 border-border/40 text-foreground/60"
                        )}
                      >
                        <Flame className="w-3 h-3" />
                        <span>Lv{spike.level} · {spike.label}</span>
                        <div className="absolute bottom-full left-0 mb-1.5 w-52 p-2 bg-card border border-border/60 rounded-lg shadow-xl text-[10px] text-foreground/80 leading-relaxed opacity-0 group-hover/spike:opacity-100 transition-opacity pointer-events-none z-50">
                          <span className="font-bold text-foreground block mb-0.5">{spike.label}</span>
                          {spike.description}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Legend */}
                  {enemyPowerCurve && (
                    <div className="flex flex-col gap-1 text-[9px] text-muted-foreground/50 shrink-0">
                      <span className="flex items-center gap-1"><span className={cn("w-2.5 h-2.5 rounded-sm", selectedAlly.isYou ? "bg-primary/50" : "bg-foreground/20")} /> {selectedAlly.displayChamp || selectedAlly.champ}</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/20 border border-red-500/15" /> {enemyName}</span>
                    </div>
                  )}
                </div>
              </div>
              </motion.div>
            </AnimatePresence>
          );
        })()}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full flex flex-col font-sans pb-20"
    >
      {/* Waiting banner — shown when not in champ select */}
      {!liveSession && (
        <div className="mb-5 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <p className="text-[13px] text-amber-500/80 font-medium">
            {t("cs.waitingForSession") || "Esperando fase de selección de campeones — los datos mostrados son de ejemplo"}
          </p>
        </div>
      )}


      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-3">
            {t("champ.draftAnalysis")}
            <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider", liveSession ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>{liveSession ? t("champ.live") : (t("cs.preview") || "PREVIEW")}</span>
            {isMyTurn && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider animate-pulse",
                  isBanPhase 
                    ? "bg-red-500/15 text-red-400 border border-red-500/30" 
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                )}
              >
                {isBanPhase ? (t("cs.yourBan") || "TU BAN") : (t("cs.yourPick") || "TU PICK")}
              </motion.span>
            )}
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1 flex items-center gap-2">
            <span className="bg-secondary px-2 py-0.5 rounded text-[11px] font-mono text-foreground">
              {patchLoading ? t("common.loading") : `${t("common.patch")} ${patchVersion}`}
            </span>
            <Activity className="w-4 h-4 text-green-500 ml-1" />
            {t("champ.analyzingComp")}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowDraftGuide(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[13px] font-medium shadow-sm hover:opacity-90 transition-opacity cursor-pointer">
            <HelpCircle className="w-4 h-4" /> {t("champ.draftGuide")}
          </button>
        </div>
      </div>

      {/* ═══ BAN STRIP + SUGGESTIONS ═══ */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center gap-6 px-2">
          {/* Ally bans */}
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-muted-foreground/50" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">{t("cs.yourBans") || "TU EQUIPO"}</span>
            {Array.from({ length: 5 }).map((_, i) => {
              const champ = bans.allyBans[i];
              return (
                <div key={`ab-${i}`} className="relative group">
                  {champ ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-border/40 opacity-40 grayscale relative">
                      <img src={getChampIcon(champ, patchVersion)} alt={champ} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <X className="w-4 h-4 text-red-500/80" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg border border-dashed border-border/30 bg-secondary/20 flex items-center justify-center">
                      <Ban className="w-3 h-3 text-muted-foreground/20" />
                    </div>
                  )}
                  {champ && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {champ}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="h-6 w-px bg-border/40" />
          {/* Enemy bans */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-red-400/60 uppercase tracking-wider mr-1">{t("cs.enemyBans") || "ENEMIGO"}</span>
            {Array.from({ length: 5 }).map((_, i) => {
              const champ = bans.enemyBans[i];
              return (
                <div key={`eb-${i}`} className="relative group">
                  {champ ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-red-500/20 opacity-40 grayscale relative">
                      <img src={getChampIcon(champ, patchVersion)} alt={champ} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <X className="w-4 h-4 text-red-500/80" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg border border-dashed border-red-500/10 bg-red-500/5 flex items-center justify-center">
                      <Ban className="w-3 h-3 text-red-500/15" />
                    </div>
                  )}
                  {champ && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {champ}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ BAN SUGGESTIONS (Blitz-style) ═══ */}
        <AnimatePresence>
          {(isBanPhase || showBanSuggestions) && banSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className={cn(
                "border rounded-xl p-3 flex flex-col gap-2.5",
                isBanPhase 
                  ? "bg-red-500/5 border-red-500/20 shadow-sm shadow-red-500/5" 
                  : "bg-card border-border/40"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className={cn("w-4 h-4", isBanPhase ? "text-red-400" : "text-muted-foreground")} />
                    <span className={cn("text-[12px] font-bold uppercase tracking-wider", isBanPhase ? "text-red-400" : "text-foreground")}>
                      {isBanPhase ? `${t("cs.recommendedBan")} — ${yourRole}` : `${t("cs.suggestedBans")} ${yourRole}`}
                    </span>
                    {isBanPhase && (
                      <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-medium animate-pulse">
                        {t("cs.clickToBan")}
                      </span>
                    )}
                  </div>
                  {!isBanPhase && (
                    <button onClick={() => setShowBanSuggestions(false)} className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer">
                      {t("cs.hide")}
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {banSuggestions.slice(0, 6).map((sug, i) => {
                    const isActing = actionInProgress === sug.champion;
                    return (
                      <motion.button
                        key={sug.champion}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03, duration: 0.15, ease: "easeOut" }}
                        onClick={() => isBanPhase && handleChampAction(sug.champion)}
                        onMouseEnter={() => setHoveredChamp(sug.champion)}
                        disabled={isActing || !isBanPhase}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all shrink-0",
                          isBanPhase 
                            ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-red-500/40 hover:bg-red-500/10 active:scale-95" 
                            : "cursor-default",
                          i === 0 && isBanPhase
                            ? "bg-red-500/10 border-red-500/30 ring-1 ring-red-500/20" 
                            : "bg-secondary/30 border-border/40",
                          isActing && "opacity-50 pointer-events-none"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-border/40">
                          <img src={getChampIcon(sug.champion, patchVersion)} alt={sug.champion} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-semibold text-foreground">{sug.champion}</span>
                            {i === 0 && isBanPhase && <Crosshair className="w-3 h-3 text-red-400" />}
                            {isActing && <Loader2 className="w-3 h-3 text-red-400 animate-spin" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{sug.reason}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn("text-[10px] font-mono font-bold", sug.winrate >= 51 ? "text-green-500" : "text-amber-500")}>{sug.winrate}% WR</span>
                            <span className="text-[10px] font-mono text-red-400/80">{sug.banrate}% Ban</span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Action Banner ── */}
      <AnimatePresence>
        {isMyTurn && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "mb-4 px-5 py-3.5 rounded-xl border flex items-center gap-3 font-bold text-[13px]",
              isBanPhase
                ? "bg-red-500/12 border-red-500/35 text-red-300 shadow-lg shadow-red-500/10"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-500/10"
            )}
          >
            <motion.div
              className={cn("w-2 h-2 rounded-full shrink-0", isBanPhase ? "bg-red-400" : "bg-emerald-400")}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 shrink-0">
              {isBanPhase ? "BAN" : "PICK"}
            </span>
            <span className="text-[12px] font-semibold opacity-80">
              {isBanPhase
                ? "Selecciona un campeón para banear"
                : "Selecciona un campeón para lockear"
              }
            </span>
            {timerSeconds !== null && (
              <span className={cn(
                "ml-auto text-[14px] font-mono font-black tabular-nums shrink-0",
                timerSeconds <= 5 ? "animate-pulse" : ""
              )}>
                {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, "0")}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        {/* Left Column: Ally Team */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("champ.yourTeam")}</div>
          {allies.map((ally, idx) => {
            const titleResult = playerTitles?.[idx];
            return (
            <div key={idx} className={cn(
              "rounded-xl border overflow-hidden transition-all duration-300",
              ally.isYou ? "border-primary/50 shadow-lg shadow-primary/10" : "border-border/40"
            )}>
              {/* ─ Splash art card ─ */}
              <div className="relative h-[86px]">
                {ally.champ && ally.champ !== "???" && ally.champ !== t("champselect.picking") && ally.champ !== t("champselect.yourPick") && ally.champ !== t("champselect.waitingSelection") && (
                  <img
                    src={getChampLoading(ally.champ)}
                    alt={ally.champ}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    style={{ opacity: ally.isYou ? 0.55 : 0.32, filter: "saturate(0.8)" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                  />
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.1) 100%)" }} />
                <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", ally.isYou ? "bg-primary" : "bg-blue-500/25")} />
                <div className="relative h-full px-3 py-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.38)" }}>{ally.role}</span>
                    <div className="flex items-center gap-1">
                      {titleResult && !ally.isYou && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedTitle(expandedTitle === `ally-${idx}` ? null : `ally-${idx}`); }}
                          className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity", titleResult.bgColor, titleResult.color)}
                          title={titleResult.reason}
                        >
                          {titleResult.title} ({titleResult.confidence}%)
                        </button>
                      )}
                      {ally.isYou && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ color: "rgb(94,92,230)", background: "rgba(94,92,230,0.15)" }}>{t("cs.you")}</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-white leading-tight truncate">{ally.displayChamp || ally.champ}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] truncate" style={{ color: ally.isYou ? "rgba(160,155,255,0.8)" : "rgba(255,255,255,0.42)" }}>{ally.player}</span>
                      {ally.winrate && ally.winrate !== "--%"  && (
                        <span className={cn("text-[9px] font-mono font-bold shrink-0", parseInt(ally.winrate) >= 50 ? "text-emerald-400" : "text-red-400")}>{ally.winrate}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ─ Expandable scouting ─ */}
              {expandedTitle === `ally-${idx}` && titleResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="border-t border-border/30"
                >
                  <div className="flex flex-col gap-2 p-3">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{titleResult.reason}</p>
                    <div className="bg-secondary/30 rounded-lg p-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 block mb-1">{t("cs.strategicNote")}</span>
                      <p className="text-[11px] text-foreground/80 leading-relaxed">{titleResult.gameplay_impact}</p>
                    </div>
                    {titleResult.signals.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">{t("cs.scoutingData")}</span>
                        {titleResult.signals.map((signal, si) => (
                          <div key={si} className="flex items-start gap-1.5 text-[10px]">
                            <span className={cn("shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full", signal.trend === "above" ? "bg-violet-400" : signal.trend === "below" ? "bg-amber-400" : "bg-emerald-400")} />
                            <span className="text-muted-foreground">
                              <span className="font-medium text-foreground">{signal.metric}:</span> {signal.value}
                              <span className="text-muted-foreground/50"> ({t("cs.benchmark")}: {signal.benchmark})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
            );
            })}
          {/* Team Comp Analyzer */}
          {(() => {
            const picked = allies.map(a => a.champ).filter(c => c && c !== "???" && c !== t("champselect.picking") && c !== t("champselect.yourPick") && c !== t("champselect.waitingSelection"));
            if (picked.length === 0) return null;
            const comp = analyzeTeamComp(picked);
            const items: { key: keyof CompScore; label: string }[] = [
              { key: "ad", label: t("comp.ad") },
              { key: "ap", label: t("comp.ap") },
              { key: "tank", label: t("comp.tank") },
              { key: "cc", label: t("comp.cc") },
              { key: "peel", label: t("comp.peel") },
            ];
            const warnings: string[] = [];
            if (!comp.tank) warnings.push(t("comp.noFrontline"));
            if (!comp.cc) warnings.push(t("comp.noCC"));
            if (!comp.ad) warnings.push(t("comp.noAD"));
            if (!comp.ap) warnings.push(t("comp.noAP"));

            return (
              <div className="mt-1 p-3 rounded-xl border border-border/40 bg-card/60 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("comp.title")}</span>
                <div className="flex gap-1.5 flex-wrap">
                  {items.map(({ key, label }) => (
                    <span key={key} className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold border",
                      comp[key]
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20 opacity-60"
                    )}>
                      {label}
                    </span>
                  ))}
                </div>
                {warnings.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {warnings.map(w => (
                      <span key={w} className="text-[10px] text-amber-500/70 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />{w}
                      </span>
                    ))}
                  </div>
                )}
                {warnings.length === 0 && (
                  <span className="text-[10px] text-emerald-500/70">{t("comp.balanced")}</span>
                )}
              </div>
            );
          })()}
        </div>

        {/* Middle Column: Champion Grid + Recommendations */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{t("champ.selectChamp")}</div>
              <button 
                onClick={() => setShowRecommendations(!showRecommendations)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer",
                  showRecommendations ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary/50 text-muted-foreground border border-border/40 hover:bg-secondary"
                )}
              >
                <Crown className="w-3.5 h-3.5" />
                {showRecommendations ? (t("cs.hideSuggestions") || "Ocultar sugerencias") : (t("cs.bestPicks") || "Mejores picks")}
              </button>
            </div>
            <div className={cn(
              "flex items-center gap-2 text-[12px] font-mono text-muted-foreground px-3 py-1.5 rounded-lg border transition-all",
              timerSeconds !== null && timerSeconds <= 10 
                ? "bg-red-500/10 border-red-500/30 text-red-400" 
                : timerSeconds !== null && timerSeconds <= 15
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-secondary/50 border-border/40"
            )}>
              {phaseLabel && (
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                  timerSeconds !== null && timerSeconds <= 10 
                    ? "bg-red-500/20 text-red-400" 
                    : "bg-secondary text-muted-foreground"
                )}>
                  {phaseLabel}
                </span>
              )}
              {!phaseLabel && <span className="text-muted-foreground/70">{t("champ.timeRemaining")}</span>}
              <span className={cn(
                "font-bold tabular-nums",
                timerSeconds !== null && timerSeconds <= 5 ? "text-red-500 animate-pulse text-[14px]" 
                : timerSeconds !== null && timerSeconds <= 10 ? "text-red-500 animate-pulse" 
                : timerSeconds !== null && timerSeconds <= 15 ? "text-amber-500"
                : "text-primary"
              )}>
                {timerSeconds !== null 
                  ? `${Math.floor(timerSeconds / 60)}:${(timerSeconds % 60).toString().padStart(2, '0')}` 
                  : "0:30"}
              </span>
            </div>
          </div>

          {/* ═══ RECOMMENDATION PANEL ═══ */}
          <AnimatePresence>
            {showRecommendations && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="bg-card border border-primary/20 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-[12px] font-bold text-foreground uppercase tracking-wider">{t("cs.recommendedPicks") || "Picks recomendados"} {yourRole}</span>
                    {enemyInYourRole && (
                      <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-medium">vs {enemyInYourRole}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {recommendations.slice(0, 8).map((rec, i) => (
                      <div 
                        key={rec.champion}
                        onClick={() => openChampion(rec.champion)}
                        className={cn(
                          "flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all hover:-translate-y-0.5",
                          i === 0 ? "bg-primary/5 border-primary/30" : "bg-secondary/30 border-border/40 hover:bg-secondary/50"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-border/40">
                          <img src={getChampIcon(rec.champion, patchVersion)} alt={rec.champion} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col overflow-hidden min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-semibold text-foreground truncate">{rec.champion}</span>
                            {i === 0 && <Star className="w-3 h-3 text-primary shrink-0 fill-primary" />}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={cn("text-[11px] font-mono font-bold", rec.winrate >= 52 ? "text-emerald-500" : rec.winrate >= 50 ? "text-green-500" : "text-amber-500")}>{rec.winrate.toFixed(1)}%</span>
                            <span className={cn("text-[9px] px-1 py-0.5 rounded font-medium", difficultyColor(rec.difficulty))}>{rec.difficulty === "easy" ? "Fácil" : rec.difficulty === "hard" ? "Difícil" : "Media"}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground truncate">{rec.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={cn("bg-card border border-border/60 rounded-2xl p-4 shadow-sm flex flex-col gap-4", showRecommendations ? "h-[420px]" : "h-[600px]")}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder={t("cs.searchChamps")} 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-secondary/50 border border-border/50 rounded-xl text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {filteredChamps.map((champ) => {
                  const isBannedChamp = allBannedNames.includes(champ);
                  const isPickedChamp = allPickedNames.includes(champ);
                  const isUnavailable = isBannedChamp || isPickedChamp;
                  const isActing = actionInProgress === champ;
                  const isHoveredChamp = hoveredChamp === champ;
                  return (
                    <div 
                      key={champ} 
                      className={cn(
                        "group flex flex-col items-center gap-1 relative",
                        isUnavailable ? "opacity-25 pointer-events-none" : "cursor-pointer"
                      )}
                      onClick={() => {
                        if (isUnavailable) return;
                        if (isMyTurn) {
                          handleChampAction(champ);
                        } else {
                          openChampion(champ);
                        }
                      }}
                      onMouseEnter={() => {
                        if (!isUnavailable) setHoveredChamp(champ);
                      }}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl overflow-hidden border-2 transition-all duration-200 bg-secondary relative",
                        isUnavailable 
                          ? "border-transparent" 
                          : isMyTurn
                            ? isBanPhase 
                              ? "border-transparent group-hover:border-red-500 opacity-90 group-hover:opacity-100 group-hover:-translate-y-1" 
                              : "border-transparent group-hover:border-emerald-500 opacity-90 group-hover:opacity-100 group-hover:-translate-y-1"
                            : "border-transparent group-hover:border-primary opacity-90 group-hover:opacity-100 group-hover:-translate-y-1",
                        isHoveredChamp && isMyTurn && (isBanPhase ? "border-red-500/60 ring-2 ring-red-500/20" : "border-emerald-500/60 ring-2 ring-emerald-500/20")
                      )}>
                        <img 
                          src={getChampIcon(champ, patchVersion)} 
                          alt={champ} 
                          className={cn("w-full h-full object-cover scale-[1.05]", isUnavailable && "grayscale")} 
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1561566424-47f3f6f5fdef?w=100&q=80";
                          }}
                        />
                        {isBannedChamp && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <X className="w-5 h-5 text-red-500" />
                          </div>
                        )}
                        {isPickedChamp && !isBannedChamp && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Lock className="w-4 h-4 text-foreground/60" />
                          </div>
                        )}
                        {/* Pick/Ban overlay on hover */}
                        {isMyTurn && !isUnavailable && (
                          <div className={cn(
                            "absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                            isBanPhase ? "bg-red-500/30" : "bg-emerald-500/20"
                          )}>
                            {isActing ? (
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            ) : isBanPhase ? (
                              <Ban className="w-5 h-5 text-white drop-shadow-lg" />
                            ) : (
                              <MousePointerClick className="w-5 h-5 text-white drop-shadow-lg" />
                            )}
                          </div>
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium truncate w-full text-center",
                        isUnavailable 
                          ? "text-muted-foreground/50 line-through" 
                          : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {champ}
                      </span>
                    </div>
                  );
                })}
                {filteredChamps.length === 0 && (
                  <div className="col-span-full py-10 text-center text-[13px] text-muted-foreground">
                    {t("cs.noChamps")}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-2 pt-4 border-t border-border/60 flex flex-col gap-2">
              {/* Action mode indicator */}
              {isMyTurn && (
                <div className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold",
                  isBanPhase 
                    ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                )}>
                  {isBanPhase ? (
                    <><Ban className="w-4 h-4" /> {t("cs.selectToBan") || "Selecciona un campeón para BANEAR"}</>
                  ) : (
                    <><Crosshair className="w-4 h-4" /> {t("cs.selectToPick") || "Selecciona un campeón para PICKEAR"}</>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Enemy Team */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 text-right">{t("cs.enemyTeam")}</div>
          {enemies.map((enemy, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <div className={cn(
                "relative rounded-xl overflow-hidden border transition-all duration-300 h-[86px]",
                enemy.hidden ? "border-border/30 opacity-50" : "border-red-500/20"
              )}>
                {!enemy.hidden && (
                  <img
                    src={getChampLoading(enemy.champ)}
                    alt={enemy.champ}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    style={{ opacity: 0.32, filter: "saturate(0.75)" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                  />
                )}
                <div className="absolute inset-0" style={{
                  background: enemy.hidden
                    ? "rgba(0,0,0,0.35)"
                    : "linear-gradient(to left, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.1) 100%)"
                }} />
                <div className={cn("absolute right-0 top-0 bottom-0 w-[3px]", enemy.hidden ? "bg-border/20" : "bg-red-500/30")} />
                <div className="relative h-full px-3 py-2 flex flex-col items-end justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.38)" }}>{enemy.role}</span>
                  <div className="text-right">
                    <div className={cn("text-[13px] font-bold leading-tight truncate", enemy.hidden ? "text-muted-foreground/40" : "text-white")}>
                      {enemy.displayChamp || enemy.champ}
                    </div>
                    {!enemy.hidden && (
                      <span className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(239,68,68,0.5)" }}>{t("cs.locked")}</span>
                    )}
                  </div>
                </div>
              </div>

              {!enemy.hidden && enemy.counters && enemy.counters.length > 0 && (
                <div className="flex justify-end gap-1">
                  {enemy.counters.map(counter => (
                    <div key={counter} className="flex items-center gap-1 bg-secondary/60 rounded-md p-1 pr-1.5 hover:bg-secondary transition-colors cursor-help">
                      <img src={getChampIcon(counter, patchVersion)} className="w-4 h-4 rounded-sm object-cover" alt={counter} />
                      <span className="text-[9px] font-medium text-foreground/70">{counter}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RECOMMENDED BUILD ═══ */}
      {liveBuild && liveBuildChamp && liveBuildChamp !== "???" && liveBuildChamp !== "Unknown" && (
        <motion.div
          key={liveBuildChamp}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="mt-5 p-4 rounded-xl border border-border/40 bg-card/50 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground/50" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Build — {liveBuildChamp}
            </span>
            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded font-mono text-muted-foreground/50">
              {liveBuild.source === "live" ? liveBuild.patch : "static"}
            </span>
            {liveBuild.winrate > 0 && (
              <span className={cn("text-[10px] font-mono font-bold ml-1", liveBuild.winrate >= 51 ? "text-green-500" : "text-amber-500")}>
                {liveBuild.winrate}% WR
              </span>
            )}
          </div>
          <div className="flex gap-6 flex-wrap items-start">
            {/* Runes */}
            {liveBuild.keystoneRune && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider">Runas</span>
                <div className="flex items-center gap-1.5">
                  <img
                    src={getRuneIconUrl(liveBuild.keystoneRune.id)}
                    title={liveBuild.keystoneRune.name}
                    className="w-9 h-9 rounded-full border border-border/40 bg-secondary/40"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                  />
                  <div className="w-px h-5 bg-border/30" />
                  {liveBuild.primaryRunes.map(r => (
                    <img
                      key={r.id}
                      src={getRuneIconUrl(r.id)}
                      title={r.name}
                      className="w-6 h-6 rounded opacity-75"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                    />
                  ))}
                  {liveBuild.secondaryRunes.length > 0 && (
                    <>
                      <div className="w-px h-5 bg-border/30" />
                      {liveBuild.secondaryRunes.map(r => (
                        <img
                          key={r.id}
                          src={getRuneIconUrl(r.id)}
                          title={r.name}
                          className="w-6 h-6 rounded opacity-60"
                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
            {/* Items */}
            {liveBuild.coreItems.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider">Items</span>
                <div className="flex items-center gap-1.5">
                  {liveBuild.coreItems.map((item, i) => (
                    <div key={i} className="relative group/item">
                      {item.id > 0 ? (
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/item/${item.id}.png`}
                          title={item.name}
                          className="w-8 h-8 rounded border border-border/40"
                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded border border-dashed border-border/30 bg-secondary/20 flex items-center justify-center">
                          <span className="text-[9px] text-muted-foreground/40 text-center leading-tight px-0.5">{item.name.slice(0, 6)}</span>
                        </div>
                      )}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-card border border-border/60 rounded text-[10px] text-foreground whitespace-nowrap opacity-0 group-hover/item:opacity-100 pointer-events-none z-50 shadow-md">
                        {item.name}
                        {item.winrate > 0 && <span className={cn("ml-1.5 font-mono font-bold", item.winrate >= 51 ? "text-green-500" : "text-amber-500")}>{item.winrate}%</span>}
                      </div>
                    </div>
                  ))}
                  {liveBuild.boots && (
                    <div className="relative group/item">
                      {liveBuild.boots.id > 0 ? (
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/item/${liveBuild.boots.id}.png`}
                          title={liveBuild.boots.name}
                          className="w-8 h-8 rounded border border-border/40 opacity-70"
                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded border border-dashed border-border/30 bg-secondary/20 flex items-center justify-center">
                          <span className="text-[9px] text-muted-foreground/40 text-center leading-tight px-0.5">{liveBuild.boots.name.slice(0, 6)}</span>
                        </div>
                      )}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-card border border-border/60 rounded text-[10px] text-foreground whitespace-nowrap opacity-0 group-hover/item:opacity-100 pointer-events-none z-50 shadow-md">
                        {liveBuild.boots.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Skill order */}
            {liveBuild.skillMax && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider">Maximizar</span>
                <div className="flex items-center gap-1">
                  {liveBuild.skillMax.split(/\s*>\s*/).map((skill, i, arr) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className={cn(
                        "w-7 h-7 rounded font-mono font-bold text-[12px] flex items-center justify-center border",
                        i === 0 ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/40 border-border/30 text-foreground/60"
                      )}>
                        {skill.trim()}
                      </span>
                      {i < arr.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/25" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ═══ DRAFT GUIDE MODAL — Dynamic ═══ */}
      <AnimatePresence>
        {showDraftGuide && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }} 
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }} 
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" 
            onClick={() => setShowDraftGuide(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.97 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.97 }} 
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-border/40">
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2"><HelpCircle className="w-4 h-4 text-primary" /> {t("cs.draft.title")}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t("cs.draft.subtitle")}</p>
                </div>
                <button onClick={() => setShowDraftGuide(false)} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 flex flex-col gap-5 max-h-[60vh] overflow-y-auto">
                {/* Team Synergy — Dynamic */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /><span className="text-[12px] font-bold text-foreground uppercase tracking-wider">{t("cs.draft.teamSynergy")}</span></div>
                  <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-[13px] text-foreground leading-relaxed">
                    {draftGuide.synergy}
                  </div>
                </div>
                {/* Win Conditions — Dynamic */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-green-500" /><span className="text-[12px] font-bold text-foreground uppercase tracking-wider">{t("cs.draft.winConditions")}</span></div>
                  <div className="flex flex-col gap-1.5">
                    {draftGuide.winConditions.map((wc, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-foreground"><ArrowUpRight className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />{wc}</div>
                    ))}
                  </div>
                </div>
                {/* Threats — Dynamic */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /><span className="text-[12px] font-bold text-foreground uppercase tracking-wider">{t("cs.draft.threats")}</span></div>
                  <div className="flex flex-col gap-1.5">
                    {draftGuide.threats.map((th, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-foreground"><ArrowDownRight className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />{th}</div>
                    ))}
                  </div>
                </div>
                {/* Strategy — Dynamic */}
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">{t("cs.draft.recommendedStrategy")}</span>
                  <p className="text-[12px] text-foreground leading-relaxed">
                    {draftGuide.strategy}
                  </p>
                </div>
              </div>
              <div className="p-4 border-t border-border/40">
                <button onClick={() => setShowDraftGuide(false)} className="w-full py-2.5 bg-secondary border border-border/40 text-foreground rounded-xl text-[13px] font-medium hover:bg-secondary/80 transition-colors cursor-pointer">{t("cs.draft.understood")}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
