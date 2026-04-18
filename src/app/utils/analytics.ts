/**
 * Analytics Engine - Velaris
 * 
 * Computes real insights from match history data.
 * Data structures mirror Riot's Match-V5 API responses.
 * In production (Tauri), this data comes from the LCU API / Match History endpoint.
 * For now, we use realistic mock data that follows the exact same schema.
 */

// ─── Types (mirrors Riot Match-V5 API) ───────────────────────────────────────

export interface MatchParticipant {
  puuid: string;
  summonerName: string;
  championName: string;
  teamId?: number; // 100 = blue side, 200 = red side (from LCU)
  teamPosition: "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY";
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;  // CS from minions
  neutralMinionsKilled: number; // CS from jungle
  visionScore: number;
  wardsPlaced: number;
  controlWardsPlaced: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  goldEarned: number;
  goldSpent: number;
  timePlayed: number; // seconds
  // Death timing data (from timeline API)
  deathTimestamps: number[]; // minutes when deaths occurred
  firstBloodKill: boolean;
  firstBloodAssist: boolean;
  dragonKills: number;
  turretKills: number;
  // Item build
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  // Runes
  perk0?: number; // Keystone
  perk1?: number;
  perk2?: number;
  perk3?: number;
  perk4?: number;
  perk5?: number;
  perkPrimaryStyle?: number; // e.g. 8100 = Domination
  perkSubStyle?: number;     // e.g. 8300 = Inspiration
  // Summoner spells
  spell1Id?: number;
  spell2Id?: number;
  // Extra
  champLevel?: number;
  // Multikill stats (from Riot Match-V5 / LCU stats)
  pentaKills?: number;
  quadraKills?: number;
  tripleKills?: number;
  doubleKills?: number;
  largestMultiKill?: number;
  largestKillingSpree?: number;
}

export interface MatchData {
  matchId: string;
  gameCreation: number; // timestamp
  gameDuration: number; // seconds
  gameMode: string;
  queueId: number; // 420 = SoloQ, 440 = Flex
  participants: MatchParticipant[];
  // We track which participant index is "you"
  playerParticipantIndex: number;
}

export interface RankBenchmark {
  tier: string;
  avgCsPerMin: number;
  avgKda: number;
  avgVisionPerMin: number;
  avgDeathsPerGame: number;
  avgDamageShare: number; // percentage
}

// ─── Rank Benchmarks (from community aggregated data) ─────────────────────────

export const RANK_BENCHMARKS: Record<string, RankBenchmark> = {
  "IRON":     { tier: "Iron",     avgCsPerMin: 4.2, avgKda: 1.8, avgVisionPerMin: 0.4, avgDeathsPerGame: 7.5, avgDamageShare: 20 },
  "BRONZE":   { tier: "Bronze",   avgCsPerMin: 5.0, avgKda: 2.2, avgVisionPerMin: 0.5, avgDeathsPerGame: 6.8, avgDamageShare: 20 },
  "SILVER":   { tier: "Silver",   avgCsPerMin: 5.8, avgKda: 2.6, avgVisionPerMin: 0.6, avgDeathsPerGame: 6.2, avgDamageShare: 20 },
  "GOLD":     { tier: "Gold",     avgCsPerMin: 6.5, avgKda: 2.9, avgVisionPerMin: 0.7, avgDeathsPerGame: 5.8, avgDamageShare: 20 },
  "PLATINUM": { tier: "Platinum", avgCsPerMin: 7.0, avgKda: 3.2, avgVisionPerMin: 0.8, avgDeathsPerGame: 5.5, avgDamageShare: 20 },
  "EMERALD":  { tier: "Emerald",  avgCsPerMin: 7.4, avgKda: 3.5, avgVisionPerMin: 0.9, avgDeathsPerGame: 5.2, avgDamageShare: 20 },
  "DIAMOND":  { tier: "Diamond",  avgCsPerMin: 7.8, avgKda: 3.8, avgVisionPerMin: 1.0, avgDeathsPerGame: 4.8, avgDamageShare: 20 },
  "MASTER":   { tier: "Master",   avgCsPerMin: 8.2, avgKda: 4.0, avgVisionPerMin: 1.1, avgDeathsPerGame: 4.5, avgDamageShare: 20 },
};

// ─── Mock Match History (20 games, structured like Riot API) ──────────────────

const PLAYER_PUUID = "mock-puuid-fakerfan99";

function createMatch(
  id: string,
  daysAgo: number,
  duration: number,
  playerData: Partial<MatchParticipant>,
  teamWin: boolean,
  enemies?: string[],
  allies?: string[]
): MatchData {
  const gameCreation = Date.now() - daysAgo * 86400000 - Math.random() * 43200000;
  const player: MatchParticipant = {
    puuid: PLAYER_PUUID,
    summonerName: "FakerFan99",
    championName: playerData.championName || "Jinx",
    teamId: 100,
    teamPosition: playerData.teamPosition || "BOTTOM",
    win: teamWin,
    kills: playerData.kills ?? 6,
    deaths: playerData.deaths ?? 4,
    assists: playerData.assists ?? 8,
    totalMinionsKilled: playerData.totalMinionsKilled ?? Math.floor(duration / 60 * 7.5),
    neutralMinionsKilled: playerData.neutralMinionsKilled ?? 12,
    visionScore: playerData.visionScore ?? Math.floor(duration / 60 * 0.9),
    wardsPlaced: playerData.wardsPlaced ?? Math.floor(duration / 60 * 0.6),
    controlWardsPlaced: playerData.controlWardsPlaced ?? 2,
    totalDamageDealtToChampions: playerData.totalDamageDealtToChampions ?? 22000,
    totalDamageTaken: playerData.totalDamageTaken ?? 15000,
    goldEarned: playerData.goldEarned ?? 12500,
    goldSpent: playerData.goldSpent ?? 11800,
    timePlayed: duration,
    deathTimestamps: playerData.deathTimestamps ?? [8, 14, 22, 30],
    firstBloodKill: playerData.firstBloodKill ?? false,
    firstBloodAssist: playerData.firstBloodAssist ?? false,
    dragonKills: playerData.dragonKills ?? 0,
    turretKills: playerData.turretKills ?? 1,
    item0: playerData.item0 ?? 0, item1: playerData.item1 ?? 0, item2: playerData.item2 ?? 0,
    item3: playerData.item3 ?? 0, item4: playerData.item4 ?? 0, item5: playerData.item5 ?? 0,
    item6: playerData.item6 ?? 0,
    // Runes
    perk0: playerData.perk0, perk1: playerData.perk1, perk2: playerData.perk2, perk3: playerData.perk3,
    perk4: playerData.perk4, perk5: playerData.perk5,
    perkPrimaryStyle: playerData.perkPrimaryStyle, perkSubStyle: playerData.perkSubStyle,
    // Summoner spells
    spell1Id: playerData.spell1Id ?? 4, spell2Id: playerData.spell2Id ?? 7,
    champLevel: playerData.champLevel ?? Math.min(18, Math.floor(duration / 60 * 0.8) + 3),
    // Multikill stats
    pentaKills: playerData.pentaKills ?? 0,
    quadraKills: playerData.quadraKills ?? 0,
    tripleKills: playerData.tripleKills ?? 0,
    doubleKills: playerData.doubleKills ?? 0,
    largestMultiKill: playerData.largestMultiKill ?? 0,
    largestKillingSpree: playerData.largestKillingSpree ?? 0,
  };

  // Generate 9 other participants with varying stats
  const otherParticipants: MatchParticipant[] = [];
  const roles: MatchParticipant["teamPosition"][] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
  const allyRoles = roles.filter(r => r !== player.teamPosition);
  const defaultAllies = ["Aatrox", "LeeSin", "Ahri", "Nautilus"];
  const defaultEnemies = ["Malphite", "JarvanIV", "Syndra", "Jhin", "Lulu"];
  const allyChamps = allies ?? defaultAllies;
  const enemyChamps = enemies ?? defaultEnemies;

  for (let i = 0; i < 9; i++) {
    const isAlly = i < 4;
    const role = isAlly ? allyRoles[i] : roles[i - 4];
    const wins = isAlly ? teamWin : !teamWin;
    const champName = isAlly
      ? (allyChamps[i] ?? "Garen")
      : (enemyChamps[i - 4] ?? "Garen");
    otherParticipants.push({
      puuid: `mock-puuid-other-${id}-${i}`,
      summonerName: `Player${i + 1}`,
      championName: champName,
      teamId: isAlly ? 100 : 200,
      teamPosition: role,
      win: wins,
      kills: Math.floor(Math.random() * 10) + 1,
      deaths: Math.floor(Math.random() * 8) + 1,
      assists: Math.floor(Math.random() * 12),
      totalMinionsKilled: Math.floor(duration / 60 * (5 + Math.random() * 3)),
      neutralMinionsKilled: role === "JUNGLE" ? Math.floor(duration / 60 * 4) : Math.floor(Math.random() * 15),
      visionScore: Math.floor(duration / 60 * (0.5 + Math.random() * 0.8)),
      wardsPlaced: Math.floor(Math.random() * 15) + 3,
      controlWardsPlaced: Math.floor(Math.random() * 4),
      totalDamageDealtToChampions: Math.floor(12000 + Math.random() * 20000),
      totalDamageTaken: Math.floor(10000 + Math.random() * 18000),
      goldEarned: Math.floor(8000 + Math.random() * 7000),
      goldSpent: Math.floor(7000 + Math.random() * 6000),
      timePlayed: duration,
      deathTimestamps: Array.from({ length: Math.floor(Math.random() * 6) + 1 }, () => Math.floor(Math.random() * (duration / 60))),
      firstBloodKill: false,
      firstBloodAssist: false,
      dragonKills: 0,
      turretKills: Math.floor(Math.random() * 2),
      item0: 0, item1: 0, item2: 0, item3: 0, item4: 0, item5: 0, item6: 0,
    });
  }

  return {
    matchId: `LA1_${id}`,
    gameCreation,
    gameDuration: duration,
    gameMode: "CLASSIC",
    queueId: 420,
    participants: [player, ...otherParticipants],
    playerParticipantIndex: 0,
  };
}

// 20 realistic games with intentional patterns:
// - CS/min improving over time (6.2 -> 8.7+)
// - Vision score low but improving slightly
// - Deaths concentrated between min 3-5 (ganks)
// - Higher winrate when playing aggressively early (firstBlood)
// - Best role is MID, worst is SUP
export const MATCH_HISTORY: MatchData[] = [
  // Oldest games first (20 days ago -> today)
  // Jinx ADC: Lethal Tempo + Inspiration
  createMatch("001", 20, 1920, { championName: "Jinx", kills: 4, deaths: 6, assists: 5, totalMinionsKilled: 178, visionScore: 14, deathTimestamps: [3.2, 4.1, 12, 18, 25, 29], controlWardsPlaced: 0, totalDamageDealtToChampions: 15200, teamPosition: "BOTTOM", perk0: 8008, perk1: 9111, perk2: 9104, perk3: 8014, perk4: 8345, perk5: 8347, perkPrimaryStyle: 8000, perkSubStyle: 8300, spell1Id: 4, spell2Id: 7, item0: 3031, item1: 3094, item2: 3085, item3: 0, item4: 0, item5: 0, item6: 3340 }, false,
    ["Draven", "Taric", "Fiora", "Hecarim", "Orianna"], ["Ashe", "Thresh", "Camille", "LeeSin"]),
  createMatch("002", 19, 2100, { championName: "Jinx", kills: 8, deaths: 3, assists: 10, totalMinionsKilled: 215, visionScore: 18, deathTimestamps: [3.5, 14, 28], firstBloodKill: true, controlWardsPlaced: 1, totalDamageDealtToChampions: 24500, teamPosition: "BOTTOM", perk0: 8008, perk1: 9111, perk2: 9104, perk3: 8014, perk4: 8345, perk5: 8347, perkPrimaryStyle: 8000, perkSubStyle: 8300, spell1Id: 4, spell2Id: 7, item0: 3031, item1: 3094, item2: 3085, item3: 3036, item4: 0, item5: 0, item6: 3340 }, true,
    ["MissFortune", "Thresh", "Darius", "Nocturne", "Viktor"], ["Ahri", "Nautilus", "Malphite", "Viego"]),
  // Ahri MID: Electrocute + Sorcery
  createMatch("003", 18, 1680, { championName: "Ahri", kills: 5, deaths: 5, assists: 7, totalMinionsKilled: 155, visionScore: 12, deathTimestamps: [4.2, 8, 15, 20, 26], controlWardsPlaced: 1, totalDamageDealtToChampions: 18000, teamPosition: "MIDDLE", perk0: 8112, perk1: 8139, perk2: 8138, perk3: 8135, perk4: 8210, perk5: 8237, perkPrimaryStyle: 8100, perkSubStyle: 8200, spell1Id: 4, spell2Id: 14, item0: 6655, item1: 3165, item2: 0, item3: 0, item4: 0, item5: 0, item6: 3340 }, false,
    ["Zed", "Blitzcrank", "Garen", "Vi", "Caitlyn"], ["Jinx", "Lulu", "Aatrox", "LeeSin"]),
  createMatch("004", 17, 2280, { championName: "Jinx", kills: 12, deaths: 2, assists: 8, totalMinionsKilled: 275, visionScore: 22, deathTimestamps: [14, 30], firstBloodKill: true, controlWardsPlaced: 1, totalDamageDealtToChampions: 31200, teamPosition: "BOTTOM", perk0: 8008, perk1: 9111, perk2: 9104, perk3: 8014, perk4: 8345, perk5: 8347, perkPrimaryStyle: 8000, perkSubStyle: 8300, spell1Id: 4, spell2Id: 7, item0: 3031, item1: 3094, item2: 3085, item3: 3036, item4: 3072, item5: 0, item6: 3340, quadraKills: 1, tripleKills: 1, largestMultiKill: 4, largestKillingSpree: 8 }, true,
    ["Caitlyn", "Lux", "Camille", "Khazix", "Cassiopeia"], ["Senna", "Thresh", "Malphite", "Nidalee"]),
  // Ashe ADC: Lethal Tempo + Resolve
  createMatch("005", 16, 1800, { championName: "Ashe", kills: 4, deaths: 1, assists: 15, totalMinionsKilled: 195, visionScore: 24, deathTimestamps: [22], controlWardsPlaced: 3, totalDamageDealtToChampions: 16800, teamPosition: "BOTTOM", perk0: 8008, perk1: 8009, perk2: 9104, perk3: 8017, perk4: 8473, perk5: 8451, perkPrimaryStyle: 8000, perkSubStyle: 8400, spell1Id: 4, spell2Id: 7, item0: 6672, item1: 3085, item2: 3153, item3: 0, item4: 0, item5: 0, item6: 3340 }, true,
    ["Ezreal", "Blitzcrank", "Renekton", "JarvanIV", "Akali"], ["Jinx", "Nami", "Darius", "LeeSin"]),
  createMatch("006", 14, 2040, { championName: "Ahri", kills: 9, deaths: 3, assists: 6, totalMinionsKilled: 218, visionScore: 16, deathTimestamps: [3.8, 15, 28], firstBloodKill: true, controlWardsPlaced: 1, totalDamageDealtToChampions: 26500, teamPosition: "MIDDLE", perk0: 8112, perk1: 8139, perk2: 8138, perk3: 8135, perk4: 8210, perk5: 8237, perkPrimaryStyle: 8100, perkSubStyle: 8200, spell1Id: 4, spell2Id: 14, item0: 6655, item1: 3165, item2: 3089, item3: 0, item4: 0, item5: 0, item6: 3340 }, true,
    ["Syndra", "Malzahar", "Garen", "Hecarim", "Jinx"], ["Tristana", "Nautilus", "Sion", "Viego"]),
  createMatch("007", 13, 1560, { championName: "Jinx", kills: 3, deaths: 7, assists: 4, totalMinionsKilled: 142, visionScore: 10, deathTimestamps: [3.1, 4.5, 8, 12, 16, 20, 24], controlWardsPlaced: 0, totalDamageDealtToChampions: 12500, teamPosition: "BOTTOM", perk0: 8008, perk1: 9111, perk2: 9104, perk3: 8014, perk4: 8345, perk5: 8347, perkPrimaryStyle: 8000, perkSubStyle: 8300, spell1Id: 4, spell2Id: 7, item0: 3031, item1: 3094, item2: 0, item3: 0, item4: 0, item5: 0, item6: 3340 }, false,
    ["Draven", "Nautilus", "Riven", "Shaco", "Zoe"], ["Ashe", "Soraka", "Malphite", "Amumu"]),
  // Tristana ADC: Lethal Tempo + Domination
  createMatch("008", 12, 2160, { championName: "Tristana", kills: 10, deaths: 4, assists: 7, totalMinionsKilled: 248, visionScore: 20, deathTimestamps: [6, 18, 24, 32], firstBloodKill: true, controlWardsPlaced: 2, totalDamageDealtToChampions: 28000, teamPosition: "BOTTOM", perk0: 8008, perk1: 9111, perk2: 9104, perk3: 8014, perk4: 8139, perk5: 8135, perkPrimaryStyle: 8000, perkSubStyle: 8100, spell1Id: 4, spell2Id: 7, item0: 3031, item1: 3094, item2: 6672, item3: 3036, item4: 0, item5: 0, item6: 3340 }, true,
    ["Vayne", "Morgana", "Malphite", "Amumu", "TwistedFate"], ["Ahri", "Thresh", "Aatrox", "JarvanIV"]),
  createMatch("009", 11, 1740, { championName: "Ahri", kills: 7, deaths: 2, assists: 11, totalMinionsKilled: 185, visionScore: 18, deathTimestamps: [12, 25], controlWardsPlaced: 2, totalDamageDealtToChampions: 22000, teamPosition: "MIDDLE", perk0: 8112, perk1: 8139, perk2: 8138, perk3: 8135, perk4: 8210, perk5: 8237, perkPrimaryStyle: 8100, perkSubStyle: 8200, spell1Id: 4, spell2Id: 14, item0: 6655, item1: 3165, item2: 3089, item3: 0, item4: 0, item5: 0, item6: 3340 }, true,
    ["Talon", "Diana", "Kennen", "Nidalee", "Senna"], ["Jinx", "Blitzcrank", "Garen", "LeeSin"]),
  createMatch("010", 10, 1980, { championName: "Jinx", kills: 6, deaths: 5, assists: 9, totalMinionsKilled: 228, visionScore: 16, deathTimestamps: [3.3, 4.0, 15, 22, 28], controlWardsPlaced: 1, totalDamageDealtToChampions: 23500, teamPosition: "BOTTOM", perk0: 8008, perk1: 9111, perk2: 9104, perk3: 8014, perk4: 8345, perk5: 8347, perkPrimaryStyle: 8000, perkSubStyle: 8300, spell1Id: 4, spell2Id: 7, item0: 3031, item1: 3094, item2: 3085, item3: 0, item4: 0, item5: 0, item6: 3340 }, true,
    ["Sivir", "Soraka", "Irelia", "Sejuani", "Yasuo"], ["Tristana", "Lux", "Malphite", "Viego"]),
  // Lulu SUP: Summon Aery + Resolve
  createMatch("011", 9, 2100, { championName: "Lulu", kills: 1, deaths: 6, assists: 14, totalMinionsKilled: 32, visionScore: 38, deathTimestamps: [5, 10, 16, 22, 28, 33], controlWardsPlaced: 5, totalDamageDealtToChampions: 5200, teamPosition: "UTILITY", perk0: 8214, perk1: 8226, perk2: 8210, perk3: 8237, perk4: 8463, perk5: 8453, perkPrimaryStyle: 8200, perkSubStyle: 8400, spell1Id: 4, spell2Id: 3, item0: 3504, item1: 3011, item2: 0, item3: 0, item4: 0, item5: 0, item6: 3340 }, false,
    ["Zyra", "Graves", "Tryndamere", "Rengar", "Katarina"], ["Jinx", "Aatrox", "LeeSin", "Orianna"]),
  createMatch("012", 8, 1860, { championName: "Ahri", kills: 11, deaths: 1, assists: 8, totalMinionsKilled: 210, visionScore: 20, deathTimestamps: [26], firstBloodKill: true, controlWardsPlaced: 2, totalDamageDealtToChampions: 29800, teamPosition: "MIDDLE", perk0: 8112, perk1: 8139, perk2: 8138, perk3: 8135, perk4: 8210, perk5: 8237, perkPrimaryStyle: 8100, perkSubStyle: 8200, spell1Id: 4, spell2Id: 14, item0: 6655, item1: 3165, item2: 3089, item3: 3135, item4: 0, item5: 0, item6: 3340, tripleKills: 2, largestMultiKill: 3, largestKillingSpree: 9 }, true,
    ["Zoe", "Kayn", "Nasus", "Samira", "Shen"], ["Jinx", "Nautilus", "Camille", "Hecarim"]),
  createMatch("013", 7, 2040, { championName: "Jinx", kills: 8, deaths: 3, assists: 12, totalMinionsKilled: 252, visionScore: 22, deathTimestamps: [8, 18, 30], controlWardsPlaced: 2, totalDamageDealtToChampions: 27500, teamPosition: "BOTTOM", perk0: 8008, perk1: 9111, perk2: 9104, perk3: 8014, perk4: 8345, perk5: 8347, perkPrimaryStyle: 8000, perkSubStyle: 8300, spell1Id: 4, spell2Id: 7, item0: 3031, item1: 3094, item2: 3085, item3: 3036, item4: 0, item5: 0, item6: 3340 }, true,
    ["Xayah", "Rakan", "Darius", "LeeSin", "Vex"], ["Ahri", "Thresh", "Malphite", "JarvanIV"]),
  // Aatrox TOP: Conqueror + Resolve
  createMatch("014", 6, 1620, { championName: "Aatrox", kills: 5, deaths: 4, assists: 3, totalMinionsKilled: 172, visionScore: 12, deathTimestamps: [6, 14, 20, 25], controlWardsPlaced: 1, totalDamageDealtToChampions: 18500, teamPosition: "TOP", perk0: 8010, perk1: 9111, perk2: 9105, perk3: 8299, perk4: 8444, perk5: 8242, perkPrimaryStyle: 8000, perkSubStyle: 8400, spell1Id: 4, spell2Id: 12, item0: 6693, item1: 3071, item2: 0, item3: 0, item4: 0, item5: 0, item6: 3340 }, true,
    ["Garen", "Maokai", "Jhin", "Rammus", "Lux"], ["Jinx", "Soraka", "Camille", "Viego"]),
  createMatch("015", 5, 2220, { championName: "Ahri", kills: 6, deaths: 4, assists: 9, totalMinionsKilled: 235, visionScore: 24, deathTimestamps: [3.5, 10, 22, 35], controlWardsPlaced: 2, totalDamageDealtToChampions: 24000, teamPosition: "MIDDLE", perk0: 8112, perk1: 8139, perk2: 8138, perk3: 8135, perk4: 8210, perk5: 8237, perkPrimaryStyle: 8100, perkSubStyle: 8200, spell1Id: 4, spell2Id: 14, item0: 6655, item1: 3165, item2: 3089, item3: 3135, item4: 0, item5: 0, item6: 3340 }, true,
    ["Viktor", "Shen", "KogMaw", "Volibear", "Braum"], ["Tristana", "Nautilus", "Malphite", "Khazix"]),
  createMatch("016", 4, 1920, { championName: "Jinx", kills: 14, deaths: 2, assists: 6, totalMinionsKilled: 260, visionScore: 20, deathTimestamps: [14, 28], firstBloodKill: true, controlWardsPlaced: 2, totalDamageDealtToChampions: 34500, teamPosition: "BOTTOM", perk0: 8008, perk1: 9111, perk2: 9104, perk3: 8014, perk4: 8345, perk5: 8347, perkPrimaryStyle: 8000, perkSubStyle: 8300, spell1Id: 4, spell2Id: 7, item0: 3031, item1: 3094, item2: 3085, item3: 3036, item4: 3072, item5: 3153, item6: 3340, pentaKills: 1, quadraKills: 1, tripleKills: 1, largestMultiKill: 5, largestKillingSpree: 12 }, true,
    ["Lucian", "Nami", "Chogath", "Viego", "Cassiopeia"], ["Ashe", "Thresh", "Garen", "JarvanIV"]),
  createMatch("017", 3, 1740, { championName: "Tristana", kills: 7, deaths: 5, assists: 8, totalMinionsKilled: 218, visionScore: 18, deathTimestamps: [3.8, 4.2, 12, 20, 28], controlWardsPlaced: 1, totalDamageDealtToChampions: 22000, teamPosition: "BOTTOM", perk0: 8008, perk1: 9111, perk2: 9104, perk3: 8014, perk4: 8139, perk5: 8135, perkPrimaryStyle: 8000, perkSubStyle: 8100, spell1Id: 4, spell2Id: 7, item0: 3031, item1: 3094, item2: 6672, item3: 0, item4: 0, item5: 0, item6: 3340 }, false,
    ["Jinx", "Leona", "Sion", "Graves", "Diana"], ["Ahri", "Nautilus", "Aatrox", "Hecarim"]),
  createMatch("018", 2, 2100, { championName: "Ahri", kills: 9, deaths: 2, assists: 10, totalMinionsKilled: 242, visionScore: 26, deathTimestamps: [15, 30], firstBloodKill: true, controlWardsPlaced: 3, totalDamageDealtToChampions: 28500, teamPosition: "MIDDLE", perk0: 8112, perk1: 8139, perk2: 8138, perk3: 8135, perk4: 8210, perk5: 8237, perkPrimaryStyle: 8100, perkSubStyle: 8200, spell1Id: 4, spell2Id: 14, item0: 6655, item1: 3165, item2: 3089, item3: 3135, item4: 3116, item5: 0, item6: 3340 }, true,
    ["Orianna", "Rengar", "Fiora", "Draven", "Thresh"], ["Jinx", "Lulu", "Malphite", "Khazix"]),
  createMatch("019", 1, 1860, { championName: "Jinx", kills: 11, deaths: 3, assists: 7, totalMinionsKilled: 245, visionScore: 22, deathTimestamps: [4.1, 18, 28], firstBloodKill: true, controlWardsPlaced: 2, totalDamageDealtToChampions: 30200, teamPosition: "BOTTOM", perk0: 8008, perk1: 9111, perk2: 9104, perk3: 8014, perk4: 8345, perk5: 8347, perkPrimaryStyle: 8000, perkSubStyle: 8300, spell1Id: 4, spell2Id: 7, item0: 3031, item1: 3094, item2: 3085, item3: 3036, item4: 3072, item5: 0, item6: 3340 }, true,
    ["Samira", "Janna", "Akali", "Ekko", "Malphite"], ["Ashe", "Thresh", "Darius", "JarvanIV"]),
  createMatch("020", 0, 2052, { championName: "Jinx", kills: 12, deaths: 2, assists: 8, totalMinionsKilled: 268, visionScore: 24, deathTimestamps: [14, 30], firstBloodKill: true, controlWardsPlaced: 3, totalDamageDealtToChampions: 32800, teamPosition: "BOTTOM", perk0: 8008, perk1: 9111, perk2: 9104, perk3: 8014, perk4: 8345, perk5: 8347, perkPrimaryStyle: 8000, perkSubStyle: 8300, spell1Id: 4, spell2Id: 7, item0: 3031, item1: 3094, item2: 3085, item3: 3036, item4: 3072, item5: 3153, item6: 3340 }, true,
    ["Draven", "Lulu", "Riven", "Kindred", "Ziggs"], ["Ahri", "Nautilus", "Camille", "Viego"]),
];

// ─── Computed Insight Types ───────────────────────────────────────────────────

export interface ComputedMetric {
  value: string;
  label: string;
  trend: "up" | "down" | "neutral";
  trendLabel: string;
  severity: "good" | "warning" | "neutral";
  icon: "swords" | "eye" | "target";
}

export interface ComputedInsight {
  title: string;
  description: string;
  severity: "good" | "warning" | "danger";
  icon: "clock" | "crosshair" | "trending-down" | "eye" | "shield" | "zap" | "target";
  // Source data that generated this insight
  source: string;
}

export interface PlaystylePoint {
  subject: string;
  value: number;
  fullMark: number;
}

export interface RoleWinrate {
  role: string;
  winrate: number;
  games: number;
}

export interface DashboardData {
  greeting: string;
  narrative: string;
  narrativeHighlights: { text: string; bold: boolean }[];
  metrics: ComputedMetric[];
  csmTrend: { game: number; csm: number }[];
  csmAverage: number;
  playstyle: PlaystylePoint[];
  roleWinrates: RoleWinrate[];
  insights: ComputedInsight[];
  matchCount: number;
}

// ─── Analytics Engine ─────────────────────────────────────────────────────────

function getPlayerData(match: MatchData): MatchParticipant {
  return match.participants[match.playerParticipantIndex];
}

function getTeamDamage(match: MatchData, isAlly: boolean): number {
  const player = getPlayerData(match);
  return match.participants
    .filter(p => p.win === (isAlly ? player.win : !player.win))
    .reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0);
}

function getTeamGold(match: MatchData): number {
  const player = getPlayerData(match);
  return match.participants
    .filter(p => p.win === player.win)
    .reduce((sum, p) => sum + p.goldEarned, 0);
}

// Ranked queue IDs: 420 = Solo/Duo, 440 = Flex
export const RANKED_QUEUE_IDS = new Set([420, 440]);

export function computeDashboardData(matches: MatchData[], playerRank: string = "EMERALD", summonerName: string = "Summoner"): DashboardData {
  // Only compute stats from ranked games (SoloQ + Flex)
  const rankedMatches = matches.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
  matches = rankedMatches.length > 0 ? rankedMatches : matches; // fall back to all if none ranked (e.g. mock data)
  const benchmark = RANK_BENCHMARKS[playerRank] || RANK_BENCHMARKS["EMERALD"];
  const playerGames = matches.map(m => ({ match: m, player: getPlayerData(m) }));
  
  // ── CS/min trend ──
  const csmTrend = playerGames.map((g, i) => {
    const durationMin = g.match.gameDuration / 60;
    const totalCs = g.player.totalMinionsKilled + g.player.neutralMinionsKilled;
    return { game: i + 1, csm: parseFloat((totalCs / durationMin).toFixed(1)) };
  });
  
  const csmValues = csmTrend.map(d => d.csm);
  const csmAverage = parseFloat((csmValues.reduce((a, b) => a + b, 0) / csmValues.length).toFixed(1));
  const csmFirst10 = csmValues.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
  const csmLast10 = csmValues.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const csmImprovement = ((csmLast10 - csmFirst10) / csmFirst10 * 100).toFixed(0);
  
  // ── Vision analysis ──
  const visionPerMin = playerGames.map(g => g.player.visionScore / (g.match.gameDuration / 60));
  const avgVision = visionPerMin.reduce((a, b) => a + b, 0) / visionPerMin.length;
  const visionFirst10 = visionPerMin.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
  const visionLast10 = visionPerMin.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const visionImprovement = ((visionLast10 - visionFirst10) / visionFirst10 * 100).toFixed(0);
  const visionVsBenchmark = avgVision / benchmark.avgVisionPerMin;
  
  // ── Death timing patterns ──
  const allDeathTimings = playerGames.flatMap(g => g.player.deathTimestamps);
  const earlyDeaths = allDeathTimings.filter(t => t >= 2.5 && t <= 5).length;
  const totalDeaths = allDeathTimings.length;
  const earlyDeathPct = totalDeaths > 0 ? Math.round(earlyDeaths / totalDeaths * 100) : 0;
  
  // Find the most dangerous minute window
  const deathBuckets: Record<string, number> = {};
  allDeathTimings.forEach(t => {
    const bucket = `${Math.floor(t)}:00-${Math.floor(t) + 1}:30`;
    deathBuckets[bucket] = (deathBuckets[bucket] || 0) + 1;
  });
  const dangerousWindow = Object.entries(deathBuckets).sort((a, b) => b[1] - a[1])[0];
  
  // ── Aggression / First Blood winrate ──
  const aggressiveGames = playerGames.filter(g => g.player.firstBloodKill || g.player.firstBloodAssist);
  const aggressiveWinrate = aggressiveGames.length > 0 
    ? Math.round(aggressiveGames.filter(g => g.player.win).length / aggressiveGames.length * 100) 
    : 0;
  const aggressiveWinrateVsTotal = Math.round(playerGames.filter(g => g.player.win).length / playerGames.length * 100);
  
  // ── Damage efficiency ──
  const damageShares = playerGames.map(g => {
    const teamDmg = getTeamDamage(g.match, true);
    return teamDmg > 0 ? (g.player.totalDamageDealtToChampions / teamDmg) * 100 : 0;
  });
  const avgDamageShare = Math.round(damageShares.reduce((a, b) => a + b, 0) / damageShares.length);
  
  const goldShares = playerGames.map(g => {
    const teamGold = getTeamGold(g.match);
    return teamGold > 0 ? (g.player.goldEarned / teamGold) * 100 : 0;
  });
  const avgGoldShare = Math.round(goldShares.reduce((a, b) => a + b, 0) / goldShares.length);
  
  // ── Control wards before dragon ──
  const lowControlWardGames = playerGames.filter(g => g.player.controlWardsPlaced <= 1).length;
  const lowControlWardPct = Math.round(lowControlWardGames / playerGames.length * 100);
  
  // ── Role performance ──
  const roleMap: Record<string, { wins: number; total: number }> = {};
  playerGames.forEach(g => {
    const role = g.player.teamPosition;
    const displayRole = role === "MIDDLE" ? "MID" : role === "BOTTOM" ? "ADC" : role === "JUNGLE" ? "JGL" : role === "UTILITY" ? "SUP" : "TOP";
    if (!roleMap[displayRole]) roleMap[displayRole] = { wins: 0, total: 0 };
    roleMap[displayRole].total++;
    if (g.player.win) roleMap[displayRole].wins++;
  });
  
  const roleOrder = ["TOP", "JGL", "MID", "ADC", "SUP"];
  const roleWinrates: RoleWinrate[] = roleOrder.map(role => ({
    role,
    winrate: roleMap[role] ? Math.round(roleMap[role].wins / roleMap[role].total * 100) : 0,
    games: roleMap[role]?.total || 0,
  }));
  
  // ── Playstyle radar (computed from actual metrics) ──
  // Aggression: based on kills + first bloods relative to benchmark
  const avgKills = playerGames.reduce((s, g) => s + g.player.kills, 0) / playerGames.length;
  const avgDeaths = playerGames.reduce((s, g) => s + g.player.deaths, 0) / playerGames.length;
  const avgAssists = playerGames.reduce((s, g) => s + g.player.assists, 0) / playerGames.length;
  const kda = avgDeaths > 0 ? (avgKills + avgAssists) / avgDeaths : avgKills + avgAssists;
  
  const aggressionScore = Math.min(100, Math.round((avgKills / 6) * 50 + (aggressiveGames.length / playerGames.length) * 50));
  const visionScoreRadar = Math.min(100, Math.round((avgVision / benchmark.avgVisionPerMin) * 50));
  const roamScore = Math.min(100, Math.round((avgAssists / 8) * 60 + (avgKills > 5 ? 20 : 0) + 20));
  const objectiveScore = Math.min(100, Math.round(
    (playerGames.reduce((s, g) => s + g.player.dragonKills + g.player.turretKills, 0) / playerGames.length) * 25 + 25
  ));
  const farmScore = Math.min(100, Math.round((csmAverage / benchmark.avgCsPerMin) * 70));
  const survivalScore = Math.min(100, Math.round(Math.max(0, (1 - avgDeaths / benchmark.avgDeathsPerGame) * 100)));
  
  const playstyle: PlaystylePoint[] = [
    { subject: "radar.aggression", value: aggressionScore, fullMark: 100 },
    { subject: "radar.vision",     value: visionScoreRadar, fullMark: 100 },
    { subject: "radar.roam",       value: roamScore, fullMark: 100 },
    { subject: "radar.objectives", value: objectiveScore, fullMark: 100 },
    { subject: "radar.farm",       value: farmScore, fullMark: 100 },
    { subject: "radar.survival",   value: survivalScore, fullMark: 100 },
  ];
  
  // ── Build metrics ──
  const overallWinrate = aggressiveWinrateVsTotal;
  const csmVsBenchmark = csmAverage / benchmark.avgCsPerMin;
  
  const metrics: ComputedMetric[] = [
    {
      value: `${aggressiveWinrate}%`,
      label: `Winrate with First Blood (${aggressiveGames.length} games). Playing aggressively in early gives you +${aggressiveWinrate - overallWinrate}% above your average.`,
      trend: aggressiveWinrate > overallWinrate ? "up" : "down",
      trendLabel: aggressiveWinrate >= 65 ? `Top ${Math.max(5, Math.round(100 - aggressiveWinrate))}%` : `${aggressiveWinrate > overallWinrate ? "Above" : "Below"} your average`,
      severity: aggressiveWinrate >= 60 ? "good" : "warning",
      icon: "swords",
    },
    {
      value: avgVision.toFixed(1),
      label: `Vision/min. ${visionVsBenchmark < 0.8 ? `${Math.round((1 - visionVsBenchmark) * 100)}% below` : `${Math.round((visionVsBenchmark - 1) * 100)}% above`} the ${benchmark.tier} average.`,
      trend: parseInt(visionImprovement) > 0 ? "up" : "down",
      trendLabel: visionVsBenchmark < 0.8 ? "Area for Improvement" : `+${visionImprovement}%`,
      severity: visionVsBenchmark < 0.8 ? "warning" : "good",
      icon: "eye",
    },
    {
      value: csmAverage.toFixed(1),
      label: `CS/min average. ${csmVsBenchmark >= 1 ? `${Math.round((csmVsBenchmark - 1) * 100)}% above` : `${Math.round((1 - csmVsBenchmark) * 100)}% below`} the ${benchmark.tier} average.`,
      trend: parseInt(csmImprovement) > 0 ? "up" : "down",
      trendLabel: parseInt(csmImprovement) > 0 ? "Improving" : "Declining",
      severity: csmVsBenchmark >= 1 ? "good" : "neutral",
      icon: "target",
    },
  ];
  
  // ── Actionable Insights (generated from patterns) ──
  const insights: ComputedInsight[] = [];
  
  // Insight 1: Early death pattern
  if (earlyDeathPct > 25 && dangerousWindow) {
    const [window, count] = dangerousWindow;
    insights.push({
      title: "Early Game Vulnerability",
      description: `You die around minute ${window} in ${count} of your ${matches.length} games (${earlyDeathPct}% of your deaths happen before minute 5). Place a ward in the river at 2:45 to anticipate ganks.`,
      severity: "warning",
      icon: "clock",
      source: `Analyzed from ${totalDeaths} total deaths across ${matches.length} games. Pattern detected: ${earlyDeaths} deaths between min 2:30-5:00.`,
    });
  }
  
  // Insight 2: Damage efficiency
  if (avgDamageShare > avgGoldShare + 3) {
    insights.push({
      title: "Excellent Damage Efficiency",
      description: `You deal ${avgDamageShare}% of your team's damage with only ${avgGoldShare}% of the gold. You are ${avgDamageShare - avgGoldShare}% more efficient than average.`,
      severity: "good",
      icon: "crosshair",
      source: `Calculated: damage_share(${avgDamageShare}%) vs gold_share(${avgGoldShare}%) across ${matches.length} games.`,
    });
  }
  
  // Insight 3: Control wards
  if (lowControlWardPct > 40) {
    insights.push({
      title: "Objective Preparation",
      description: `In ${lowControlWardPct}% of your games you buy 1 or fewer Control Wards. ${benchmark.tier} players buy 3+ per game. This reduces your control over Dragon and Baron.`,
      severity: "danger",
      icon: "eye",
      source: `${lowControlWardGames}/${matches.length} games with <=1 control ward. Benchmark ${benchmark.tier}: 3+ per game.`,
    });
  }
  
  // Insight 4: CS improvement trend
  if (parseInt(csmImprovement) > 10) {
    insights.push({
      title: "Your Farming is Improving",
      description: `Your CS/min went from ${csmFirst10.toFixed(1)} to ${csmLast10.toFixed(1)} (+${csmImprovement}%) over the last 10 games. Keep it up to reach ${RANK_BENCHMARKS["DIAMOND"].tier} level (${RANK_BENCHMARKS["DIAMOND"].avgCsPerMin} CS/min).`,
      severity: "good",
      icon: "zap",
      source: `Trend: first 10 games avg ${csmFirst10.toFixed(1)} CS/min, last 10 games avg ${csmLast10.toFixed(1)} CS/min.`,
    });
  }
  
  // Insight 5: KDA analysis
  if (kda > benchmark.avgKda * 1.2) {
    insights.push({
      title: "KDA Above Rank Average",
      description: `Your KDA of ${kda.toFixed(1)} is ${Math.round((kda / benchmark.avgKda - 1) * 100)}% above the ${benchmark.tier} average (${benchmark.avgKda}). Your survival and kill participation are your greatest strength.`,
      severity: "good",
      icon: "shield",
      source: `KDA calculated: (${avgKills.toFixed(1)} + ${avgAssists.toFixed(1)}) / ${avgDeaths.toFixed(1)} = ${kda.toFixed(1)}. Benchmark ${benchmark.tier}: ${benchmark.avgKda}.`,
    });
  } else if (kda < benchmark.avgKda * 0.8) {
    insights.push({
      title: "KDA Below Rank Average",
      description: `Your KDA of ${kda.toFixed(1)} is ${Math.round((1 - kda / benchmark.avgKda) * 100)}% below the ${benchmark.tier} average (${benchmark.avgKda}). Focus on reducing avoidable deaths before chasing more kills.`,
      severity: "warning",
      icon: "shield",
      source: `KDA: ${kda.toFixed(1)} vs benchmark ${benchmark.tier}: ${benchmark.avgKda}.`,
    });
  }

  // Insight 6: Best champion
  const champMap: Record<string, { wins: number; total: number }> = {};
  playerGames.forEach(g => {
    const c = g.player.championName;
    if (!champMap[c]) champMap[c] = { wins: 0, total: 0 };
    champMap[c].total++;
    if (g.player.win) champMap[c].wins++;
  });
  const bestChamp = Object.entries(champMap)
    .filter(([, s]) => s.total >= 3)
    .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0];
  if (bestChamp) {
    const [name, stats] = bestChamp;
    const wr = Math.round(stats.wins / stats.total * 100);
    if (wr >= 60) {
      insights.push({
        title: `${name} is your Best Champion`,
        description: `${wr}% winrate in ${stats.total} games with ${name}. When you need LP, this is your go-to pick.`,
        severity: "good",
        icon: "zap",
        source: `${stats.wins}W/${stats.total - stats.wins}L with ${name} in the last ${matches.length} games.`,
      });
    }
  }

  // Insight 7: Worst champion
  const worstChamp = Object.entries(champMap)
    .filter(([, s]) => s.total >= 3)
    .sort((a, b) => (a[1].wins / a[1].total) - (b[1].wins / b[1].total))[0];
  if (worstChamp && worstChamp !== bestChamp) {
    const [name, stats] = worstChamp;
    const wr = Math.round(stats.wins / stats.total * 100);
    if (wr <= 40) {
      insights.push({
        title: `${name} is Hurting your LP`,
        description: `Only ${wr}% winrate in ${stats.total} games with ${name}. Consider practicing it in normals or removing it from your ranked pool.`,
        severity: "danger",
        icon: "trending-down",
        source: `${stats.wins}W/${stats.total - stats.wins}L with ${name}.`,
      });
    }
  }

  // Insight 8: Win/loss streaks
  const recentResults = playerGames.slice(-10).map(g => g.player.win);
  let currentStreak = 1;
  for (let i = recentResults.length - 2; i >= 0; i--) {
    if (recentResults[i] === recentResults[recentResults.length - 1]) currentStreak++;
    else break;
  }
  if (currentStreak >= 3) {
    const isWinStreak = recentResults[recentResults.length - 1];
    insights.push({
      title: isWinStreak ? `${currentStreak}-Win Streak` : `${currentStreak}-Loss Streak`,
      description: isWinStreak
        ? `You're on ${currentStreak} consecutive wins. Your confidence and decision-making are at their peak. Ride the momentum.`
        : `${currentStreak} consecutive losses. Consider taking a 15-minute break before your next game. Tilt is your biggest enemy.`,
      severity: isWinStreak ? "good" : "danger",
      icon: isWinStreak ? "zap" : "trending-down",
      source: `Last ${recentResults.length} results: ${recentResults.map(w => w ? "W" : "L").join("")}.`,
    });
  }

  // Insight 9: Game duration correlation
  const shortGames = playerGames.filter(g => g.match.gameDuration / 60 < 25);
  const longGames = playerGames.filter(g => g.match.gameDuration / 60 >= 30);
  if (shortGames.length >= 3 && longGames.length >= 3) {
    const shortWr = Math.round(shortGames.filter(g => g.player.win).length / shortGames.length * 100);
    const longWr = Math.round(longGames.filter(g => g.player.win).length / longGames.length * 100);
    if (Math.abs(shortWr - longWr) >= 20) {
      const prefersShort = shortWr > longWr;
      insights.push({
        title: prefersShort ? "You Dominate Short Games" : "You Shine in the Late Game",
        description: prefersShort
          ? `${shortWr}% WR in short games (<25min) vs ${longWr}% in long ones (>30min). Your aggressive style works best when closing fast. Prioritize early objectives.`
          : `${longWr}% WR in long games (>30min) vs ${shortWr}% in short ones (<25min). Scaling favors you — don't force unnecessary early fights.`,
        severity: "good",
        icon: "clock",
        source: `Short: ${shortGames.length} games (${shortWr}% WR). Long: ${longGames.length} games (${longWr}% WR).`,
      });
    }
  }

  // Insight 10: Damage share in losses vs wins
  const winDmgShares = playerGames.filter(g => g.player.win).map(g => {
    const td = getTeamDamage(g.match, true);
    return td > 0 ? (g.player.totalDamageDealtToChampions / td) * 100 : 0;
  });
  const lossDmgShares = playerGames.filter(g => !g.player.win).map(g => {
    const td = getTeamDamage(g.match, true);
    return td > 0 ? (g.player.totalDamageDealtToChampions / td) * 100 : 0;
  });
  if (winDmgShares.length >= 3 && lossDmgShares.length >= 3) {
    const avgWinDmg = Math.round(winDmgShares.reduce((a, b) => a + b, 0) / winDmgShares.length);
    const avgLossDmg = Math.round(lossDmgShares.reduce((a, b) => a + b, 0) / lossDmgShares.length);
    if (avgLossDmg > avgWinDmg + 5) {
      insights.push({
        title: "More Damage When Losing",
        description: `Your damage share is ${avgLossDmg}% in losses vs ${avgWinDmg}% in wins. This suggests that in losses you fight alone or your team doesn't fight with you. Seek fights when your team is grouped.`,
        severity: "warning",
        icon: "crosshair",
        source: `DmgShare in wins: ${avgWinDmg}%, in losses: ${avgLossDmg}%.`,
      });
    }
  }

  // Insight 11: Death trend (improving or declining)
  const deathsFirst10 = playerGames.slice(0, 10).reduce((s, g) => s + g.player.deaths, 0) / Math.min(10, playerGames.length);
  const deathsLast10 = playerGames.slice(-10).reduce((s, g) => s + g.player.deaths, 0) / Math.min(10, playerGames.length);
  const deathChange = deathsFirst10 > 0 ? Math.round(((deathsLast10 - deathsFirst10) / deathsFirst10) * 100) : 0;
  if (deathChange <= -15) {
    insights.push({
      title: "Fewer Deaths Than Before",
      description: `Your average deaths dropped from ${deathsFirst10.toFixed(1)} to ${deathsLast10.toFixed(1)} per game (${Math.abs(deathChange)}% fewer). Your positioning and macro decision-making are improving.`,
      severity: "good",
      icon: "shield",
      source: `Deaths first 10: ${deathsFirst10.toFixed(1)}/game, last 10: ${deathsLast10.toFixed(1)}/game.`,
    });
  } else if (deathChange >= 20) {
    insights.push({
      title: "Your Deaths Are Increasing",
      description: `Your average deaths went from ${deathsFirst10.toFixed(1)} to ${deathsLast10.toFixed(1)} per game (+${deathChange}%). This could be accumulated tilt or harder matchups. Evaluate your frustration level before each game.`,
      severity: "danger",
      icon: "trending-down",
      source: `Deaths first 10: ${deathsFirst10.toFixed(1)}/game, last 10: ${deathsLast10.toFixed(1)}/game.`,
    });
  }

  // Insight 12: Gold efficiency
  const avgGoldEfficiency = Math.round(playerGames.reduce((s, g) => s + (g.player.goldEarned > 0 ? g.player.goldSpent / g.player.goldEarned : 0), 0) / playerGames.length * 100);
  if (avgGoldEfficiency < 85) {
    insights.push({
      title: "Recurring Unspent Gold",
      description: `You only spend ${avgGoldEfficiency}% of the gold you earn. That means on average you finish with ${Math.round(playerGames.reduce((s, g) => s + (g.player.goldEarned - g.player.goldSpent), 0) / playerGames.length)} gold not converted into stats. Recall before key fights.`,
      severity: "warning",
      icon: "target",
      source: `Average gold efficiency: ${avgGoldEfficiency}% across ${matches.length} games.`,
    });
  }

  // Insight 13: Champion pool diversity
  const uniqueChamps = Object.keys(champMap).length;
  if (uniqueChamps <= 2 && matches.length >= 10) {
    insights.push({
      title: "Very Small Champion Pool",
      description: `You have only played ${uniqueChamps} champion(s) in ${matches.length} games. An OTP can work, but if you get banned or counterpicked, you'll have no options. Consider adding 1-2 backup picks.`,
      severity: "warning",
      icon: "shield",
      source: `${uniqueChamps} unique champions in ${matches.length} games.`,
    });
  } else if (uniqueChamps >= 8 && matches.length <= 20) {
    insights.push({
      title: "Very Large Champion Pool",
      description: `${uniqueChamps} different champions in ${matches.length} games. Too much variety can prevent mastery. Focus on 2-3 main picks for ranked.`,
      severity: "warning",
      icon: "shield",
      source: `${uniqueChamps} unique champions in ${matches.length} games.`,
    });
  }

  // Insight 14: Time-of-day performance
  const hourBuckets: Record<string, { wins: number; total: number }> = {};
  playerGames.forEach(g => {
    const h = new Date(g.match.gameCreation).getHours();
    const period = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
    if (!hourBuckets[period]) hourBuckets[period] = { wins: 0, total: 0 };
    hourBuckets[period].total++;
    if (g.player.win) hourBuckets[period].wins++;
  });
  const bestPeriod = Object.entries(hourBuckets)
    .filter(([, s]) => s.total >= 3)
    .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0];
  const worstPeriodEntry = Object.entries(hourBuckets)
    .filter(([, s]) => s.total >= 3)
    .sort((a, b) => (a[1].wins / a[1].total) - (b[1].wins / b[1].total))[0];
  if (bestPeriod && worstPeriodEntry && bestPeriod[0] !== worstPeriodEntry[0]) {
    const bestWr = Math.round(bestPeriod[1].wins / bestPeriod[1].total * 100);
    const worstWr = Math.round(worstPeriodEntry[1].wins / worstPeriodEntry[1].total * 100);
    if (bestWr - worstWr >= 20) {
      insights.push({
        title: `You Perform Better in the ${bestPeriod[0].charAt(0).toUpperCase() + bestPeriod[0].slice(1)}`,
        description: `${bestWr}% WR playing in the ${bestPeriod[0]} (${bestPeriod[1].total} games) vs ${worstWr}% in the ${worstPeriodEntry[0]} (${worstPeriodEntry[1].total} games). Your concentration and reflexes vary depending on the time of day.`,
        severity: "good",
        icon: "clock",
        source: `WR by period: ${Object.entries(hourBuckets).map(([p, s]) => `${p}: ${Math.round(s.wins / s.total * 100)}% (${s.total}g)`).join(", ")}.`,
      });
    }
  }

  // Insight 15: First Blood -> short game correlation
  if (aggressiveGames.length >= 3) {
    const fbDurations = aggressiveGames.map(g => g.match.gameDuration / 60);
    const nonFbGames = playerGames.filter(g => !g.player.firstBloodKill && !g.player.firstBloodAssist);
    if (nonFbGames.length >= 3) {
      const avgFbDur = Math.round(fbDurations.reduce((a, b) => a + b, 0) / fbDurations.length);
      const nonFbDurations = nonFbGames.map(g => g.match.gameDuration / 60);
      const avgNonFbDur = Math.round(nonFbDurations.reduce((a, b) => a + b, 0) / nonFbDurations.length);
      if (avgNonFbDur - avgFbDur >= 3) {
        insights.push({
          title: "First Blood Accelerates Your Games",
          description: `Your games with First Blood last ~${avgFbDur} min vs ~${avgNonFbDur} min without it. The early advantage lets you snowball and close out fast.`,
          severity: "good",
          icon: "zap",
          source: `Duration with FB: ${avgFbDur}min (${fbDurations.length}g), without FB: ${avgNonFbDur}min (${nonFbGames.length}g).`,
        });
      }
    }
  }

  // Insight 16: Role specialization gap
  const mainRole = roleWinrates.filter(r => r.games >= 3).sort((a, b) => b.games - a.games)[0];
  const offRole = roleWinrates.filter(r => r.games >= 2 && r.role !== mainRole?.role).sort((a, b) => a.winrate - b.winrate)[0];
  if (mainRole && offRole && mainRole.winrate - offRole.winrate >= 20) {
    insights.push({
      title: `Much Better as ${mainRole.role}`,
      description: `${mainRole.winrate}% WR as ${mainRole.role} (${mainRole.games}g) vs ${offRole.winrate}% as ${offRole.role} (${offRole.games}g). When you get autofilled, play safe and focus on not losing your lane.`,
      severity: "warning",
      icon: "crosshair",
      source: `WR by role: ${roleWinrates.filter(r => r.games > 0).map(r => `${r.role}: ${r.winrate}% (${r.games}g)`).join(", ")}.`,
    });
  }

  // Insight 17: CS consistency
  const csmVariance = csmValues.reduce((s, v) => s + Math.pow(v - csmAverage, 2), 0) / csmValues.length;
  const csmStdDev = Math.sqrt(csmVariance);
  if (csmStdDev > 1.5) {
    insights.push({
      title: "Inconsistent CS Across Games",
      description: `Your CS/min varies a lot (${Math.min(...csmValues).toFixed(1)} - ${Math.max(...csmValues).toFixed(1)}). Consistency is key: try to maintain at least ${(csmAverage - 0.5).toFixed(1)} CS/min even in difficult games.`,
      severity: "warning",
      icon: "target",
      source: `CS/min stddev: ${csmStdDev.toFixed(2)}. Range: ${Math.min(...csmValues).toFixed(1)}-${Math.max(...csmValues).toFixed(1)}.`,
    });
  }

  // ── Greeting ──
  const hour = new Date().getHours();
  const totalWins = playerGames.filter(g => g.player.win).length;
  const overallWinRate = playerGames.length > 0 ? Math.round(totalWins / playerGames.length * 100) : 0;
  const recentGames = playerGames.slice(-5);
  const recentWins = recentGames.filter(g => g.player.win).length;
  const isOnWinStreak = recentWins >= 4;
  const isOnLoseStreak = recentWins <= 1 && recentGames.length >= 3;

  const morningGreetings = [
    "Good morning",
    "Morning grind",
    "Rise and grind",
  ];
  const afternoonGreetings = [
    "Good afternoon",
    "Ranked afternoon",
    "Back to the game",
  ];
  const nightGreetings = [
    "Good evening",
    "Game night",
    "One more and I'm done",
  ];

  let greetingPool = hour < 12 ? morningGreetings : hour < 18 ? afternoonGreetings : nightGreetings;

  // Override with contextual greetings based on performance
  if (isOnWinStreak) {
    greetingPool = ["On a streak", "Unstoppable", "Riding the momentum"];
  } else if (isOnLoseStreak) {
    greetingPool = ["Getting back up", "Just a bump in the road", "The bounce-back is coming"];
  } else if (overallWinRate >= 55) {
    greetingPool = ["Dominating the queue", ...greetingPool];
  }

  const greeting = greetingPool[Math.floor(Math.random() * greetingPool.length)];
  
  // ── Narrative (computed) ──
  const bestMetric = metrics.reduce((best, m) => m.severity === "good" && !best ? m : best, null as ComputedMetric | null);
  const worstMetric = metrics.find(m => m.severity === "warning");
  
  const narrativeHighlights: { text: string; bold: boolean }[] = [
    { text: `In your last ${matches.length} games, `, bold: false },
  ];
  
  if (worstMetric && worstMetric.icon === "eye") {
    narrativeHighlights.push(
      { text: "your vision score", bold: true },
      { text: ` has ${parseInt(visionImprovement) > 0 ? `improved by ${visionImprovement}%` : `dropped by ${Math.abs(parseInt(visionImprovement))}%`}, `, bold: false },
    );
  }
  
  if (earlyDeathPct > 25) {
    narrativeHighlights.push(
      { text: `but you're still dying to ganks between minute `, bold: false },
      { text: `3:00 and 5:00`, bold: true },
      { text: ` (${earlyDeathPct}% of your deaths). `, bold: false },
    );
  }
  
  if (parseInt(csmImprovement) > 5) {
    narrativeHighlights.push(
      { text: `Your CS/min has gone up `, bold: false },
      { text: `${csmImprovement}%`, bold: true },
      { text: `. `, bold: false },
    );
  }
  
  const closings = isOnWinStreak
    ? [
        "Keep the pace, don't stop now.",
        "On a streak and unstoppable.",
        "This is your moment, keep it up.",
      ]
    : isOnLoseStreak
    ? [
        "The comeback starts now.",
        "The best players bounce back from this.",
        "One step back, two steps forward.",
      ]
    : parseInt(csmImprovement) > 10
    ? [
        "The farming is making a difference.",
        "That CS/min is the path to LP.",
        "Let's keep improving.",
      ]
    : overallWinRate >= 55
    ? [
        "Those numbers speak for themselves.",
        "Consistency is key, keep it up.",
        "Let's keep improving.",
      ]
    : [
        "Let's keep improving.",
        "Every game is a lesson.",
        "The grind pays off.",
        "One day at a time, one LP at a time.",
      ];

  const closing = closings[Math.floor(Math.random() * closings.length)];
  narrativeHighlights.push({ text: closing, bold: false });
  
  const narrative = narrativeHighlights.map(h => h.text).join("");
  
  return {
    greeting: `${greeting}, ${summonerName}`,
    narrative,
    narrativeHighlights,
    metrics,
    csmTrend,
    csmAverage,
    playstyle,
    roleWinrates,
    insights,
    matchCount: matches.length,
  };
}

// ─── Shared sorting utility ───────────────────────────────────────────────────

/** Returns a new array sorted from most recent to oldest game. */
export function sortByRecent(matches: MatchData[]): MatchData[] {
  return [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
}