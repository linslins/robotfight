import { Trophy, Tv, Swords, Play } from 'lucide-react';
import { useState } from 'react';
import { getArchetype } from '../data/bots';
import {
  getNextPlayerTournamentMatch,
  TOURNAMENT_TIER_CONFIG,
} from '../data/tournament';
import {
  BotLoadout,
  PlayerProgress,
  SavedReplay,
  TournamentBracketState,
  TournamentMatch,
  TournamentTier,
} from '../types/game';

interface TournamentViewProps {
  progress: PlayerProgress;
  activeLoadout: BotLoadout;
  bracket: TournamentBracketState | null;
  onStartNewTournament: (tier: TournamentTier) => void;
  onPlayTournamentMatch: (match: TournamentMatch) => void;
  onSpectateTournamentMatch: (match: TournamentMatch) => void;
  onSimulateMatch: (matchId: string) => void;
  onSimulateRemaining: () => void;
  onWatchReplay: (replay: SavedReplay) => void;
  onGoToBroadcast: () => void;
}

export function TournamentView({
  progress,
  activeLoadout,
  bracket,
  onStartNewTournament,
  onPlayTournamentMatch,
  onSpectateTournamentMatch,
  onSimulateMatch,
  onSimulateRemaining,
  onWatchReplay,
  onGoToBroadcast,
}: TournamentViewProps) {
  const [selectedTier, setSelectedTier] = useState<TournamentTier>(
    bracket?.tier ?? 'pro'
  );

  const nextPlayerMatch = getNextPlayerTournamentMatch(bracket);

  const qfMatches = bracket?.matches.filter((m) => m.round === 'qf') ?? [];
  const sfMatches = bracket?.matches.filter((m) => m.round === 'sf') ?? [];
  const finalMatch = bracket?.matches.find((m) => m.round === 'final') ?? null;

  const findReplay = (replayId?: string) =>
    replayId
      ? progress.recentMatches.find((r) => r.id === replayId) ?? null
      : null;

  const renderMatchCard = (match: TournamentMatch) => {
    const isComplete = match.winnerId !== null;
    const redWon = isComplete && match.winnerId === match.red?.id;
    const blueWon = isComplete && match.winnerId === match.blue?.id;
    const isReadyToFight =
      !isComplete && match.red !== null && match.blue !== null;
    const replay = findReplay(match.replayId);

    const roundName =
      match.round === 'qf'
        ? `Quarterfinal ${match.slotIndex + 1}`
        : match.round === 'sf'
          ? `Semifinal ${match.slotIndex + 1}`
          : 'Grand Final';

    return (
      <div
        key={match.id}
        className={`rounded-xl border p-4 space-y-3 transition-colors ${
          match.isPlayerMatch && isReadyToFight
            ? 'border-orange-500/80 bg-[#171C24]'
            : 'border-white/10 bg-[#14181F]'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300">{roundName}</span>
          <span>
            {isComplete
              ? match.winMethod ?? 'Completed'
              : isReadyToFight
                ? match.isPlayerMatch
                  ? 'Your Match'
                  : 'Ready'
                : 'Awaiting Winner'}
          </span>
        </div>

        {/* Fighters */}
        <div className="space-y-2">
          {/* Red Slot */}
          <div
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
              redWon
                ? 'border-emerald-500/60 bg-emerald-500/10 text-slate-100'
                : isComplete
                  ? 'border-white/5 bg-[#0D1014]/60 text-slate-500'
                  : 'border-white/10 bg-[#0D1014] text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono-tabular text-slate-400">
                {match.red ? `#${match.red.seed}` : '--'}
              </span>
              <span
                className={`truncate font-semibold ${
                  match.red?.isPlayer ? 'text-orange-400' : ''
                }`}
              >
                {match.red ? match.red.name : 'TBD'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0">
              {match.red ? getArchetype(match.red.chassisId).name : ''}
            </span>
          </div>

          {/* Blue Slot */}
          <div
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
              blueWon
                ? 'border-emerald-500/60 bg-emerald-500/10 text-slate-100'
                : isComplete
                  ? 'border-white/5 bg-[#0D1014]/60 text-slate-500'
                  : 'border-white/10 bg-[#0D1014] text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono-tabular text-slate-400">
                {match.blue ? `#${match.blue.seed}` : '--'}
              </span>
              <span
                className={`truncate font-semibold ${
                  match.blue?.isPlayer ? 'text-orange-400' : ''
                }`}
              >
                {match.blue ? match.blue.name : 'TBD'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0">
              {match.blue ? getArchetype(match.blue.chassisId).name : ''}
            </span>
          </div>
        </div>

        {/* Actions */}
        {isReadyToFight && match.isPlayerMatch && bracket?.status === 'in_progress' && (
          <button
            type="button"
            onClick={() => onPlayTournamentMatch(match)}
            className="w-full rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-500 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Swords className="h-3.5 w-3.5" />
            Fight Match
          </button>
        )}

        {isReadyToFight && !match.isPlayerMatch && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSpectateTournamentMatch(match)}
              className="flex-1 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-orange-600 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Tv className="h-3.5 w-3.5" />
              Spectate
            </button>
            <button
              type="button"
              onClick={() => onSimulateMatch(match.id)}
              className="rounded-md border border-white/15 bg-[#0D1014] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5 cursor-pointer"
            >
              Simulate
            </button>
          </div>
        )}

        {isComplete && replay && (
          <button
            type="button"
            onClick={() => onWatchReplay(replay)}
            className="w-full rounded-md border border-white/15 bg-[#0D1014] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" />
            Watch Replay
          </button>
        )}
      </div>
    );
  };

  const tierCfg = TOURNAMENT_TIER_CONFIG[selectedTier];
  const activeTierCfg = bracket
    ? TOURNAMENT_TIER_CONFIG[bracket.tier]
    : tierCfg;

  const championParticipant =
    bracket?.championId
      ? bracket.matches
          .flatMap((m) => [m.red, m.blue])
          .find((p) => p?.id === bracket.championId) ?? null
      : null;

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide text-slate-100">
            Championship Tournament
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Compete through an 8-bot single-elimination bracket for championship titles, Scrap, and bonus stat points.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <div className="text-right">
            <div className="text-xs text-slate-400">Titles Won</div>
            <div className="font-mono-tabular text-lg font-semibold text-slate-100">
              {progress.tournamentsWon}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Scrap Balance</div>
            <div className="font-mono-tabular text-lg font-semibold text-orange-400">
              {progress.scrap} SCR
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToBroadcast}
            className="rounded-md border border-white/15 bg-[#14181F] px-4 py-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Tv className="h-4 w-4 text-orange-400" />
            Broadcast & Replays
          </button>
        </div>
      </div>

      {/* Tournament Tier Launcher */}
      <section className="rounded-xl border border-white/10 bg-[#14181F] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-100">
              {bracket ? 'Tournament Tiers & New Bracket' : 'Select Tournament Tier'}
            </h2>
            <p className="text-xs text-slate-400">
              Entered Bot: <strong className="text-slate-200">{activeLoadout.name}</strong> ({getArchetype(activeLoadout.chassisId).name})
            </p>
          </div>

          <button
            type="button"
            onClick={() => onStartNewTournament(selectedTier)}
            className="rounded-md bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 cursor-pointer"
          >
            {bracket ? 'Start New Bracket' : 'Enter Tournament'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(['qualifier', 'pro', 'championship'] as TournamentTier[]).map((tKey) => {
            const cfg = TOURNAMENT_TIER_CONFIG[tKey];
            const isSelected = selectedTier === tKey;
            return (
              <button
                key={tKey}
                type="button"
                onClick={() => setSelectedTier(tKey)}
                className={`rounded-lg border p-4 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-white/10 bg-[#0D1014] hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold text-slate-100">
                    {cfg.title}
                  </span>
                  <span className="font-mono-tabular text-xs font-semibold text-orange-400">
                    +{cfg.scrapReward} SCR
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{cfg.subtitle}</p>
                <div className="mt-2.5 text-xs text-emerald-400 font-medium">
                  Grand Prize: +{cfg.scrapReward} SCR · +{cfg.statPointsReward} Stat Points
                  {cfg.unlocksChassisOnWin ? ' · Chassis Unlock' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Bracket Display */}
      {!bracket ? (
        <div className="rounded-xl border border-white/10 bg-[#14181F] p-12 text-center space-y-3">
          <Trophy className="mx-auto h-10 w-10 text-orange-400" />
          <h3 className="font-display text-2xl font-bold text-slate-100">
            No Active Bracket
          </h3>
          <p className="mx-auto max-w-md text-sm text-slate-400">
            Choose a tournament tier above and enter your customized bot to compete for championship rewards.
          </p>
        </div>
      ) : (
        <section className="space-y-6">
          {/* Status / Champion Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#14181F] px-5 py-4">
            <div>
              <div className="text-xs text-slate-400">
                {activeTierCfg.title} · {activeTierCfg.subtitle}
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-slate-100">
                {bracket.status === 'champion'
                  ? `Tournament Champion: ${championParticipant?.name ?? activeLoadout.name}`
                  : bracket.status === 'eliminated'
                    ? championParticipant
                      ? `Eliminated · Champion: ${championParticipant.name}`
                      : 'Eliminated from Bracket'
                    : nextPlayerMatch
                      ? `Next Bout Ready vs ${
                          nextPlayerMatch.red?.isPlayer
                            ? nextPlayerMatch.blue?.name
                            : nextPlayerMatch.red?.name
                        }`
                      : 'Bracket In Progress'}
              </div>
              {bracket.status === 'champion' && (
                <div className="mt-1 text-xs font-medium text-emerald-400">
                  Championship Rewards Awarded: +{activeTierCfg.scrapReward} SCR · +
                  {activeTierCfg.statPointsReward} Bonus Stat Points
                  {bracket.unlockedRewardBotName
                    ? ` · Unlocked ${bracket.unlockedRewardBotName}`
                    : ''}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {bracket.status === 'in_progress' && nextPlayerMatch && (
                <button
                  type="button"
                  onClick={() => onPlayTournamentMatch(nextPlayerMatch)}
                  className="rounded-md bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 cursor-pointer"
                >
                  Fight Next Match
                </button>
              )}
              {bracket.status === 'eliminated' && !bracket.championId && (
                <button
                  type="button"
                  onClick={onSimulateRemaining}
                  className="rounded-md bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 cursor-pointer"
                >
                  Simulate Remaining Bouts
                </button>
              )}
            </div>
          </div>

          {/* 3-Column Single-Elimination Bracket */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Quarterfinals */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="font-display text-lg font-bold text-slate-100">
                  Quarterfinals
                </h3>
                <span className="text-xs text-slate-400">Round of 8</span>
              </div>
              <div className="space-y-4">
                {qfMatches.map((m) => renderMatchCard(m))}
              </div>
            </div>

            {/* Semifinals */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="font-display text-lg font-bold text-slate-100">
                  Semifinals
                </h3>
                <span className="text-xs text-slate-400">Final 4</span>
              </div>
              <div className="flex flex-col justify-around gap-6 lg:h-[calc(100%-3rem)]">
                {sfMatches.map((m) => renderMatchCard(m))}
              </div>
            </div>

            {/* Grand Final */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="font-display text-lg font-bold text-slate-100">
                  Grand Final
                </h3>
                <span className="text-xs text-orange-400 font-medium">
                  +{activeTierCfg.scrapReward} SCR Prize
                </span>
              </div>
              <div className="flex flex-col justify-center gap-6 lg:h-[calc(100%-3rem)]">
                {finalMatch && renderMatchCard(finalMatch)}

                {/* Broadcast Link Card */}
                <div className="rounded-xl border border-white/10 bg-[#14181F] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-lg font-semibold text-slate-100">
                      Live Broadcast Feed
                    </h4>
                    <Tv className="h-4 w-4 text-orange-400" />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Spectate AI bracket matches live from multiple camera angles or review saved tournament replays in the Broadcast hub.
                  </p>
                  <button
                    type="button"
                    onClick={onGoToBroadcast}
                    className="w-full rounded-md bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-orange-600 transition-colors cursor-pointer"
                  >
                    Open BroadcastView
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
