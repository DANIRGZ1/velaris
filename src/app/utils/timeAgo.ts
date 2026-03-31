/**
 * Relative timestamp helper — Velaris
 * Returns "just now", "2m ago", "3h ago", "yesterday", "3 days ago", etc.
 * Fully localized for EN/ES/KR.
 */

type Lang = "en" | "es" | "kr";

const LABELS: Record<Lang, {
  now: string;
  mAgo: (n: number) => string;
  hAgo: (n: number) => string;
  yesterday: string;
  dAgo: (n: number) => string;
  wAgo: (n: number) => string;
}> = {
  en: {
    now: "just now",
    mAgo: (n) => `${n}m ago`,
    hAgo: (n) => `${n}h ago`,
    yesterday: "yesterday",
    dAgo: (n) => `${n}d ago`,
    wAgo: (n) => `${n}w ago`,
  },
  es: {
    now: "ahora",
    mAgo: (n) => `hace ${n}m`,
    hAgo: (n) => `hace ${n}h`,
    yesterday: "ayer",
    dAgo: (n) => `hace ${n}d`,
    wAgo: (n) => `hace ${n}sem`,
  },
  kr: {
    now: "\uBC29\uAE08",
    mAgo: (n) => `${n}\uBD84 \uC804`,
    hAgo: (n) => `${n}\uC2DC\uAC04 \uC804`,
    yesterday: "\uC5B4\uC81C",
    dAgo: (n) => `${n}\uC77C \uC804`,
    wAgo: (n) => `${n}\uC8FC \uC804`,
  },
};

/** Format large numbers as 1.2K, 50K, 1.3M etc. */
export function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function timeAgo(timestamp: number, lang: string = "en"): string {
  const l = LABELS[lang as Lang] || LABELS.en;
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) return l.now;
  if (minutes < 60) return l.mAgo(minutes);
  if (hours < 24) return l.hAgo(hours);
  if (days === 1) return l.yesterday;
  if (days < 7) return l.dAgo(days);
  if (weeks < 5) return l.wAgo(weeks);

  // Fall back to date for older
  const locale = lang === "kr" ? "ko-KR" : lang === "es" ? "es-ES" : "en-US";
  return new Date(timestamp).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
