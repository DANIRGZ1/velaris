/**
 * Central registry of all localStorage keys used by Velaris.
 * Always use these constants instead of raw strings to avoid typos and collisions.
 */

// ─── User setup & identity ─────────────────────────────────────────────────
export const STORAGE_SETUP_DONE       = "velaris-setup-done";
export const STORAGE_IDENTITY         = "velaris-identity";       // { name, tag, region, profileIconId }
export const STORAGE_MAIN_ROLE        = "velaris-main-role";      // "TOP" | "JGL" | "MID" | "ADC" | "SUP"
export const STORAGE_DAILY_LP_GOAL    = "velaris-daily-lp-goal";  // string number e.g. "50"
export const STORAGE_ACCOUNTS         = "velaris-accounts";
export const STORAGE_ACTIVE_ACCOUNT   = "velaris-active-account";

// ─── App preferences ──────────────────────────────────────────────────────
export const STORAGE_LANGUAGE         = "velaris-language";       // "en" | "es" | "kr"
export const STORAGE_ACCENT           = "velaris-accent";         // "violet" | "blue" | ...
export const STORAGE_SETTINGS         = "velaris-settings";
export const STORAGE_SIDEBAR_COLLAPSED = "velaris-sidebar-collapsed";

// ─── Onboarding ───────────────────────────────────────────────────────────
export const STORAGE_ONBOARDING_DONE  = "velaris-onboarding-done";

// ─── Cache ────────────────────────────────────────────────────────────────
export const STORAGE_MATCH_CACHE      = "velaris-match-history-cache";
export const STORAGE_CHAMP_ID_MAP     = "velaris-champ-id-map";

// ─── Tracker data ─────────────────────────────────────────────────────────
export const STORAGE_LP_HISTORY       = "velaris_lp_history";     // note: underscore (legacy, keep as-is)

// ─── Goals & achievements ─────────────────────────────────────────────────
export const STORAGE_GOALS            = "velaris-goals";
export const STORAGE_ACHIEVEMENTS     = "velaris-achievements-unlocked";

// ─── Feature state ────────────────────────────────────────────────────────
export const STORAGE_NOTES_FILTER_TAG = "velaris-notes-filter-tag";
export const STORAGE_RUNE_PAGES       = "velaris-rune-pages";
export const STORAGE_SESSION_GOAL     = "velaris-session-goal";
export const STORAGE_CHECKLIST_DISMISSED = "velaris-checklist-dismissed";
export const STORAGE_DISMISSED_GOAL_SUGGESTIONS = "velaris-dismissed-goal-sug";
