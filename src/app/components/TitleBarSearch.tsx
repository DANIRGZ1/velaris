import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { Search, User, Shield, FileText, X, StickyNote, Settings, Activity, History, ListTodo, LayoutDashboard, Users, Globe, Loader2, Package, Coins, CalendarDays, Sparkles } from "lucide-react";
import { cn } from "./ui/utils";
import { useChampionDrawer } from "../contexts/ChampionDrawerContext";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { searchSummoners, searchSummonersMock, formatRank, getRankColor, displayRegionToPlatform, type SummonerSearchResult } from "../services/riotApi";
import { getStoredIdentity } from "../services/dataService";
import { useLanguage } from "../contexts/LanguageContext";
import { ITEMS_DATABASE } from "../pages/ItemExplorer";
import { IS_TAURI } from "../helpers/tauriWindow";

// ─── Champion List (Data Dragon IDs) ─────────────────────────────────────────

const CHAMPIONS = [
  "Aatrox","Ahri","Akali","Akshan","Alistar","Amumu","Anivia","Annie","Aphelios","Ashe",
  "AurelionSol","Azir","Bard","Belveth","Blitzcrank","Brand","Braum","Briar","Caitlyn","Camille",
  "Cassiopeia","Chogath","Corki","Darius","Diana","DrMundo","Draven","Ekko","Elise","Evelynn",
  "Ezreal","Fiddlesticks","Fiora","Fizz","Galio","Gangplank","Garen","Gnar","Gragas","Graves",
  "Gwen","Hecarim","Heimerdinger","Illaoi","Irelia","Ivern","Janna","JarvanIV","Jax","Jayce",
  "Jhin","Jinx","Kaisa","Kalista","Karma","Karthus","Kassadin","Katarina","Kayle","Kayn",
  "Kennen","Khazix","Kindred","Kled","KogMaw","Leblanc","LeeSin","Leona","Lillia","Lissandra",
  "Lucian","Lulu","Lux","Malphite","Malzahar","Maokai","MasterYi","MissFortune","Mordekaiser","Morgana",
  "Nami","Nasus","Nautilus","Neeko","Nidalee","Nilah","Nocturne","Nunu","Olaf","Orianna",
  "Ornn","Pantheon","Poppy","Pyke","Qiyana","Quinn","Rakan","Rammus","RekSai","Rell",
  "Renata","Renekton","Rengar","Riven","Rumble","Ryze","Samira","Sejuani","Senna","Seraphine",
  "Sett","Shaco","Shen","Shyvana","Singed","Sion","Sivir","Skarner","Smolder","Sona",
  "Soraka","Swain","Sylas","Syndra","TahmKench","Taliyah","Talon","Taric","Teemo","Thresh",
  "Tristana","Trundle","Tryndamere","TwistedFate","Twitch","Udyr","Urgot","Varus","Vayne","Veigar",
  "Velkoz","Vex","Vi","Viego","Viktor","Vladimir","Volibear","Warwick","Wukong","Xayah",
  "Xerath","XinZhao","Yasuo","Yone","Yorick","Yuumi","Zac","Zed","Zeri","Ziggs",
  "Zilean","Zoe","Zyra"
];

function displayName(id: string): string {
  const map: Record<string, string> = {
    AurelionSol: "Aurelion Sol", DrMundo: "Dr. Mundo", JarvanIV: "Jarvan IV",
    Khazix: "Kha'Zix", KogMaw: "Kog'Maw", LeeSin: "Lee Sin", MasterYi: "Master Yi",
    MissFortune: "Miss Fortune", RekSai: "Rek'Sai", TahmKench: "Tahm Kench",
    TwistedFate: "Twisted Fate", Velkoz: "Vel'Koz", XinZhao: "Xin Zhao",
    Chogath: "Cho'Gath", Leblanc: "LeBlanc", Kaisa: "Kai'Sa",
  };
  return map[id] || id.replace(/([A-Z])/g, " $1").trim();
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ResultType = "champion" | "summoner" | "page" | "item" | "search";

interface SearchResult {
  type: ResultType;
  id: string;
  label: string;
  sublabel?: string;
  sublabelClass?: string;
  icon?: any;
  path?: string;
  championId?: string;
  profileIconId?: number;
  summonerLevel?: number;
  itemId?: string;
  itemImage?: string;
  itemGold?: number;
}

// ─── Debounce Hook ───────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TitleBarSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [summonerResults, setSummonerResults] = useState<SummonerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { openChampion } = useChampionDrawer();
  const { version: patchVersion } = usePatchVersion();
  const { t } = useLanguage();

  const PAGES = useMemo(() => [
    { name: t("nav.dashboard"), path: "/dashboard", icon: Activity, keywords: ["inicio", "home", "resumen", "dashboard"] },
    { name: t("nav.matches"), path: "/matches", icon: History, keywords: ["matches", "partidas", "historial", "log"] },
    { name: t("nav.learning"), path: "/learning", icon: ListTodo, keywords: ["learning", "tareas", "mejorar", "learn"] },
    { name: t("nav.draft"), path: "/champ-select", icon: Users, keywords: ["draft", "seleccion", "picks", "champ"] },
    { name: t("nav.notes"), path: "/notes", icon: StickyNote, keywords: ["notas", "notes", "apuntes"] },
    { name: t("nav.profile"), path: "/profile", icon: User, keywords: ["perfil", "profile", "stats"] },
    { name: t("nav.settings"), path: "/settings", icon: Settings, keywords: ["settings", "config", "opciones", "ajustes"] },
    { name: t("nav.calendar"), path: "/calendar", icon: CalendarDays, keywords: ["calendar", "calendario", "heatmap", "performance", "rendimiento"] },
    { name: t("nav.runeBuilder"), path: "/rune-builder", icon: Sparkles, keywords: ["runes", "runas", "builder", "constructor", "keystones"] },
  ], [t]);
  
  const debouncedQuery = useDebounce(query, 300);

  // ─── Summoner search via Riot API (only in Tauri mode, debounced) ──────────

  useEffect(() => {
    // Only use async search in Tauri mode — mock is handled inline in useMemo
    if (!IS_TAURI) return;

    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setSummonerResults([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const storedRegion = getStoredIdentity()?.region;
    const platform = storedRegion ? displayRegionToPlatform(storedRegion) : "euw1";
    searchSummoners(debouncedQuery, platform)
      .then((results) => {
        if (!cancelled) setSummonerResults(results);
      })
      .catch(() => {
        if (!cancelled) setSummonerResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // ─── Combine all results (flat, no categories) ───────────────────────────

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const out: SearchResult[] = [];

    // 1. Champions (instant, local)
    const champMatches = CHAMPIONS.filter(c =>
      c.toLowerCase().includes(q) || displayName(c).toLowerCase().includes(q)
    ).slice(0, 5);
    champMatches.forEach(c => out.push({
      type: "champion",
      id: `champ-${c}`,
      label: displayName(c),
      sublabel: t("search.champion"),
      championId: c,
    }));

    // 2. Items (instant, local)
    const itemMatches = ITEMS_DATABASE.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.plaintext.toLowerCase().includes(q) ||
      item.tags.some(tag => tag.toLowerCase().includes(q))
    ).slice(0, 5);
    itemMatches.forEach(item => out.push({
      type: "item",
      id: `item-${item.id}`,
      label: item.name,
      sublabel: `${item.gold.total}g · ${item.plaintext}`,
      itemId: item.id,
      itemImage: item.image,
      itemGold: item.gold.total,
    }));

    // 3. Summoner profiles — sync mock in web, async state in Tauri
    const summonerList = IS_TAURI ? summonerResults : searchSummonersMock(query);
    summonerList.forEach(s => {
      const rankText = s.soloRank ? `${formatRank(s.soloRank)} · ${s.soloLP} LP` : "Unranked";
      out.push({
        type: "summoner",
        id: `summoner-${s.puuid}`,
        label: `${s.gameName}#${s.tagLine}`,
        sublabel: `${s.region} · ${rankText} · Lvl ${s.summonerLevel}`,
        sublabelClass: s.soloRank ? getRankColor(s.soloRank) : undefined,
        profileIconId: s.profileIconId,
        summonerLevel: s.summonerLevel,
      });
    });

    // In Tauri mode: when no summoner results, offer a direct "search in Player Lookup" action
    if (IS_TAURI && summonerResults.length === 0 && q.length >= 2) {
      const hint = query.includes("#")
        ? t("search.noResultsHint") || "Summoner not found — check your Riot ID"
        : t("search.addTagHint") || "Add your Riot ID #TAG (e.g. Name#EUW)";
      out.push({
        type: "search",
        id: `search-${q}`,
        label: query.includes("#") ? query : `${query}#...`,
        sublabel: hint,
        path: `/player-lookup?name=${encodeURIComponent(query.split("#")[0])}&tag=${encodeURIComponent(query.split("#")[1] || "")}`,
      });
    }

    // 4. Pages (instant, local)
    const pageMatches = PAGES.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.keywords.some(k => k.includes(q))
    ).slice(0, 3);
    pageMatches.forEach(p => out.push({
      type: "page",
      id: `page-${p.path}`,
      label: p.name,
      sublabel: t("search.goToPage"),
      icon: p.icon,
      path: p.path,
    }));

    return out;
  }, [query, summonerResults, PAGES, t]);

  // ─── Reset selection on results change ────────────────────────────────────

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // ─── Outside click ────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ─── Selection handler ────────────────────────────────────────────────────

  const handleSelect = useCallback((result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    if (result.type === "champion" && result.championId) {
      openChampion(result.championId);
    } else if (result.type === "page" && result.path) {
      navigate(result.path);
    } else if (result.type === "summoner") {
      // Parse gameName#tagLine and navigate to PlayerLookup with params
      const parts = result.label.split("#");
      const name = parts[0];
      const tag = parts[1] || "";
      navigate(`/player-lookup?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`);
    } else if (result.type === "search" && result.path) {
      navigate(result.path);
    } else if (result.type === "item" && result.itemId) {
      navigate(`/item-explorer?item=${result.itemId}`);
    }
  }, [navigate, openChampion]);

  // ─── Keyboard navigation ─────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) handleSelect(results[selectedIndex]);
    }
  };

  const getTypeIcon = (result: SearchResult) => {
    if (result.type === "champion") return Shield;
    if (result.type === "summoner") return User;
    if (result.type === "item") return Package;
    if (result.type === "search") return Search;
    if (result.type === "page" && result.icon) return result.icon;
    return FileText;
  };

  const getTypeHint = (result: SearchResult) => {
    if (result.type === "champion") return t("search.view");
    if (result.type === "summoner") return t("search.profile");
    if (result.type === "item") return t("search.view");
    if (result.type === "search") return t("search.go");
    return t("search.go");
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-[480px]">
      {/* Search Input */}
      <div className={cn(
        "flex items-center gap-2 h-7 px-3 rounded-md bg-secondary/60 border transition-colors",
        isOpen ? "border-primary/40 bg-secondary/80" : "border-border/30 hover:bg-secondary/80"
      )}>
        {isSearching ? (
          <Loader2 className="w-3 h-3 text-primary shrink-0 animate-spin" />
        ) : (
          <Search className="w-3 h-3 text-muted-foreground/70 shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("search.placeholder")}
          className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/50 outline-none min-w-0"
        />
        {query ? (
          <button onClick={() => { setQuery(""); setSummonerResults([]); inputRef.current?.focus(); }} className="shrink-0 cursor-pointer">
            <X className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        ) : (
          <kbd className="shrink-0 hidden sm:inline-flex items-center gap-0.5 rounded border border-border/50 bg-background/60 px-1 font-mono text-[9px] text-muted-foreground/60">
            <span>⌘</span>K
          </kbd>
        )}
      </div>

      {/* Dropdown Results — flat, no category headers */}
      {isOpen && (results.length > 0 || (query.trim().length >= 2 && isSearching)) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden z-[100]">
          <div className="max-h-[380px] overflow-y-auto py-1">
            {results.map((result, idx) => {
              const Icon = getTypeIcon(result);
              return (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-1.5 text-left transition-colors",
                    idx === selectedIndex ? "bg-secondary/80" : "hover:bg-secondary/40"
                  )}
                >
                  {/* Icon / Avatar */}
                  {result.type === "champion" && result.championId ? (
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion || "26.6.1"}/img/champion/${result.championId}.png`}
                      alt={result.label}
                      className="w-7 h-7 rounded-md object-cover shrink-0 border border-border/30"
                    />
                  ) : result.type === "summoner" && result.profileIconId ? (
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion || "26.6.1"}/img/profileicon/${result.profileIconId}.png`}
                      alt={result.label}
                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-border/30"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${patchVersion || "26.6.1"}/img/profileicon/1.png`;
                      }}
                    />
                  ) : result.type === "item" && result.itemImage ? (
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion || "26.6.1"}/img/item/${result.itemImage}.png`}
                      alt={result.label}
                      className="w-7 h-7 rounded-md object-cover shrink-0 border border-border/30"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Text */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] text-foreground truncate">{result.label}</span>
                      {result.type === "summoner" && (
                        <Globe className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />
                      )}
                      {result.type === "item" && result.itemGold !== undefined && (
                        <span className="flex items-center gap-0.5 text-[9px] text-yellow-500/70 font-mono shrink-0">
                          <Coins className="w-2.5 h-2.5" />
                          {result.itemGold}
                        </span>
                      )}
                    </div>
                    {result.sublabel && (
                      <p className={cn(
                        "text-[10px] truncate",
                        result.sublabelClass || "text-muted-foreground/70"
                      )}>
                        {result.sublabel}
                      </p>
                    )}
                  </div>

                  {/* Right hint */}
                  <span className="text-[9px] text-muted-foreground/40 font-mono shrink-0">
                    {getTypeHint(result)}
                  </span>
                </button>
              );
            })}

            {/* Searching indicator when no results yet */}
            {isSearching && results.length === 0 && (
              <div className="px-4 py-4 text-center">
                <Loader2 className="w-4 h-4 text-primary/50 mx-auto mb-1.5 animate-spin" />
                <p className="text-[11px] text-muted-foreground/60">{t("search.searching")}</p>
              </div>
            )}
          </div>

          {/* Hint footer */}
          <div className="px-3 py-1.5 border-t border-border/30 flex items-center gap-3">
            <span className="text-[9px] text-muted-foreground/40">
              <kbd className="font-mono">↑↓</kbd> {t("search.navigate")}
            </span>
            <span className="text-[9px] text-muted-foreground/40">
              <kbd className="font-mono">↵</kbd> {t("search.select")}
            </span>
            <span className="text-[9px] text-muted-foreground/40">
              <kbd className="font-mono">esc</kbd> {t("search.close")}
            </span>
            {query.includes("#") && (
              <span className="text-[9px] text-primary/60 ml-auto">{t("search.riotIdDetected")}</span>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {isOpen && query.trim().length >= 2 && !isSearching && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden z-[100]">
          <div className="px-4 py-5 text-center">
            <Search className="w-4 h-4 text-muted-foreground/30 mx-auto mb-1.5" />
            <p className="text-[11px] text-muted-foreground">{t("search.noResults")} "<span className="text-foreground">{query}</span>"</p>
            <p className="text-[9px] text-muted-foreground/50 mt-1">
              {t("search.tryWith")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}