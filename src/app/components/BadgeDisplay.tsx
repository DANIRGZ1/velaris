/**
 * BadgeDisplay — Shows the full badge grid on the Profile page.
 * Earned badges are bright; locked ones are dimmed with a lock overlay.
 */
import { useMemo } from "react";
import { Lock } from "lucide-react";
import { cn } from "./ui/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { getAllBadgesWithStatus } from "../services/badgeService";
import { BadgeIcon } from "./BadgeIcon";
import type { MatchData } from "../utils/analytics";
import type { LPSnapshot } from "../services/lpTracker";

const TIER_LABEL: Record<string, string> = {
  bronze: "text-amber-500",
  silver: "text-slate-400",
  gold:   "text-yellow-400",
  diamond:"text-sky-400",
};

const TIER_BG: Record<string, string> = {
  bronze:  "bg-amber-900/10  border-amber-700/25",
  silver:  "bg-slate-700/10  border-slate-400/20",
  gold:    "bg-yellow-900/10 border-yellow-400/25",
  diamond: "bg-sky-900/10    border-sky-400/30",
};

interface Props {
  matches: MatchData[];
  lpHistory: LPSnapshot[];
}

export function BadgeDisplay({ matches, lpHistory }: Props) {
  const { t } = useLanguage();
  const badges = useMemo(() => getAllBadgesWithStatus(matches, lpHistory), [matches, lpHistory]);

  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);

  return (
    <div className="p-6 bg-card border border-border/60 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-semibold text-foreground section-title">{t("badges.title")}</h2>
        <span className="text-[12px] text-muted-foreground font-mono">
          {earned.length}<span className="text-muted-foreground/40">/{badges.length}</span>
        </span>
      </div>

      {earned.length === 0 && (
        <p className="text-[13px] text-muted-foreground/60 text-center py-4">{t("badges.empty")}</p>
      )}

      {/* Earned */}
      {earned.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {earned.map(({ badge, earnedAt }) => (
            <div
              key={badge.id}
              title={`${t(badge.titleKey)}\n${t(badge.descKey)}${earnedAt ? `\n${new Date(earnedAt).toLocaleDateString()}` : ""}`}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200",
                "hover:scale-105 hover:shadow-md cursor-default",
                TIER_BG[badge.tier],
              )}
            >
              <BadgeIcon badgeId={badge.id} tier={badge.tier as "bronze" | "silver" | "gold" | "diamond"} size={52} />
              <span className={cn("text-[9px] font-bold uppercase tracking-widest", TIER_LABEL[badge.tier])}>
                {t(`badge.tier.${badge.tier}`)}
              </span>
              <span className="text-[10px] font-medium text-foreground text-center leading-tight">
                {t(badge.titleKey)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <>
          <p className="text-[11px] text-muted-foreground/40 uppercase tracking-widest font-bold mb-3">
            {t("badges.locked")}
          </p>
          <div className="grid grid-cols-4 gap-3">
            {locked.map(({ badge }) => (
              <div
                key={badge.id}
                title={t(badge.descKey)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/20 bg-secondary/5 cursor-default relative"
              >
                <BadgeIcon badgeId={badge.id} tier={badge.tier as "bronze" | "silver" | "gold" | "diamond"} locked size={52} />
                <Lock className="w-2.5 h-2.5 text-muted-foreground/30 absolute top-2 right-2" />
                <span className="text-[10px] font-medium text-muted-foreground/40 text-center leading-tight">
                  {t(badge.titleKey)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
