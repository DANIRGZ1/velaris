import { MatchData } from "../utils/analytics";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MatchScore {
  total: number; // 0–100
  grade: "S+" | "S" | "A+" | "A" | "B+" | "B" | "C+" | "C" | "D";
  breakdown: {
    kda: number;        // 0–25
    cs: number;         // 0–20
    vision: number;     // 0–15
    kp: number;         // 0–15
    damage: number;     // 0–15
    objectives: number; // 0–10
  };
}

// ─── Role benchmarks ──────────────────────────────────────────────────────────

const ROLE_CS_BENCH: Record<string, number> = {
  TOP: 7.0, JUNGLE: 5.5, MIDDLE: 7.5, BOTTOM: 8.0, UTILITY: 1.0,
};
const ROLE_VISION_BENCH: Record<string, number> = {
  TOP: 0.7, JUNGLE: 0.55, MIDDLE: 0.7, BOTTOM: 0.65, UTILITY: 1.5,
};
// Expected damage share per role (1/5 = 0.20 for carries, less for support)
const ROLE_DMG_EXPECTED: Record<string, number> = {
  TOP: 0.20, JUNGLE: 0.18, MIDDLE: 0.22, BOTTOM: 0.24, UTILITY: 0.10,
};

// ─── Core computation ─────────────────────────────────────────────────────────

export function computeMatchScore(match: MatchData): MatchScore {
  const player = match.participants[match.playerParticipantIndex];
  const durMin = match.gameDuration / 60;
  const role = player.teamPosition || "MIDDLE";

  const teammates = match.participants.filter(p => p.teamId === player.teamId);

  // KDA (0–25): perfect = 5.0 ratio
  const kda = player.deaths === 0
    ? player.kills + player.assists
    : (player.kills + player.assists) / player.deaths;
  const kdaScore = Math.min(25, (kda / 5) * 25);

  // CS/min (0–20): relative to role benchmark
  const totalCs = player.totalMinionsKilled + player.neutralMinionsKilled;
  const csPerMin = totalCs / durMin;
  const csBench = ROLE_CS_BENCH[role] ?? 7.0;
  const csScore = Math.min(20, (csPerMin / csBench) * 20);

  // Vision/min (0–15): relative to role benchmark
  const visionPerMin = player.visionScore / durMin;
  const visionBench = ROLE_VISION_BENCH[role] ?? 0.7;
  const visionScore = Math.min(15, (visionPerMin / visionBench) * 15);

  // Kill participation (0–15): 75% KP = full score
  const teamKills = teammates.reduce((s, p) => s + p.kills, 0);
  const kp = teamKills > 0 ? (player.kills + player.assists) / teamKills : 0;
  const kpScore = Math.min(15, kp * 20);

  // Damage share (0–15): relative to role expected share
  const teamDmg = teammates.reduce((s, p) => s + p.totalDamageDealtToChampions, 0);
  const dmgShare = teamDmg > 0 ? player.totalDamageDealtToChampions / teamDmg : 0;
  const dmgExpected = ROLE_DMG_EXPECTED[role] ?? 0.20;
  const dmgScore = Math.min(15, (dmgShare / dmgExpected) * 12);

  // Objectives (0–10): dragons, turrets, first blood
  const objScore = Math.min(10,
    player.dragonKills * 1.5 +
    player.turretKills * 1.5 +
    (player.firstBloodKill ? 3 : 0) +
    (player.firstBloodAssist ? 1 : 0),
  );

  const total = Math.round(Math.min(100, kdaScore + csScore + visionScore + kpScore + dmgScore + objScore));

  const grade: MatchScore["grade"] =
    total >= 90 ? "S+" :
    total >= 80 ? "S"  :
    total >= 70 ? "A+" :
    total >= 62 ? "A"  :
    total >= 54 ? "B+" :
    total >= 46 ? "B"  :
    total >= 38 ? "C+" :
    total >= 30 ? "C"  : "D";

  return {
    total,
    grade,
    breakdown: {
      kda:        Math.round(kdaScore),
      cs:         Math.round(csScore),
      vision:     Math.round(visionScore),
      kp:         Math.round(kpScore),
      damage:     Math.round(dmgScore),
      objectives: Math.round(objScore),
    },
  };
}

// ─── Styling helpers ──────────────────────────────────────────────────────────

export function gradeColor(grade: MatchScore["grade"]): string {
  if (grade === "S+" || grade === "S")   return "text-amber-400";
  if (grade === "A+" || grade === "A")   return "text-emerald-400";
  if (grade === "B+" || grade === "B")   return "text-sky-400";
  if (grade === "C+" || grade === "C")   return "text-muted-foreground";
  return "text-destructive/70";
}

export function gradeBg(grade: MatchScore["grade"]): string {
  if (grade === "S+" || grade === "S")   return "bg-amber-500/15 border-amber-500/30";
  if (grade === "A+" || grade === "A")   return "bg-emerald-500/15 border-emerald-500/30";
  if (grade === "B+" || grade === "B")   return "bg-sky-500/15 border-sky-500/30";
  if (grade === "C+" || grade === "C")   return "bg-muted/50 border-border";
  return "bg-destructive/10 border-destructive/20";
}
