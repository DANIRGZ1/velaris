/**
 * RuneTreeDisplay — Reusable component showing full rune page with DDragon icons
 * 
 * Variants:
 * - "full"    → Two columns (primary + secondary tree) with all runes
 * - "compact" → Single row: keystone + tree icons (for match history rows)
 * - "inline"  → Just keystone icon + secondary tree icon (smallest)
 *
 * All rune & tree names are localized via runeLocale.ts using official Riot translations.
 */

import { cn } from "./ui/utils";
import { parseRunePage, getRuneIconUrl, getTreeIconUrl, type RuneInfo, type RuneTreeInfo } from "../data/runeData";
import { useLanguage } from "../contexts/LanguageContext";
import { getLocalizedRuneName, getLocalizedTreeName } from "../data/runeLocale";

interface RunePageProps {
  perk0?: number;
  perk1?: number;
  perk2?: number;
  perk3?: number;
  perk4?: number;
  perk5?: number;
  perkPrimaryStyle?: number;
  perkSubStyle?: number;
}

// ─── Full Display (PostGame, ChampionDrawer) ──────────────────────────────────

export function RuneTreeFull({ perks, className }: { perks: RunePageProps; className?: string }) {
  const { primaryTree, secondaryTree, keystone, primaryRunes, secondaryRunes } = parseRunePage(perks);
  const { t, language: lang } = useLanguage();

  if (!keystone || !primaryTree) {
    return <div className={cn("text-xs text-muted-foreground italic", className)}>{t("runes.noData")}</div>;
  }

  const primaryTreeName = getLocalizedTreeName(primaryTree.id, lang);
  const keystoneName = getLocalizedRuneName(keystone.id, lang);

  return (
    <div className={cn("flex gap-6", className)}>
      {/* Primary Tree */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 mb-1">
          <img
            src={getTreeIconUrl(primaryTree.id)}
            alt={primaryTreeName}
            className="w-4 h-4 opacity-80"
            loading="lazy"
          />
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", primaryTree.color)}>
            {primaryTreeName}
          </span>
        </div>
        {/* Keystone */}
        <div
          className="w-10 h-10 rounded-full border-2 flex items-center justify-center bg-black/20"
          style={{ borderColor: primaryTree.colorHex }}
        >
          <img
            src={getRuneIconUrl(keystone.id)}
            alt={keystoneName}
            className="w-7 h-7 rounded-full"
            title={keystoneName}
            loading="lazy"
          />
        </div>
        {/* Primary minor runes */}
        <div className="flex flex-col gap-1.5">
          {primaryRunes.map((rune) => (
            <RuneIcon key={rune.id} rune={rune} size="sm" lang={lang} />
          ))}
        </div>
      </div>

      {/* Secondary Tree */}
      {secondaryTree && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 mb-1">
            <img
              src={getTreeIconUrl(secondaryTree.id)}
              alt={getLocalizedTreeName(secondaryTree.id, lang)}
              className="w-4 h-4 opacity-80"
              loading="lazy"
            />
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", secondaryTree.color)}>
              {getLocalizedTreeName(secondaryTree.id, lang)}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-3">
            {secondaryRunes.map((rune) => (
              <RuneIcon key={rune.id} rune={rune} size="sm" lang={lang} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compact Display (Match History rows) ─────────────────────────────────────

export function RuneTreeCompact({ perks, className }: { perks: RunePageProps; className?: string }) {
  const { primaryTree, secondaryTree, keystone } = parseRunePage(perks);
  const { language: lang } = useLanguage();

  if (!keystone || !primaryTree) return null;

  const keystoneName = getLocalizedRuneName(keystone.id, lang);
  const secondaryTreeName = secondaryTree ? getLocalizedTreeName(secondaryTree.id, lang) : "";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* Keystone icon */}
      <div
        className="w-6 h-6 rounded-full border flex items-center justify-center bg-black/20 shrink-0"
        style={{ borderColor: primaryTree.colorHex + "80" }}
      >
        <img
          src={getRuneIconUrl(keystone.id)}
          alt={keystoneName}
          className="w-4 h-4 rounded-full"
          title={keystoneName}
          loading="lazy"
        />
      </div>
      {/* Secondary tree icon */}
      {secondaryTree && (
        <img
          src={getTreeIconUrl(secondaryTree.id)}
          alt={secondaryTreeName}
          className="w-4 h-4 opacity-60"
          title={secondaryTreeName}
          loading="lazy"
        />
      )}
    </div>
  );
}

// ─── Inline Display (smallest, for tight spaces) ─────────────────────────────

export function RuneTreeInline({ perks, className }: { perks: RunePageProps; className?: string }) {
  const { keystone } = parseRunePage(perks);
  const { language: lang } = useLanguage();

  if (!keystone) return null;

  const keystoneName = getLocalizedRuneName(keystone.id, lang);

  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={getRuneIconUrl(keystone.id)}
        alt={keystoneName}
        className="w-4 h-4 rounded-full"
        title={keystoneName}
        loading="lazy"
      />
    </div>
  );
}

// ─── Helper: Single Rune Icon ─────────────────────────────────────────────────

function RuneIcon({ rune, size = "sm", lang }: { rune: RuneInfo; size?: "sm" | "md"; lang: string }) {
  const sizeClass = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  const imgSize = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  const localName = getLocalizedRuneName(rune.id, lang);

  return (
    <div
      className={cn(
        sizeClass,
        "rounded-full bg-black/15 border border-border/30 flex items-center justify-center"
      )}
      title={localName}
    >
      <img
        src={getRuneIconUrl(rune.id)}
        alt={localName}
        className={cn(imgSize, "rounded-full")}
        loading="lazy"
      />
    </div>
  );
}
