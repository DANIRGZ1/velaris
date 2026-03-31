import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  computeTotalLP,
  formatTotalLP,
  computeLPStats,
  getDailyLPSeries,
  type LPSnapshot,
} from "../lpTracker";

// ─── computeTotalLP ───────────────────────────────────────────────────────────

describe("computeTotalLP", () => {
  it("computes correct totalLP for standard ranked tiers", () => {
    // IRON IV 0 LP = base 0
    expect(computeTotalLP("IRON", "IV", 0)).toBe(0);
    // IRON I 75 LP = 0 + 300 + 75 = 375
    expect(computeTotalLP("IRON", "I", 75)).toBe(375);
    // BRONZE II 50 LP = 400 + 200 + 50 = 650
    expect(computeTotalLP("BRONZE", "II", 50)).toBe(650);
    // GOLD III 0 LP = 1200 + 100 + 0 = 1300
    expect(computeTotalLP("GOLD", "III", 0)).toBe(1300);
    // DIAMOND I 100 LP = 2400 + 300 + 100 = 2800
    expect(computeTotalLP("DIAMOND", "I", 100)).toBe(2800);
  });

  it("handles apex tiers (MASTER/GRANDMASTER/CHALLENGER) without division", () => {
    // MASTER has no divisions — division value should be 0
    expect(computeTotalLP("MASTER", "I", 150)).toBe(2800 + 150);
    expect(computeTotalLP("GRANDMASTER", "I", 500)).toBe(2900 + 500);
    expect(computeTotalLP("CHALLENGER", "I", 1000)).toBe(3000 + 1000);
  });

  it("is case-insensitive for rank and division", () => {
    expect(computeTotalLP("gold", "iii", 0)).toBe(computeTotalLP("GOLD", "III", 0));
    expect(computeTotalLP("Emerald", "Ii", 50)).toBe(computeTotalLP("EMERALD", "II", 50));
  });

  it("returns 0 for unknown tier", () => {
    expect(computeTotalLP("UNRANKED", "IV", 0)).toBe(0);
  });
});

// ─── formatTotalLP ────────────────────────────────────────────────────────────

describe("formatTotalLP", () => {
  it("formats standard tier correctly", () => {
    expect(formatTotalLP(0)).toBe("IRON IV 0 LP");
    expect(formatTotalLP(375)).toBe("IRON I 75 LP");
    expect(formatTotalLP(650)).toBe("BRONZE II 50 LP");
    expect(formatTotalLP(1300)).toBe("GOLD III 0 LP");
    expect(formatTotalLP(2700)).toBe("DIAMOND I 0 LP");
  });

  it("formats apex tiers correctly", () => {
    expect(formatTotalLP(2800)).toBe("MASTER 0 LP");
    expect(formatTotalLP(2950)).toBe("GRANDMASTER 50 LP");
    expect(formatTotalLP(3100)).toBe("CHALLENGER 100 LP");
  });

  it("round-trips: computeTotalLP → formatTotalLP preserves rank boundaries", () => {
    const emerald2_75 = computeTotalLP("EMERALD", "II", 75);
    expect(formatTotalLP(emerald2_75)).toBe("EMERALD II 75 LP");
  });
});

// ─── computeLPStats ───────────────────────────────────────────────────────────

describe("computeLPStats", () => {
  const NOW = 1_700_000_000_000;
  const DAY = 86_400_000;

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for empty history", () => {
    expect(computeLPStats([])).toBeNull();
  });

  it("computes current and peak correctly", () => {
    const history: LPSnapshot[] = [
      { timestamp: NOW - 10 * DAY, rank: "GOLD", division: "IV", lp: 0, totalLP: 1200, wins: 10, losses: 10 },
      { timestamp: NOW - 5 * DAY, rank: "GOLD", division: "II", lp: 50, totalLP: 1450, wins: 15, losses: 12 },
      { timestamp: NOW - 1 * DAY, rank: "GOLD", division: "III", lp: 0, totalLP: 1300, wins: 16, losses: 14 },
    ];
    const stats = computeLPStats(history);
    expect(stats?.current).toBe(1300);
    expect(stats?.peak).toBe(1450);
    expect(stats?.peakFormatted).toBe("GOLD II 50 LP");
  });

  it("computes session gain (last 24h) correctly", () => {
    const history: LPSnapshot[] = [
      { timestamp: NOW - 2 * DAY, rank: "GOLD", division: "IV", lp: 0, totalLP: 1200, wins: 10, losses: 10 },
      { timestamp: NOW - 12 * 3600_000, rank: "GOLD", division: "III", lp: 0, totalLP: 1300, wins: 11, losses: 10 },
      { timestamp: NOW - 1 * 3600_000, rank: "GOLD", division: "II", lp: 50, totalLP: 1450, wins: 12, losses: 10 },
    ];
    const stats = computeLPStats(history);
    // First snapshot within last 24h has totalLP 1300, current is 1450 → gain = 150
    expect(stats?.sessionGain).toBe(150);
  });

  it("detects upward trend when sessionGain > 10", () => {
    const history: LPSnapshot[] = [
      { timestamp: NOW - 12 * 3600_000, rank: "GOLD", division: "IV", lp: 0, totalLP: 1200, wins: 10, losses: 10 },
      { timestamp: NOW - 1 * 3600_000, rank: "GOLD", division: "II", lp: 50, totalLP: 1450, wins: 12, losses: 10 },
    ];
    expect(computeLPStats(history)?.trend).toBe("up");
  });

  it("detects downward trend when sessionGain < -10", () => {
    const history: LPSnapshot[] = [
      { timestamp: NOW - 12 * 3600_000, rank: "GOLD", division: "II", lp: 50, totalLP: 1450, wins: 10, losses: 10 },
      { timestamp: NOW - 1 * 3600_000, rank: "GOLD", division: "IV", lp: 0, totalLP: 1200, wins: 10, losses: 12 },
    ];
    expect(computeLPStats(history)?.trend).toBe("down");
  });

  it("detects flat trend when sessionGain is within -10..10", () => {
    const history: LPSnapshot[] = [
      { timestamp: NOW - 12 * 3600_000, rank: "GOLD", division: "IV", lp: 0, totalLP: 1200, wins: 10, losses: 10 },
      { timestamp: NOW - 1 * 3600_000, rank: "GOLD", division: "IV", lp: 5, totalLP: 1205, wins: 10, losses: 10 },
    ];
    expect(computeLPStats(history)?.trend).toBe("flat");
  });

  it("returns 0 session/7d/30d gain when no snapshot falls within the window", () => {
    const history: LPSnapshot[] = [
      // Only snapshot is 60 days ago
      { timestamp: NOW - 60 * DAY, rank: "GOLD", division: "IV", lp: 0, totalLP: 1200, wins: 10, losses: 10 },
    ];
    const stats = computeLPStats(history);
    expect(stats?.sessionGain).toBe(0);
    expect(stats?.last7DaysGain).toBe(0);
    expect(stats?.last30DaysGain).toBe(0);
  });
});

// ─── getDailyLPSeries ─────────────────────────────────────────────────────────

describe("getDailyLPSeries", () => {
  const NOW = 1_700_000_000_000;
  const DAY = 86_400_000;

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array for empty history", () => {
    expect(getDailyLPSeries([])).toEqual([]);
  });

  it("returns empty array when all snapshots are outside the window", () => {
    const history: LPSnapshot[] = [
      { timestamp: NOW - 60 * DAY, rank: "GOLD", division: "IV", lp: 0, totalLP: 1200, wins: 10, losses: 10 },
    ];
    expect(getDailyLPSeries(history, 30)).toEqual([]);
  });

  it("returns one entry per day, using the LAST snapshot of each day", () => {
    // Two snapshots on the same day — the later one should win
    const sameDay = NOW - 2 * DAY;
    const history: LPSnapshot[] = [
      { timestamp: sameDay, rank: "GOLD", division: "IV", lp: 10, totalLP: 1210, wins: 10, losses: 10 },
      { timestamp: sameDay + 3600_000, rank: "GOLD", division: "IV", lp: 50, totalLP: 1250, wins: 11, losses: 10 },
    ];
    const result = getDailyLPSeries(history, 30);
    expect(result).toHaveLength(1);
    expect(result[0].totalLP).toBe(1250);
  });

  it("returns entries sorted by date ascending", () => {
    const history: LPSnapshot[] = [
      { timestamp: NOW - 3 * DAY, rank: "GOLD", division: "IV", lp: 0, totalLP: 1200, wins: 10, losses: 10 },
      { timestamp: NOW - 1 * DAY, rank: "GOLD", division: "III", lp: 0, totalLP: 1300, wins: 11, losses: 10 },
      { timestamp: NOW - 2 * DAY, rank: "GOLD", division: "IV", lp: 50, totalLP: 1250, wins: 11, losses: 10 },
    ];
    const result = getDailyLPSeries(history, 30);
    expect(result).toHaveLength(3);
    expect(result[0].totalLP).toBe(1200);
    expect(result[1].totalLP).toBe(1250);
    expect(result[2].totalLP).toBe(1300);
  });

  it("respects the 'days' parameter to filter older entries", () => {
    const history: LPSnapshot[] = [
      { timestamp: NOW - 40 * DAY, rank: "GOLD", division: "IV", lp: 0, totalLP: 1200, wins: 10, losses: 10 },
      { timestamp: NOW - 5 * DAY, rank: "GOLD", division: "III", lp: 0, totalLP: 1300, wins: 11, losses: 10 },
    ];
    expect(getDailyLPSeries(history, 30)).toHaveLength(1);
    expect(getDailyLPSeries(history, 30)[0].totalLP).toBe(1300);
  });
});
