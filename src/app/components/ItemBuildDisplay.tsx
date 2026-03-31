/**
 * ItemBuildDisplay — Visual item build path with DDragon icons
 * 
 * Shows items in purchase order groups:
 * - Starting items
 * - Core build
 * - Situational items
 * - Trinket
 * 
 * Uses Data Dragon CDN for item icons.
 */

import { cn } from "./ui/utils";
import { ChevronRight, Coins } from "lucide-react";
import { usePatchVersion } from "../hooks/usePatchVersion";

// ─── Item Database (common items) ─────────────────────────────────────────────

const ITEM_DATA: Record<number, { name: string; gold: number; category: "starter" | "boots" | "mythic" | "legendary" | "trinket" | "component" }> = {
  // Trinkets
  3340: { name: "Stealth Ward", gold: 0, category: "trinket" },
  3363: { name: "Farsight Alteration", gold: 0, category: "trinket" },
  3364: { name: "Oracle Lens", gold: 0, category: "trinket" },
  // Boots
  3006: { name: "Berserker's Greaves", gold: 1100, category: "boots" },
  3009: { name: "Boots of Swiftness", gold: 900, category: "boots" },
  3020: { name: "Sorcerer's Shoes", gold: 1100, category: "boots" },
  3047: { name: "Plated Steelcaps", gold: 1100, category: "boots" },
  3111: { name: "Mercury's Treads", gold: 1100, category: "boots" },
  3158: { name: "Ionian Boots of Lucidity", gold: 900, category: "boots" },
  // ADC items
  3031: { name: "Infinity Edge", gold: 3400, category: "legendary" },
  3036: { name: "Lord Dominik's Regards", gold: 3000, category: "legendary" },
  3072: { name: "Bloodthirster", gold: 3400, category: "legendary" },
  3085: { name: "Runaan's Hurricane", gold: 2600, category: "legendary" },
  3094: { name: "Rapid Firecannon", gold: 2500, category: "legendary" },
  3153: { name: "Blade of the Ruined King", gold: 3200, category: "legendary" },
  6672: { name: "Kraken Slayer", gold: 3100, category: "legendary" },
  // AP items
  3089: { name: "Rabadon's Deathcap", gold: 3600, category: "legendary" },
  3116: { name: "Rylai's Crystal Scepter", gold: 2600, category: "legendary" },
  3135: { name: "Void Staff", gold: 2800, category: "legendary" },
  3165: { name: "Morellonomicon", gold: 2500, category: "legendary" },
  6655: { name: "Luden's Tempest", gold: 3200, category: "legendary" },
  // Bruiser / Tank
  3071: { name: "Black Cleaver", gold: 3100, category: "legendary" },
  6693: { name: "Eclipse", gold: 2800, category: "legendary" },
  3504: { name: "Ardent Censer", gold: 2300, category: "legendary" },
  3011: { name: "Chemtech Putrifier", gold: 2300, category: "legendary" },
};

function getItemName(id: number): string {
  return ITEM_DATA[id]?.name || `Item ${id}`;
}

function getItemGold(id: number): number {
  return ITEM_DATA[id]?.gold || 0;
}

function getItemCategory(id: number): string {
  return ITEM_DATA[id]?.category || "legendary";
}

// ─── Components ───────────────────────────────────────────────────────────────

interface ItemBuildProps {
  items: number[]; // item0-item6
  className?: string;
  variant?: "full" | "compact";
}

export function ItemBuildDisplay({ items, className, variant = "full" }: ItemBuildProps) {
  const { version: patchVersion } = usePatchVersion();
  const validItems = items.filter(id => id > 0);
  
  if (validItems.length === 0) return null;

  // Separate trinket from build items
  const trinket = validItems.find(id => getItemCategory(id) === "trinket");
  const buildItems = validItems.filter(id => getItemCategory(id) !== "trinket");
  const totalGold = buildItems.reduce((sum, id) => sum + getItemGold(id), 0);

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {buildItems.map((itemId, i) => (
          <ItemIcon key={i} itemId={itemId} patchVersion={patchVersion} size="sm" />
        ))}
        {trinket && (
          <>
            <div className="w-px h-4 bg-border/40 mx-0.5" />
            <ItemIcon itemId={trinket} patchVersion={patchVersion} size="sm" />
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Build path with arrows */}
      <div className="flex items-center gap-1 flex-wrap">
        {buildItems.map((itemId, i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
            <ItemIcon itemId={itemId} patchVersion={patchVersion} size="md" showTooltip />
          </div>
        ))}
        {trinket && (
          <>
            <div className="w-px h-6 bg-border/40 mx-1.5" />
            <ItemIcon itemId={trinket} patchVersion={patchVersion} size="md" showTooltip />
          </>
        )}
      </div>

      {/* Total gold cost */}
      {totalGold > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Coins className="w-3 h-3" />
          <span className="font-mono">{totalGold.toLocaleString()}g total</span>
          <span>&bull;</span>
          <span>{buildItems.length} items</span>
        </div>
      )}
    </div>
  );
}

// ─── Single Item Icon ─────────────────────────────────────────────────────────

function ItemIcon({ itemId, patchVersion, size = "md", showTooltip = false }: {
  itemId: number;
  patchVersion: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}) {
  const sizeClass = size === "sm" ? "w-6 h-6" : size === "md" ? "w-8 h-8" : "w-10 h-10";
  const name = getItemName(itemId);
  const gold = getItemGold(itemId);

  return (
    <div className="relative group" title={showTooltip ? `${name}${gold > 0 ? ` (${gold.toLocaleString()}g)` : ""}` : undefined}>
      <div className={cn(sizeClass, "rounded-md bg-secondary border border-border/60 overflow-hidden shrink-0")}>
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/item/${itemId}.png`}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      </div>
    </div>
  );
}
