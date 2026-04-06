/**
 * BadgeDisplay — Shows the full badge grid on the Profile page.
 * Earned badges are bright; locked ones are dimmed with a lock overlay.
 */
import { useMemo } from "react";
import { Lock } from "lucide-react";
import { cn } from "./ui/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { getAllBadgesWithStatus } from "../services/badgeService";
import type { MatchData } from "../utils/analytics";
import type { LPSnapshot } from "../services/lpTracker";

const TIER_RING: Record<string, string> = {
  bronze:  "ring-amber-700/50 bg-amber-900/10",
  silver:  "ring-slate-400/50 bg-slate-700/10",
  gold:    "ring-yellow-400/50 bg-yellow-900/10",
  diamond: "ring-blue-400/50  bg-blue-900/10",
};

const TIER_LABEL: Record<string, string> = {
  bronze: "text-amber-700",
  silver: "text-slate-400",
  gold:   "text-yellow-400",
  diamond:"text-blue-400",
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-foreground section-title">{t("badges.title")}</h2>
        <span className="text-[12px] text-muted-foreground">{earned.length}/{badges.length}</span>
      </div>

      {earned.length === 0 && (
        <p className="text-[13px] text-muted-foreground/60 text-center py-4">{t("badges.empty")}</p>
      )}

      {/* Earned */}
      {earned.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {earned.map(({ badge, earnedAt }) => (
            <div
              key={badge.id}
              title={`${t(badge.titleKey)}\n${t(badge.descKey)}\n${new Date(earnedAt!).toLocaleDateString()}`}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl ring-1 transition-all hover:scale-105 cursor-default",
                TIER_RING[badge.tier]
              )}
            >
              <span className="text-2xl leading-none">{badge.icon}</span>
              <span className={cn("text-[9px] font-bold uppercase tracking-wider", TIER_LABEL[badge.tier])}>
                {t(`badge.tier.${badge.tier}`)}
              </span>
              <span className="text-[10px] font-medium text-foreground text-center leading-tight">{t(badge.titleKey)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <>
          <p className="text-[11px] text-muted-foreground/50 mb-2">{t("badges.locked")}</p>
          <div className="grid grid-cols-4 gap-3">
            {locked.map(({ badge }) => (
              <div
                key={badge.id}
                title={t(badge.descKey)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl ring-1 ring-border/30 bg-secondary/10 opacity-40 cursor-default relative"
              >
                <span className="text-2xl leading-none grayscale">{badge.icon}</span>
                <Lock className="w-2.5 h-2.5 text-muted-foreground/60 absolute top-2 right-2" />
                <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{t(badge.titleKey)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
