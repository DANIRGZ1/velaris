import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { timeAgo, formatK } from "../timeAgo";

// ─── formatK ─────────────────────────────────────────────────────────────────

describe("formatK", () => {
  it("returns plain string for numbers below 1000", () => {
    expect(formatK(0)).toBe("0");
    expect(formatK(999)).toBe("999");
  });

  it("formats thousands with one decimal (e.g. 1.2K)", () => {
    expect(formatK(1000)).toBe("1K");
    expect(formatK(1200)).toBe("1.2K");
    expect(formatK(9999)).toBe("10K"); // rounds to nearest 1K
  });

  it("formats tens of thousands without decimal (e.g. 50K)", () => {
    expect(formatK(10000)).toBe("10K");
    expect(formatK(50000)).toBe("50K");
    expect(formatK(99999)).toBe("100K");
  });

  it("formats millions (e.g. 1.3M)", () => {
    expect(formatK(1_000_000)).toBe("1M");
    expect(formatK(1_300_000)).toBe("1.3M");
    expect(formatK(2_000_000)).toBe("2M");
  });
});

// ─── timeAgo ─────────────────────────────────────────────────────────────────

describe("timeAgo", () => {
  const NOW = 1_700_000_000_000; // fixed reference

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "just now" for timestamps within the last minute (en)', () => {
    expect(timeAgo(NOW - 30_000, "en")).toBe("just now");
    expect(timeAgo(NOW - 59_000, "en")).toBe("just now");
  });

  it("returns minutes ago for timestamps 1–59 minutes old (en)", () => {
    expect(timeAgo(NOW - 60_000, "en")).toBe("1m ago");
    expect(timeAgo(NOW - 5 * 60_000, "en")).toBe("5m ago");
    expect(timeAgo(NOW - 59 * 60_000, "en")).toBe("59m ago");
  });

  it("returns hours ago for timestamps 1–23 hours old (en)", () => {
    expect(timeAgo(NOW - 60 * 60_000, "en")).toBe("1h ago");
    expect(timeAgo(NOW - 3 * 60 * 60_000, "en")).toBe("3h ago");
    expect(timeAgo(NOW - 23 * 60 * 60_000, "en")).toBe("23h ago");
  });

  it('returns "yesterday" for timestamps exactly 1 day old (en)', () => {
    expect(timeAgo(NOW - 24 * 60 * 60_000, "en")).toBe("yesterday");
  });

  it("returns days ago for timestamps 2–6 days old (en)", () => {
    expect(timeAgo(NOW - 2 * 24 * 60 * 60_000, "en")).toBe("2d ago");
    expect(timeAgo(NOW - 6 * 24 * 60 * 60_000, "en")).toBe("6d ago");
  });

  it("returns weeks ago for timestamps 1–4 weeks old (en)", () => {
    expect(timeAgo(NOW - 7 * 24 * 60 * 60_000, "en")).toBe("1w ago");
    expect(timeAgo(NOW - 28 * 24 * 60 * 60_000, "en")).toBe("4w ago");
  });

  it("falls back to locale date string for timestamps older than ~5 weeks", () => {
    const old = NOW - 40 * 24 * 60 * 60_000;
    const result = timeAgo(old, "en");
    // Should be a formatted date, not relative string
    expect(result).not.toMatch(/ago|now|yesterday/);
    expect(result.length).toBeGreaterThan(4);
  });

  it("uses Spanish labels when lang='es'", () => {
    expect(timeAgo(NOW - 30_000, "es")).toBe("ahora");
    expect(timeAgo(NOW - 5 * 60_000, "es")).toBe("hace 5m");
    expect(timeAgo(NOW - 24 * 60 * 60_000, "es")).toBe("ayer");
  });

  it("uses Korean labels when lang='kr'", () => {
    expect(timeAgo(NOW - 30_000, "kr")).toBe("방금");
    expect(timeAgo(NOW - 5 * 60_000, "kr")).toBe("5분 전");
    expect(timeAgo(NOW - 24 * 60 * 60_000, "kr")).toBe("어제");
  });

  it("falls back to English for unknown languages", () => {
    expect(timeAgo(NOW - 30_000, "fr")).toBe("just now");
    expect(timeAgo(NOW - 5 * 60_000, "de")).toBe("5m ago");
  });
});
