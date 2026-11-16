import { BOT_ARCHETYPES, getArchetype } from './bots';
import {
  DifficultyLevel,
  TournamentBracketState,
  TournamentMatch,
  TournamentParticipant,
  TournamentTier,
} from '../types/game';

export const TOURNAMENT_TIER_CONFIG: Record<
  TournamentTier,
  {
    id: TournamentTier;
    title: string;
    subtitle: string;
    difficulty: DifficultyLevel;
    hazardIntensity: 'standard' | 'mayhem';
    scrapReward: number;
    statPointsReward: number;
    unlocksChassisOnWin: boolean;
  }
> = {
  qualifier: {
    id: 'qualifier',
    title: 'Open Qualifier',
    subtitle: '8-Bot Single Elimination · Easy AI · Standard Hazards',
    difficulty: 'easy',
    hazardIntensity: 'standard',
    scrapReward: 250,
    statPointsReward: 2,
    unlocksChassisOnWin: false,
  },
  pro: {
    id: 'pro',
    title: 'Pro Circuit',
    subtitle: '8-Bot Single Elimination · Medium AI · Standard Hazards',
    difficulty: 'medium',
    hazardIntensity: 'standard',
    scrapReward: 450,
    statPointsReward: 3,
    unlocksChassisOnWin: false,
  },
  championship: {
    id: 'championship',
    title: 'World Championship',
    subtitle: '8-Bot Single Elimination · Hard AI · Mayhem Hazards',
    difficulty: 'hard',
    hazardIntensity: 'mayhem',
    scrapReward: 800,
    statPointsReward: 5,
    unlocksChassisOnWin: true,
  },
};

const AI_CHALLENGER_POOL: { name: string; chassisId: string }[] = [
  { name: 'Tungsten', chassisId: 'tungsten' },
  { name: 'Hydra-X', chassisId: 'hydra_x' },
  { name: 'Valkyrie-H', chassisId: 'valkyrie_h' },
  { name: 'Inferno', chassisId: 'inferno' },
  { name: 'Apex Mk.II', chassisId: 'apex' },
  { name: 'Tungsten Prime', chassisId: 'tungsten' },
  { name: 'Hydra-X Fury', chassisId: 'hydra_x' },
  { name: 'Valkyrie Edge', chassisId: 'valkyrie_h' },
];

export function createTournamentBracket(
  playerName: string,
  playerChassisId: string,
  tier: TournamentTier
): TournamentBracketState {
  const tierCfg = TOURNAMENT_TIER_CONFIG[tier];

  // Pick 7 distinct AI challengers shuffled cleanly
  const shuffled = [...AI_CHALLENGER_POOL].sort(() => Math.random() - 0.5).slice(0, 7);

  const playerEntry: TournamentParticipant = {
    id: 'p-player',
    name: playerName,
    chassisId: playerChassisId,
    seed: 1,
    isPlayer: true,
  };

  const aiEntries: TournamentParticipant[] = shuffled.map((entry, idx) => ({
    id: `p-ai-${idx + 2}`,
    name: entry.name,
    chassisId: entry.chassisId,
    seed: idx + 2,
    isPlayer: false,
  }));

  const matches: TournamentMatch[] = [
    // Quarterfinals
    {
      id: 'qf-0',
      round: 'qf',
      slotIndex: 0,
      red: playerEntry,
      blue: aiEntries[6], // Seed 1 vs Seed 8
      winnerId: null,
      isPlayerMatch: true,
    },
    {
      id: 'qf-1',
      round: 'qf',
      slotIndex: 1,
      red: aiEntries[2], // Seed 4
      blue: aiEntries[3], // Seed 5
      winnerId: null,
      isPlayerMatch: false,
    },
    {
      id: 'qf-2',
      round: 'qf',
      slotIndex: 2,
      red: aiEntries[0], // Seed 2
      blue: aiEntries[5], // Seed 7
      winnerId: null,
      isPlayerMatch: false,
    },
    {
      id: 'qf-3',
      round: 'qf',
      slotIndex: 3,
      red: aiEntries[1], // Seed 3
      blue: aiEntries[4], // Seed 6
      winnerId: null,
      isPlayerMatch: false,
    },
    // Semifinals
    {
      id: 'sf-0',
      round: 'sf',
      slotIndex: 0,
      red: null,
      blue: null,
      winnerId: null,
      isPlayerMatch: false,
    },
    {
      id: 'sf-1',
      round: 'sf',
      slotIndex: 1,
      red: null,
      blue: null,
      winnerId: null,
      isPlayerMatch: false,
    },
    // Grand Final
    {
      id: 'final-0',
      round: 'final',
      slotIndex: 0,
      red: null,
      blue: null,
      winnerId: null,
      isPlayerMatch: false,
    },
  ];

  return {
    id: `tourney-${Date.now()}`,
    tier,
    difficulty: tierCfg.difficulty,
    hazardIntensity: tierCfg.hazardIntensity,
    status: 'in_progress',
    rewardClaimed: false,
    matches,
    championId: null,
  };
}

function pickSimulatedAiWinner(
  red: TournamentParticipant,
  blue: TournamentParticipant
): TournamentParticipant {
  const redArch = getArchetype(red.chassisId);
  const blueArch = getArchetype(blue.chassisId);
  const redPower = redArch.baseHp + redArch.weaponDamage * 4 + (9 - red.seed) * 6;
  const bluePower = blueArch.baseHp + blueArch.weaponDamage * 4 + (9 - blue.seed) * 6;
  const redChance = redPower / (redPower + bluePower);
  return Math.random() < redChance ? red : blue;
}

function propagateWinner(
  matches: TournamentMatch[],
  completedMatch: TournamentMatch,
  winner: TournamentParticipant
): TournamentMatch[] {
  const updated = matches.map((m) =>
    m.id === completedMatch.id ? completedMatch : { ...m }
  );

  if (completedMatch.round === 'qf') {
    const targetSfId = completedMatch.slotIndex < 2 ? 'sf-0' : 'sf-1';
    const isTopFeed = completedMatch.slotIndex % 2 === 0;
    return updated.map((m) => {
      if (m.id !== targetSfId) return m;
      const nextRed = isTopFeed ? winner : m.red;
      const nextBlue = isTopFeed ? m.blue : winner;
      return {
        ...m,
        red: nextRed,
        blue: nextBlue,
        isPlayerMatch: Boolean(nextRed?.isPlayer || nextBlue?.isPlayer),
      };
    });
  }

  if (completedMatch.round === 'sf') {
    const isTopFeed = completedMatch.slotIndex === 0;
    return updated.map((m) => {
      if (m.id !== 'final-0') return m;
      const nextRed = isTopFeed ? winner : m.red;
      const nextBlue = isTopFeed ? m.blue : winner;
      return {
        ...m,
        red: nextRed,
        blue: nextBlue,
        isPlayerMatch: Boolean(nextRed?.isPlayer || nextBlue?.isPlayer),
      };
    });
  }

  return updated;
}

export function resolveTournamentMatch(
  bracket: TournamentBracketState,
  matchId: string,
  winnerCorner: 'red' | 'blue' | 'draw',
  winMethod: 'KO' | 'Judges Decision' | 'Simulated',
  replayId?: string
): TournamentBracketState {
  const target = bracket.matches.find((m) => m.id === matchId);
  if (!target || !target.red || !target.blue) return bracket;

  // On rare draw, advance red corner (seed tiebreaker)
  const winner =
    winnerCorner === 'blue' ? target.blue : target.red;

  const completed: TournamentMatch = {
    ...target,
    winnerId: winner.id,
    winMethod,
    replayId: replayId ?? target.replayId,
  };

  let nextMatches = propagateWinner(bracket.matches, completed, winner);

  // Auto-resolve parallel AI-only matches in the same round so the next round is immediately populated
  const parallelAiMatches = nextMatches.filter(
    (m) =>
      m.round === target.round &&
      m.id !== target.id &&
      !m.winnerId &&
      m.red &&
      m.blue &&
      !m.red.isPlayer &&
      !m.blue.isPlayer
  );

  for (const aiMatch of parallelAiMatches) {
    if (!aiMatch.red || !aiMatch.blue) continue;
    const aiWinner = pickSimulatedAiWinner(aiMatch.red, aiMatch.blue);
    const doneAi: TournamentMatch = {
      ...aiMatch,
      winnerId: aiWinner.id,
      winMethod: 'Simulated',
    };
    nextMatches = propagateWinner(nextMatches, doneAi, aiWinner);
  }

  let nextStatus = bracket.status;
  let championId = bracket.championId;

  if (target.isPlayerMatch && !winner.isPlayer) {
    nextStatus = 'eliminated';
  } else if (completed.round === 'final') {
    championId = winner.id;
    nextStatus = winner.isPlayer ? 'champion' : 'eliminated';
  }

  return {
    ...bracket,
    status: nextStatus,
    championId,
    matches: nextMatches,
  };
}

export function simulateRemainingTournamentMatches(
  bracket: TournamentBracketState
): TournamentBracketState {
  let current = bracket;
  for (const round of ['qf', 'sf', 'final'] as const) {
    const pending = current.matches.filter(
      (m) =>
        m.round === round &&
        !m.winnerId &&
        m.red &&
        m.blue &&
        (!m.isPlayerMatch || current.status === 'eliminated')
    );
    for (const m of pending) {
      if (!m.red || !m.blue) continue;
      const aiWinner = pickSimulatedAiWinner(m.red, m.blue);
      const corner = aiWinner.id === m.red.id ? 'red' : 'blue';
      current = resolveTournamentMatch(current, m.id, corner, 'Simulated');
    }
  }
  return current;
}

export function getNextPlayerTournamentMatch(
  bracket: TournamentBracketState | null
): TournamentMatch | null {
  if (!bracket || bracket.status !== 'in_progress') return null;
  return (
    bracket.matches.find(
      (m) => m.isPlayerMatch && !m.winnerId && m.red && m.blue
    ) ?? null
  );
}

export function getLockedChassisCandidate(unlockedIds: string[]): string | null {
  const locked = BOT_ARCHETYPES.find((b) => !unlockedIds.includes(b.id));
  return locked ? locked.id : null;
}
