import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Settings, TrendingUp, Swords, Target, ChevronRight, Crown, Plus, X, Check, RefreshCw } from "lucide-react";
import { cn } from "./ui/utils";
import { useNavigate } from "react-router";
import {
  getSummonerInfo,
  getAccounts,
  getActiveAccountIndex,
  setActiveAccount,
  addAccount,
  removeAccount,
  fetchRankForAccount,
  refreshAllAccountRanks,
  type SummonerInfo,
  type StoredIdentity,
} from "../services/dataService";
import { usePatchVersion } from "../hooks/usePatchVersion";
import { useLanguage } from "../contexts/LanguageContext";

const RANK_COLORS: Record<string, string> = {
  IRON: "text-gray-400",
  BRONZE: "text-amber-700",
  SILVER: "text-gray-300",
  GOLD: "text-yellow-500",
  PLATINUM: "text-cyan-400",
  EMERALD: "text-emerald-500",
  DIAMOND: "text-blue-400",
  MASTER: "text-purple-500",
  GRANDMASTER: "text-red-500",
  CHALLENGER: "text-yellow-400",
};

const MAX_ACCOUNTS = 5;
const RANK_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

function formatTimeAgo(timestamp: number | undefined, t: (key: string) => string): string {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("dropdown.rankJustNow");
  if (mins < 60) return `${mins}m ${t("dropdown.rankAgo")}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${t("dropdown.rankAgo")}`;
  const days = Math.floor(hours / 24);
  return `${days}d ${t("dropdown.rankAgo")}`;
}

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [summoner, setSummoner] = useState<SummonerInfo | null>(null);
  const [accounts, setAccountsList] = useState<StoredIdentity[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showAddInput, setShowAddInput] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [refreshingIdx, setRefreshingIdx] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { version: patchVersion } = usePatchVersion();
  const { t } = useLanguage();

  const refreshAccounts = () => {
    setAccountsList(getAccounts());
    setActiveIdx(getActiveAccountIndex());
  };

  // Load summoner info on mount
  useEffect(() => {
    getSummonerInfo().then((info) => {
      setSummoner(info);
      refreshAccounts(); // Re-read after rank sync
    });
    refreshAccounts();
  }, []);

  // Refresh when dropdown opens
  useEffect(() => {
    if (isOpen) {
      getSummonerInfo().then((info) => {
        setSummoner(info);
        refreshAccounts(); // Re-read after rank sync
      });
      refreshAccounts();
      setShowAddInput(false);
      setAddInput("");
    }
  }, [isOpen]);

  // Focus add input
  useEffect(() => {
    if (showAddInput && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [showAddInput]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleNav = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleSwitchAccount = (idx: number) => {
    setActiveAccount(idx);
    setActiveIdx(idx);
    getSummonerInfo().then((info) => {
      setSummoner(info);
      refreshAccounts(); // Re-read accounts after rank sync
    });
  };

  const handleRemoveAccount = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    removeAccount(idx);
    refreshAccounts();
    getSummonerInfo().then((info) => {
      setSummoner(info);
      refreshAccounts();
    });
  };

  const handleAddAccount = () => {
    const parts = addInput.trim().split("#");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return;
    const identity: StoredIdentity = {
      name: parts[0],
      tag: parts[1],
      profileIconId: 29,
      region: "EUW",
    };
    const idx = addAccount(identity);
    if (idx === -1) return; // Max reached
    // Auto-fetch rank for the new account in background
    fetchRankForAccount(idx).then(() => refreshAccounts());
    setActiveAccount(idx);
    getSummonerInfo().then((info) => {
      setSummoner(info);
      refreshAccounts();
    });
    setShowAddInput(false);
    setAddInput("");
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddAccount();
    if (e.key === "Escape") { setShowAddInput(false); setAddInput(""); }
  };

  // Manual refresh rank for a single account
  const handleRefreshRank = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (refreshingIdx !== null) return; // Already refreshing
    setRefreshingIdx(idx);
    fetchRankForAccount(idx)
      .then(() => {
        refreshAccounts();
        // Also refresh summoner if it's the active account
        if (idx === activeIdx) {
          getSummonerInfo().then((info) => {
            setSummoner(info);
            refreshAccounts();
          });
        }
      })
      .finally(() => setRefreshingIdx(null));
  };

  // Auto-refresh all account ranks every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllAccountRanks().then(() => {
        refreshAccounts();
        // Also refresh active summoner info
        getSummonerInfo().then((info) => setSummoner(info));
      });
    }, RANK_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const winrate = summoner ? Math.round((summoner.wins / (summoner.wins + summoner.losses)) * 100) : 0;
  const totalGames = summoner ? summoner.wins + summoner.losses : 0;
  const profileIconUrl = summoner
    ? `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/profileicon/${summoner.profileIconId}.png`
    : "";

  return (
    <div ref={panelRef} className="relative">
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border transition-all",
          isOpen
            ? "border-primary ring-2 ring-primary/20"
            : "bg-secondary border-border hover:border-foreground/30"
        )}
      >
        {summoner ? (
          <img
            src={profileIconUrl}
            alt={summoner.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              const fallback = img.parentElement?.querySelector("[data-fallback-icon]");
              if (fallback) (fallback as HTMLElement).style.display = "flex";
            }}
          />
        ) : null}
        <User
          data-fallback-icon
          className="w-4 h-4 text-muted-foreground"
          style={{ display: summoner ? "none" : "block" }}
        />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full right-0 mt-2 w-[280px] bg-card border border-border/60 rounded-2xl shadow-xl overflow-hidden z-50 flex flex-col"
          >
            {/* Profile Header */}
            <div className="px-5 pt-5 pb-4 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-background shadow-md shrink-0 bg-secondary">
                  {summoner && (
                    <img
                      src={profileIconUrl}
                      alt={summoner.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/profileicon/1.png`; }}
                    />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[15px] font-semibold text-foreground truncate">
                      {summoner?.name || t("common.loading")}
                    </span>
                    <span className="text-[12px] text-muted-foreground">#{summoner?.tag}</span>
                  </div>
                  {summoner && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Crown className={cn("w-3 h-3", RANK_COLORS[summoner.rank] || "text-muted-foreground")} />
                      <span className={cn("text-[12px] font-medium", RANK_COLORS[summoner.rank] || "text-muted-foreground")}>
                        {t(`rank.${summoner.rank}`)} {summoner.division}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60 font-mono">{summoner.lp} LP</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              {summoner && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="flex flex-col items-center p-2 rounded-lg bg-secondary/50">
                    <Swords className="w-3 h-3 text-muted-foreground mb-1" />
                    <span className="text-[13px] font-bold text-foreground">{totalGames}</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{t("dropdown.games")}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-secondary/50">
                    <TrendingUp className="w-3 h-3 text-muted-foreground mb-1" />
                    <span className={cn("text-[13px] font-bold", winrate >= 50 ? "text-emerald-500" : "text-destructive")}>{winrate}%</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{t("common.winrate")}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-secondary/50">
                    <Target className="w-3 h-3 text-muted-foreground mb-1" />
                    <span className="text-[13px] font-bold text-foreground">{t("dropdown.level")}{summoner.level}</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{t("profile.level")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Account Switcher */}
            {accounts.length > 0 && (
              <div className="border-b border-border/40">
                <div className="px-5 pt-3 pb-1.5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">{t("dropdown.accounts")}</span>
                  <span className="text-[10px] text-muted-foreground/30 font-mono">{accounts.length}/{MAX_ACCOUNTS}</span>
                </div>
                <div className="px-3 pb-2 flex flex-col gap-0.5">
                  {accounts.map((acc, idx) => {
                    const isActive = idx === activeIdx;
                    const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/profileicon/${acc.profileIconId}.png`;
                    return (
                      <button
                        key={`${acc.name}#${acc.tag}`}
                        onClick={() => !isActive && handleSwitchAccount(idx)}
                        className={cn(
                          "flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors group w-full text-left",
                          isActive
                            ? "bg-primary/8 border border-primary/15"
                            : "hover:bg-secondary/60 border border-transparent cursor-pointer"
                        )}
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-secondary shrink-0">
                          <img
                            src={iconUrl}
                            alt={acc.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/profileicon/1.png`; }}
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[12px] truncate",
                              isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                            )}>
                              {acc.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground/50 font-mono">#{acc.tag}</span>
                          </div>
                          {acc.rank && acc.rank !== "UNRANKED" ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Crown className={cn("w-2.5 h-2.5", RANK_COLORS[acc.rank] || "text-muted-foreground")} />
                              <span className={cn("text-[10px]", RANK_COLORS[acc.rank] || "text-muted-foreground")}>
                                {t(`rank.${acc.rank}`)} {acc.division}
                              </span>
                              {acc.lp !== undefined && (
                                <span className="text-[9px] text-muted-foreground/40 font-mono">{acc.lp} LP</span>
                              )}
                              {acc.rankUpdatedAt && (
                                <span className="text-[8px] text-muted-foreground/25 font-mono ml-auto" title={new Date(acc.rankUpdatedAt).toLocaleString()}>
                                  {formatTimeAgo(acc.rankUpdatedAt, t)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/30 mt-0.5">{acc.region}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isActive && (
                            <Check className="w-3 h-3 text-primary" />
                          )}
                          <button
                            onClick={(e) => handleRemoveAccount(e, idx)}
                            className="w-4 h-4 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleRefreshRank(e, idx)}
                            title={t("dropdown.refreshRank")}
                            className={cn(
                              "w-4 h-4 flex items-center justify-center rounded text-muted-foreground/30 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer",
                              refreshingIdx === idx && "!opacity-100 animate-spin"
                            )}
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </div>
                      </button>
                    );
                  })}

                  {/* Add Account */}
                  {showAddInput ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 mt-0.5">
                      <input
                        ref={addInputRef}
                        type="text"
                        value={addInput}
                        onChange={(e) => setAddInput(e.target.value)}
                        onKeyDown={handleAddKeyDown}
                        placeholder="Name#TAG"
                        className="flex-1 h-7 px-2 bg-secondary/50 border border-border/50 rounded-md text-[11px] text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all font-mono"
                      />
                      <button
                        onClick={handleAddAccount}
                        disabled={!addInput.includes("#")}
                        className={cn(
                          "w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer shrink-0",
                          addInput.includes("#")
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : "bg-secondary/30 text-muted-foreground/20"
                        )}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setShowAddInput(false); setAddInput(""); }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : accounts.length < MAX_ACCOUNTS ? (
                    <button
                      onClick={() => setShowAddInput(true)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary/40 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium">{t("dropdown.addAccount")}</span>
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {/* Setup prompt when no accounts at all */}
            {accounts.length === 0 && !showAddInput && (
              <div className="px-5 py-3 border-b border-border/40 bg-primary/5">
                <p className="text-[11px] text-muted-foreground mb-2">{t("dropdown.setupHint")}</p>
                <button
                  onClick={() => setShowAddInput(true)}
                  className="w-full px-3 py-1.5 text-[11px] font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors rounded-lg cursor-pointer"
                >
                  {t("dropdown.setupRiotId")}
                </button>
              </div>
            )}

            {/* Inline add when no accounts */}
            {accounts.length === 0 && showAddInput && (
              <div className="px-5 py-3 border-b border-border/40">
                <div className="flex items-center gap-1.5">
                  <input
                    ref={addInputRef}
                    type="text"
                    value={addInput}
                    onChange={(e) => setAddInput(e.target.value)}
                    onKeyDown={handleAddKeyDown}
                    placeholder="Name#TAG"
                    className="flex-1 h-8 px-2.5 bg-secondary/50 border border-border/50 rounded-lg text-[12px] text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all font-mono"
                  />
                  <button
                    onClick={handleAddAccount}
                    disabled={!addInput.includes("#")}
                    className={cn(
                      "h-8 px-3 flex items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0 text-[11px] font-medium",
                      addInput.includes("#")
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary/30 text-muted-foreground/20"
                    )}
                  >
                    {t("dropdown.add")}
                  </button>
                </div>
              </div>
            )}

            {/* Menu Items */}
            <div className="flex flex-col py-2">
              <button
                onClick={() => handleNav("/profile")}
                className="flex items-center justify-between px-5 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  {t("dropdown.viewProfile")}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </button>
              <button
                onClick={() => handleNav("/settings?tab=account")}
                className="flex items-center justify-between px-5 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  {t("dropdown.settings")}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </button>
            </div>

            {/* Version Info */}
            <div className="px-5 py-2 border-t border-border/40 bg-secondary/20">
              <p className="text-[9px] text-muted-foreground/40 font-mono text-center">
                Velaris v0.1.0-alpha &bull; {t("common.patch")} {patchVersion}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}