import { describe, it, expect } from "vitest";
import { analyzeTilt, type TFunc } from "../tiltAnalysis";
import type { MatchData } from "../analytics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simple passthrough translation function for tests */
const t: TFunc = (key, params) => {
  if (!params) return key;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replace(`{${k}}`, String(v)),
    key,
  );
};

/** Build a minimal MatchData record for a single player */
function makeMatch(overrides: {
  win: boolean;
  kills?: number;
  deaths?: number;
  assists?: number;
  deathTimestamps?: number[];
  gameCreation?: number;
}): MatchData {
  return {
    matchId: "test",
    gameCreation: overrides.gameCreation ?? Date.now(),
    gameDuration: 1800,
    gameMode: "CLASSIC",
    queueId: 420,
    playerParticipantIndex: 0,
    participants: [
      {
        puuid: "player",
        summonerName: "Tester",
        championName: "Jinx",
        teamPosition: "BOTTOM",
        win: overrides.win,
        kills: overrides.kills ?? 5,
        deaths: overrides.deaths ?? 3,
        assists: overrides.assists ?? 5,
        totalMinionsKilled: 150,
        neutralMinionsKilled: 0,
        visionScore: 20,
        wardsPlaced: 5,
        controlWardsPlaced: 2,
        totalDamageDealtToChampions: 20000,
        totalDamageTaken: 15000,
        goldEarned: 12000,
        goldSpent: 11000,
        timePlayed: 1800,
        deathTimestamps: overrides.deathTimestamps ?? [],
        firstBloodKill: false,
        firstBloodAssist: false,
        dragonKills: 0,
        turretKills: 0,
        item0: 0, item1: 0, item2: 0, item3: 0, item4: 0, item5: 0, item6: 3340,
      },
    ],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("analyzeTilt – empty input", () => {
  it("returns focused/score=0 when no matches provided", () => {
    const result = analyzeTilt([], t);
    expect(result.score).toBe(0);
    expect(result.state).toBe("focused");
    expect(result.factors).toHaveLength(0);
  });
});

describe("analyzeTilt – loss streak factor", () => {
  it("adds tilt score for 3+ consecutive losses", () => {
    const matches = [
      makeMatch({ win: false, gameCreation: 1000 }),
      makeMatch({ win: false, gameCreation: 900 }),
      makeMatch({ win: false, gameCreation: 800 }),
    ];
    const result = analyzeTilt(matches, t);
    const streakFactor = result.factors.find(f => f.label.startsWith("tilt.lossStreak"));
    expect(streakFactor).toBeDefined();
    expect(streakFactor?.impact).toBe("negative");
    expect(result.score).toBeGreaterThan(0);
  });

  it("does NOT add streak factor for fewer than 3 consecutive losses", () => {
    const matches = [
      makeMatch({ win: false, gameCreation: 1000 }),
      makeMatch({ win: false, gameCreation: 900 }),
      makeMatch({ win: true, gameCreation: 800 }),
    ];
    const result = analyzeTilt(matches, t);
    const streakFactor = result.factors.find(f => f.label.startsWith("tilt.lossStreak"));
    expect(streakFactor).toBeUndefined();
  });

  it("adds positive factor for 3+ consecutive wins", () => {
    const matches = [
      makeMatch({ win: true, gameCreation: 1000 }),
      makeMatch({ win: true, gameCreation: 900 }),
      makeMatch({ win: true, gameCreation: 800 }),
    ];
    const result = analyzeTilt(matches, t);
    const winFactor = result.factors.find(f => f.label.startsWith("tilt.winStreak"));
    expect(winFactor).toBeDefined();
    expect(winFactor?.impact).toBe("positive");
  });
});

describe("analyzeTilt – deaths factor", () => {
  it("adds high-deaths factor when avg deaths >= 6", () => {
    const matches = Array.from({ length: 5 }, (_, i) =>
      makeMatch({ win: true, deaths: 7, gameCreation: 1000 - i * 100 }),
    );
    const result = analyzeTilt(matches, t);
    const deathFactor = result.factors.find(f => f.label === "tilt.highDeaths");
    expect(deathFactor?.impact).toBe("negative");
  });

  it("adds low-deaths factor when avg deaths <= 3", () => {
    const matches = Array.from({ length: 5 }, (_, i) =>
      makeMatch({ win: true, deaths: 2, gameCreation: 1000 - i * 100 }),
    );
    const result = analyzeTilt(matches, t);
    const deathFactor = result.factors.find(f => f.label === "tilt.lowDeaths");
    expect(deathFactor?.impact).toBe("positive");
  });
});

describe("analyzeTilt – early deaths factor", () => {
  it("adds early-death factor when 5+ early deaths across last 5 games", () => {
    // 2 early deaths per game × 5 games = 10 total
    const matches = Array.from({ length: 5 }, (_, i) =>
      makeMatch({ win: true, deaths: 3, deathTimestamps: [2, 4], gameCreation: 1000 - i * 100 }),
    );
    const result = analyzeTilt(matches, t);
    const earlyFactor = result.factors.find(f => f.label === "tilt.earlyDeaths");
    expect(earlyFactor?.impact).toBe("negative");
  });

  it("does NOT add early-death factor when early deaths < 5", () => {
    const matches = Array.from({ length: 5 }, (_, i) =>
      makeMatch({ win: true, deaths: 3, deathTimestamps: [10, 20], gameCreation: 1000 - i * 100 }),
    );
    const result = analyzeTilt(matches, t);
    const earlyFactor = result.factors.find(f => f.label === "tilt.earlyDeaths");
    expect(earlyFactor).toBeUndefined();
  });
});

describe("analyzeTilt – KDA factor", () => {
  it("adds low-KDA factor when average KDA < 2", () => {
    // 1 kill, 3 deaths, 1 assist → KDA ≈ 0.67
    const matches = Array.from({ length: 5 }, (_, i) =>
      makeMatch({ win: true, kills: 1, deaths: 3, assists: 1, gameCreation: 1000 - i * 100 }),
    );
    const result = analyzeTilt(matches, t);
    const kdaFactor = result.factors.find(f => f.label === "tilt.lowKda");
    expect(kdaFactor?.impact).toBe("negative");
  });

  it("adds high-KDA factor when average KDA >= 4", () => {
    // 10 kills, 1 death, 5 assists → KDA = 15
    const matches = Array.from({ length: 5 }, (_, i) =>
      makeMatch({ win: true, kills: 10, deaths: 1, assists: 5, gameCreation: 1000 - i * 100 }),
    );
    const result = analyzeTilt(matches, t);
    const kdaFactor = result.factors.find(f => f.label === "tilt.highKda");
    expect(kdaFactor?.impact).toBe("positive");
  });
});

describe("analyzeTilt – win rate factor", () => {
  it("adds low win-rate factor when WR < 30% over last 10 games", () => {
    // 2 wins, 8 losses = 20% WR
    const matches = [
      ...Array.from({ length: 2 }, (_, i) => makeMatch({ win: true, gameCreation: 1000 - i * 100 })),
      ...Array.from({ length: 8 }, (_, i) => makeMatch({ win: false, gameCreation: 800 - i * 100 })),
    ];
    const result = analyzeTilt(matches, t);
    const wrFactor = result.factors.find(f => f.label.startsWith("tilt.lowWr"));
    expect(wrFactor?.impact).toBe("negative");
  });

  it("adds high win-rate factor when WR >= 70% over last 10 games", () => {
    // 8 wins, 2 losses = 80% WR
    const matches = [
      ...Array.from({ length: 8 }, (_, i) => makeMatch({ win: true, gameCreation: 1000 - i * 100 })),
      ...Array.from({ length: 2 }, (_, i) => makeMatch({ win: false, gameCreation: 200 - i * 100 })),
    ];
    const result = analyzeTilt(matches, t);
    const wrFactor = result.factors.find(f => f.label.startsWith("tilt.highWr"));
    expect(wrFactor?.impact).toBe("positive");
  });
});

describe("analyzeTilt – mental state thresholds", () => {
  it("returns on-fire state for score <= 15", () => {
    // Perfect scenario: win streak + low deaths + high KDA → score goes negative → clamped to 0
    const matches = [
      ...Array.from({ length: 5 }, (_, i) =>
        makeMatch({ win: true, kills: 10, deaths: 1, assists: 5, gameCreation: 1000 - i * 100 }),
      ),
    ];
    const result = analyzeTilt(matches, t);
    expect(result.state).toBe("on-fire");
    expect(result.score).toBeLessThanOrEqual(15);
  });

  it("returns tilted state for high tilt score", () => {
    // 5-game loss streak + high deaths + poor KDA
    const now = Date.now();
    const matches = [
      makeMatch({ win: false, deaths: 8, kills: 1, assists: 1, deathTimestamps: [2, 3], gameCreation: now }),
      makeMatch({ win: false, deaths: 7, kills: 1, assists: 1, deathTimestamps: [2, 4], gameCreation: now - 60_000 }),
      makeMatch({ win: false, deaths: 8, kills: 0, assists: 2, deathTimestamps: [1, 3], gameCreation: now - 120_000 }),
      makeMatch({ win: false, deaths: 9, kills: 1, assists: 0, deathTimestamps: [2, 4], gameCreation: now - 180_000 }),
      makeMatch({ win: false, deaths: 7, kills: 0, assists: 1, deathTimestamps: [3, 4], gameCreation: now - 240_000 }),
    ];
    const result = analyzeTilt(matches, t);
    expect(result.state).toBe("tilted");
    expect(result.score).toBeGreaterThan(60);
  });

  it("clamps tilt score between 0 and 100", () => {
    // Even with worst-case inputs, score should never exceed 100
    const now = Date.now();
    const matches = Array.from({ length: 10 }, (_, i) =>
      makeMatch({
        win: false,
        deaths: 15,
        kills: 0,
        assists: 0,
        deathTimestamps: [1, 2, 3, 4, 5],
        gameCreation: now - i * 60_000,
      }),
    );
    const result = analyzeTilt(matches, t);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
