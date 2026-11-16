import { Trophy } from 'lucide-react';
import { useState } from 'react';
import {
  BOT_ARCHETYPES,
  DIFFICULTY_CONFIG,
  getArchetype,
  PRIMARY_WEAPONS,
} from '../data/bots';
import { TOURNAMENT_TIER_CONFIG } from '../data/tournament';
import {
  DifficultyLevel,
  OngoingSpectatorMatch,
  SavedReplay,
  TournamentBracketState,
  TournamentMatch,
} from '../types/game';

interface BroadcastViewProps {
  ongoingMatches: OngoingSpectatorMatch[];
  recentMatches: SavedReplay[];
  savedReplayIds: string[];
  activeTournament: TournamentBracketState | null;
  onJoinSpectatorMatch: (match: OngoingSpectatorMatch) => void;
  onStartCustomSpectate: (
    redId: string,
    blueId: string,
    difficulty: DifficultyLevel,
    hazardIntensity: 'standard' | 'mayhem'
  ) => void;
  onSpectateTournamentMatch: (match: TournamentMatch) => void;
  onGoToTournament: () => void;
  onWatchReplay: (replay: SavedReplay) => void;
  onToggleSaveReplay: (replayId: string) => void;
  onDeleteReplay: (replayId: string) => void;
}

export function BroadcastView({
  ongoingMatches,
  recentMatches,
  savedReplayIds,
  activeTournament,
  onJoinSpectatorMatch,
  onStartCustomSpectate,
  onSpectateTournamentMatch,
  onGoToTournament,
  onWatchReplay,
  onToggleSaveReplay,
  onDeleteReplay,
}: BroadcastViewProps) {
  const [customRed, setCustomRed] = useState('tungsten');
  const [customBlue, setCustomBlue] = useState('hydra_x');
  const [customDiff, setCustomDiff] = useState<DifficultyLevel>('hard');
  const [customHazard, setCustomHazard] = useState<'standard' | 'mayhem'>('standard');

  const pendingTournamentAiMatches =
    activeTournament?.matches.filter(
      (m) => !m.winnerId && m.red && m.blue && !m.isPlayerMatch
    ) ?? [];

  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide text-slate-100">
            Broadcast & Replays
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Join ongoing AI-vs-AI BattleBox bouts as a spectator or rewatch saved matches from any camera angle.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToTournament}
          className="rounded-md border border-white/15 bg-[#14181F] px-4 py-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Trophy className="h-4 w-4 text-orange-400" />
          Tournament Bracket
        </button>
      </div>

      {/* Tournament Bracket Broadcast Feed (when active AI bracket matches exist) */}
      {activeTournament && pendingTournamentAiMatches.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-slate-100">
              {TOURNAMENT_TIER_CONFIG[activeTournament.tier].title} Broadcasts
            </h2>
            <button
              type="button"
              onClick={onGoToTournament}
              className="text-xs font-medium text-orange-400 hover:underline cursor-pointer"
            >
              View Full Bracket
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {pendingTournamentAiMatches.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-orange-500/30 bg-[#14181F] p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="text-xs text-slate-400">
                    {m.round === 'qf'
                      ? `Quarterfinal ${m.slotIndex + 1}`
                      : m.round === 'sf'
                        ? `Semifinal ${m.slotIndex + 1}`
                        : 'Grand Final'}{' '}
                    · {DIFFICULTY_CONFIG[activeTournament.difficulty].label} AI
                  </div>
                  <div className="font-display text-xl font-bold text-slate-100">
                    {m.red?.name} vs {m.blue?.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    #{m.red?.seed} {getArchetype(m.red!.chassisId).name} vs #
                    {m.blue?.seed} {getArchetype(m.blue!.chassisId).name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSpectateTournamentMatch(m)}
                  className="w-full rounded-md bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-500 cursor-pointer"
                >
                  Spectate Bracket Bout
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 1: Ongoing Matches (Spectator Mode) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-slate-100">
            Ongoing Matches
          </h2>
          <span className="text-xs text-slate-400">
            Select any active arena feed to spectate with live camera controls
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {ongoingMatches.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-white/10 bg-[#14181F] p-5 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {m.eventTier} · {DIFFICULTY_CONFIG[m.difficulty].label} AI
                  </span>
                  <span className="font-mono-tabular text-orange-400">
                    {formatTime(m.elapsedSeconds)}
                  </span>
                </div>

                <h3 className="font-display text-xl font-bold text-slate-100">
                  {m.title}
                </h3>

                {/* Live HP Telemetry */}
                <div className="space-y-2.5 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-red-300">
                        {m.redName} (Red)
                      </span>
                      <span className="font-mono-tabular text-slate-300">
                        {Math.round(m.redHpPct)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${m.redHpPct}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-blue-300">
                        {m.blueName} (Blue)
                      </span>
                      <span className="font-mono-tabular text-slate-300">
                        {Math.round(m.blueHpPct)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${m.blueHpPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onJoinSpectatorMatch(m)}
                className="w-full rounded-md bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600 cursor-pointer"
              >
                Join as Spectator
              </button>
            </div>
          ))}
        </div>

        {/* Custom AI Exhibition Spectate Launcher */}
        <div className="rounded-xl border border-white/10 bg-[#14181F] p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-100">
                Custom AI Exhibition
              </h3>
              <p className="text-xs text-slate-400">
                Pair any two robots and observe an autonomous BattleBox match.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs text-slate-400">
                Red Corner
                <select
                  value={customRed}
                  onChange={(e) => setCustomRed(e.target.value)}
                  className="ml-2 rounded-md border border-white/15 bg-[#0D1014] px-2.5 py-1.5 text-xs text-slate-100"
                >
                  {BOT_ARCHETYPES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-slate-400">
                Blue Corner
                <select
                  value={customBlue}
                  onChange={(e) => setCustomBlue(e.target.value)}
                  className="ml-2 rounded-md border border-white/15 bg-[#0D1014] px-2.5 py-1.5 text-xs text-slate-100"
                >
                  {BOT_ARCHETYPES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-slate-400">
                AI Tier
                <select
                  value={customDiff}
                  onChange={(e) => setCustomDiff(e.target.value as DifficultyLevel)}
                  className="ml-2 rounded-md border border-white/15 bg-[#0D1014] px-2.5 py-1.5 text-xs text-slate-100"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>

              <label className="text-xs text-slate-400">
                Hazards
                <select
                  value={customHazard}
                  onChange={(e) =>
                    setCustomHazard(e.target.value as 'standard' | 'mayhem')
                  }
                  className="ml-2 rounded-md border border-white/15 bg-[#0D1014] px-2.5 py-1.5 text-xs text-slate-100"
                >
                  <option value="standard">Standard</option>
                  <option value="mayhem">Mayhem</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() =>
                  onStartCustomSpectate(
                    customRed,
                    customBlue,
                    customDiff,
                    customHazard
                  )
                }
                className="rounded-md bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-500 cursor-pointer"
              >
                Watch Exhibition
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Match Replays */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-slate-100">
            Recent & Saved Replays
          </h2>
          <span className="font-mono-tabular text-xs text-slate-400">
            {recentMatches.length} recorded matches
          </span>
        </div>

        {recentMatches.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#14181F] p-10 text-center">
            <p className="text-sm text-slate-300">
              No recorded matches yet. Complete a bout in the Arena or spectate an exhibition to save and rewatch replays.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recentMatches.map((rep) => {
              const isSaved = savedReplayIds.includes(rep.id);
              const winnerName =
                rep.winnerCorner === 'red'
                  ? rep.redMeta.name
                  : rep.winnerCorner === 'blue'
                    ? rep.blueMeta.name
                    : 'Draw';

              return (
                <div
                  key={rep.id}
                  className="rounded-xl border border-white/10 bg-[#14181F] p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {rep.mode === 'spectate' ? 'Spectator Bout' : 'Player Match'} ·{' '}
                        {DIFFICULTY_CONFIG[rep.difficulty].label} · {rep.winMethod}
                      </span>
                      <span className="font-mono-tabular">
                        {formatTime(rep.duration)}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-display text-xl font-bold text-slate-100">
                        {rep.redMeta.name} vs {rep.blueMeta.name}
                      </h3>
                      <span className="text-xs font-semibold text-orange-400">
                        Winner: {winnerName}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Red: {getArchetype(rep.redMeta.chassisId).name} (
                        {PRIMARY_WEAPONS[rep.redMeta.primaryWeapon].shortLabel}) ·{' '}
                        <span className="font-mono-tabular text-slate-200">
                          {rep.redDamageDealt} DMG
                        </span>
                      </span>
                      <span>
                        Blue: {getArchetype(rep.blueMeta.chassisId).name} (
                        {PRIMARY_WEAPONS[rep.blueMeta.primaryWeapon].shortLabel}) ·{' '}
                        <span className="font-mono-tabular text-slate-200">
                          {rep.blueDamageDealt} DMG
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={() => onWatchReplay(rep)}
                      className="flex-1 rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-500 cursor-pointer"
                    >
                      Watch Replay
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleSaveReplay(rep.id)}
                      className={`rounded-md border px-3 py-2 text-xs font-semibold cursor-pointer ${
                        isSaved
                          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                          : 'border-white/15 bg-[#0D1014] text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      {isSaved ? 'Saved' : 'Save Replay'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteReplay(rep.id)}
                      className="rounded-md border border-white/10 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
