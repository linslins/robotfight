import { useCallback, useEffect, useState } from 'react';
import { ArenaView } from './components/ArenaView';
import { BroadcastView } from './components/BroadcastView';
import { RosterView } from './components/RosterView';
import { TopBar } from './components/TopBar';
import { TournamentView } from './components/TournamentView';
import { WorkshopView } from './components/WorkshopView';
import {
  createDefaultProgress,
  getArchetype,
  getUpgradeCost,
  INITIAL_ONGOING_SPECTATOR_MATCHES,
} from './data/bots';
import {
  createTournamentBracket,
  getLockedChassisCandidate,
  resolveTournamentMatch,
  simulateRemainingTournamentMatches,
  TOURNAMENT_TIER_CONFIG,
} from './data/tournament';
import {
  BotLoadout,
  BotUpgrades,
  ControlMode,
  DifficultyLevel,
  GameView,
  MatchMode,
  MatchResult,
  OngoingSpectatorMatch,
  PlayerProgress,
  SavedReplay,
  TournamentMatch,
  TournamentTier,
} from './types/game';

const STORAGE_KEY = 'ironpit_progress_v1';

function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw) as PlayerProgress;
    if (!parsed || !Array.isArray(parsed.loadouts) || parsed.loadouts.length === 0) {
      return createDefaultProgress();
    }
    return {
      ...createDefaultProgress(),
      ...parsed,
      tournamentsWon: parsed.tournamentsWon ?? 0,
      activeTournament: parsed.activeTournament ?? null,
    };
  } catch {
    return createDefaultProgress();
  }
}

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);
  const [activeView, setActiveView] = useState<GameView>('arena');
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('tungsten');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [controlMode, setControlMode] = useState<ControlMode>('mouse_aim');
  const [hazardIntensity, setHazardIntensity] = useState<'standard' | 'mayhem'>('standard');

  const [matchMode, setMatchMode] = useState<MatchMode>('player_vs_ai');
  const [autoStartSignal, setAutoStartSignal] = useState<number>(0);

  const [ongoingMatches, setOngoingMatches] = useState<OngoingSpectatorMatch[]>(
    INITIAL_ONGOING_SPECTATOR_MATCHES
  );

  const [spectateConfig, setSpectateConfig] = useState<{
    title: string;
    redChassisId: string;
    blueChassisId: string;
    difficulty: DifficultyLevel;
    hazardIntensity: 'standard' | 'mayhem';
    initialElapsed?: number;
    initialRedPct?: number;
    initialBluePct?: number;
  } | null>(null);

  const [activeReplay, setActiveReplay] = useState<SavedReplay | null>(null);
  const [activeTournamentMatchId, setActiveTournamentMatchId] = useState<string | null>(
    null
  );
  const [activeSpectateTournamentMatchId, setActiveSpectateTournamentMatchId] =
    useState<string | null>(null);

  // Persist progress safely
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // If storage quota is tight, trim unsaved replays
      try {
        const trimmed: PlayerProgress = {
          ...progress,
          recentMatches: progress.recentMatches.filter((m) =>
            progress.savedReplayIds.includes(m.id)
          ),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        // Ignore storage errors
      }
    }
  }, [progress]);

  // Simulate live ongoing spectator bouts ticking in background
  useEffect(() => {
    const timer = setInterval(() => {
      setOngoingMatches((prev) =>
        prev.map((m) => {
          const nextElapsed = m.elapsedSeconds + 1;
          let nextRed = m.redHpPct - (Math.random() < 0.35 ? Math.random() * 2.2 : 0);
          let nextBlue = m.blueHpPct - (Math.random() < 0.35 ? Math.random() * 2.2 : 0);
          if (nextRed <= 12 || nextBlue <= 12 || nextElapsed >= 115) {
            // Reset fresh round
            return {
              ...m,
              redHpPct: 100,
              blueHpPct: 100,
              elapsedSeconds: 4,
            };
          }
          return {
            ...m,
            redHpPct: Math.max(12, nextRed),
            blueHpPct: Math.max(12, nextBlue),
            elapsedSeconds: nextElapsed,
          };
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeLoadout =
    progress.loadouts.find((l) => l.id === progress.activeLoadoutId) ??
    progress.loadouts[0];

  const handleUpdateLoadout = useCallback((updated: BotLoadout) => {
    setProgress((prev) => ({
      ...prev,
      selectedBotId: updated.chassisId,
      loadouts: prev.loadouts.map((l) => (l.id === updated.id ? updated : l)),
    }));
  }, []);

  const handleSaveAsNewLoadout = useCallback((newLoadout: BotLoadout) => {
    setProgress((prev) => ({
      ...prev,
      selectedBotId: newLoadout.chassisId,
      activeLoadoutId: newLoadout.id,
      loadouts: [newLoadout, ...prev.loadouts],
    }));
  }, []);

  const handleSelectLoadout = useCallback((loadoutId: string) => {
    setProgress((prev) => {
      const target = prev.loadouts.find((l) => l.id === loadoutId);
      return {
        ...prev,
        activeLoadoutId: loadoutId,
        selectedBotId: target ? target.chassisId : prev.selectedBotId,
      };
    });
  }, []);

  const handleDeleteLoadout = useCallback((loadoutId: string) => {
    setProgress((prev) => {
      if (prev.loadouts.length <= 1) return prev;
      const filtered = prev.loadouts.filter((l) => l.id !== loadoutId);
      const nextActive =
        prev.activeLoadoutId === loadoutId ? filtered[0].id : prev.activeLoadoutId;
      return {
        ...prev,
        loadouts: filtered,
        activeLoadoutId: nextActive,
      };
    });
  }, []);

  const handleUpgradeStat = useCallback(
    (chassisId: string, key: keyof BotUpgrades) => {
      setProgress((prev) => {
        const currentUpgrades = prev.upgradesByBot[chassisId] ?? {
          armor: 1,
          weapon: 1,
          drive: 1,
          wedge: 1,
        };
        const curLevel = currentUpgrades[key];
        const cost = getUpgradeCost(curLevel);
        if (curLevel >= 5 || prev.scrap < cost) return prev;

        return {
          ...prev,
          scrap: prev.scrap - cost,
          upgradesByBot: {
            ...prev.upgradesByBot,
            [chassisId]: {
              ...currentUpgrades,
              [key]: curLevel + 1,
            },
          },
        };
      });
    },
    []
  );

  const handleUnlockBot = useCallback((botId: string) => {
    const arch = getArchetype(botId);
    setProgress((prev) => {
      if (prev.unlockedBotIds.includes(botId) || prev.scrap < arch.unlockCost) {
        return prev;
      }
      return {
        ...prev,
        scrap: prev.scrap - arch.unlockCost,
        unlockedBotIds: [...prev.unlockedBotIds, botId],
      };
    });
  }, []);

  const handleSelectChassisForLoadout = useCallback((botId: string) => {
    const arch = getArchetype(botId);
    setProgress((prev) => {
      const current =
        prev.loadouts.find((l) => l.id === prev.activeLoadoutId) ??
        prev.loadouts[0];
      const updated: BotLoadout = {
        ...current,
        chassisId: botId,
        primaryWeapon: arch.defaultWeapon,
        secondaryWeapon: arch.defaultSecondary,
        armorType: arch.defaultArmor,
        visual: arch.defaultVisual,
        updatedAt: Date.now(),
      };
      return {
        ...prev,
        selectedBotId: botId,
        loadouts: prev.loadouts.map((l) => (l.id === updated.id ? updated : l)),
      };
    });
  }, []);

  const appendReplay = useCallback(
    (prev: PlayerProgress, replay: SavedReplay): SavedReplay[] => {
      const next = [replay, ...prev.recentMatches];
      // Keep up to 8 recent/saved replays
      const saved = next.filter((r) => prev.savedReplayIds.includes(r.id));
      const unsaved = next
        .filter((r) => !prev.savedReplayIds.includes(r.id))
        .slice(0, 5);
      const merged = [...saved, ...unsaved].sort(
        (a, b) => b.createdAt - a.createdAt
      );
      return merged.slice(0, 8);
    },
    []
  );

  const handleMatchFinished = useCallback(
    (result: MatchResult, replay: SavedReplay) => {
      setProgress((prev) => {
        let nextTournament = prev.activeTournament;
        let bonusScrap = 0;
        let bonusPoints = 0;
        let nextTournamentsWon = prev.tournamentsWon;
        let nextUnlocked = prev.unlockedBotIds;

        if (activeTournamentMatchId && nextTournament) {
          const winnerCorner =
            result.winner === 'player'
              ? 'red'
              : result.winner === 'opponent'
                ? 'blue'
                : 'draw';
          nextTournament = resolveTournamentMatch(
            nextTournament,
            activeTournamentMatchId,
            winnerCorner,
            result.winMethod,
            replay.id
          );

          if (
            nextTournament.status === 'champion' &&
            !nextTournament.rewardClaimed
          ) {
            const cfg = TOURNAMENT_TIER_CONFIG[nextTournament.tier];
            bonusScrap = cfg.scrapReward;
            bonusPoints = cfg.statPointsReward;
            nextTournamentsWon += 1;

            let unlockedBotName: string | undefined;
            if (cfg.unlocksChassisOnWin) {
              const candidate = getLockedChassisCandidate(nextUnlocked);
              if (candidate) {
                nextUnlocked = [...nextUnlocked, candidate];
                unlockedBotName = getArchetype(candidate).name;
              }
            }

            nextTournament = {
              ...nextTournament,
              rewardClaimed: true,
              unlockedRewardBotName: unlockedBotName,
            };
          }
        }

        return {
          ...prev,
          scrap: prev.scrap + result.scrapEarned + bonusScrap,
          wins: prev.wins + (result.winner === 'player' ? 1 : 0),
          losses: prev.losses + (result.winner === 'opponent' ? 1 : 0),
          knockouts:
            prev.knockouts +
            (result.winner === 'player' && result.winMethod === 'KO' ? 1 : 0),
          tournamentsWon: nextTournamentsWon,
          unlockedBotIds: nextUnlocked,
          bonusStatPoints: Math.min(
            24,
            prev.bonusStatPoints + result.bonusPointsEarned + bonusPoints
          ),
          recentMatches: appendReplay(prev, replay),
          activeTournament: nextTournament,
        };
      });
    },
    [appendReplay, activeTournamentMatchId]
  );

  const handleSaveSpectateReplay = useCallback(
    (replay: SavedReplay) => {
      setProgress((prev) => {
        let nextTournament = prev.activeTournament;
        if (activeSpectateTournamentMatchId && nextTournament) {
          nextTournament = resolveTournamentMatch(
            nextTournament,
            activeSpectateTournamentMatchId,
            replay.winnerCorner,
            replay.winMethod,
            replay.id
          );
        }
        return {
          ...prev,
          recentMatches: appendReplay(prev, replay),
          activeTournament: nextTournament,
        };
      });
    },
    [appendReplay, activeSpectateTournamentMatchId]
  );

  const handleToggleSaveReplay = useCallback((replayId: string) => {
    setProgress((prev) => {
      const exists = prev.savedReplayIds.includes(replayId);
      return {
        ...prev,
        savedReplayIds: exists
          ? prev.savedReplayIds.filter((id) => id !== replayId)
          : [...prev.savedReplayIds, replayId],
      };
    });
  }, []);

  const handleDeleteReplay = useCallback((replayId: string) => {
    setProgress((prev) => ({
      ...prev,
      recentMatches: prev.recentMatches.filter((r) => r.id !== replayId),
      savedReplayIds: prev.savedReplayIds.filter((id) => id !== replayId),
    }));
  }, []);

  const handleQuickStartMatch = () => {
    setActiveTournamentMatchId(null);
    setActiveSpectateTournamentMatchId(null);
    setMatchMode('player_vs_ai');
    setSpectateConfig(null);
    setActiveReplay(null);
    setActiveView('arena');
    setAutoStartSignal((n) => n + 1);
  };

  const handleJoinSpectatorMatch = (match: OngoingSpectatorMatch) => {
    setActiveTournamentMatchId(null);
    setActiveSpectateTournamentMatchId(null);
    setMatchMode('spectate');
    setActiveReplay(null);
    setSpectateConfig({
      title: match.title,
      redChassisId: match.redChassisId,
      blueChassisId: match.blueChassisId,
      difficulty: match.difficulty,
      hazardIntensity: match.hazardIntensity,
      initialElapsed: match.elapsedSeconds,
      initialRedPct: match.redHpPct,
      initialBluePct: match.blueHpPct,
    });
    setActiveView('arena');
  };

  const handleStartCustomSpectate = (
    redId: string,
    blueId: string,
    diff: DifficultyLevel,
    hz: 'standard' | 'mayhem'
  ) => {
    const rName = getArchetype(redId).name;
    const bName = getArchetype(blueId).name;
    setActiveTournamentMatchId(null);
    setActiveSpectateTournamentMatchId(null);
    setMatchMode('spectate');
    setActiveReplay(null);
    setSpectateConfig({
      title: `Exhibition: ${rName} vs ${bName}`,
      redChassisId: redId,
      blueChassisId: blueId,
      difficulty: diff,
      hazardIntensity: hz,
    });
    setActiveView('arena');
  };

  const handleStartNewTournament = (tier: TournamentTier) => {
    const bracket = createTournamentBracket(
      activeLoadout.name,
      activeLoadout.chassisId,
      tier
    );
    setActiveTournamentMatchId(null);
    setActiveSpectateTournamentMatchId(null);
    setProgress((prev) => ({
      ...prev,
      activeTournament: bracket,
    }));
  };

  const handlePlayTournamentMatch = (match: TournamentMatch) => {
    const bracket = progress.activeTournament;
    if (!bracket || !match.red || !match.blue) return;
    const opponent = match.red.isPlayer ? match.blue : match.red;

    setSelectedOpponentId(opponent.chassisId);
    setDifficulty(bracket.difficulty);
    setHazardIntensity(bracket.hazardIntensity);
    setActiveTournamentMatchId(match.id);
    setActiveSpectateTournamentMatchId(null);
    setMatchMode('player_vs_ai');
    setSpectateConfig(null);
    setActiveReplay(null);
    setActiveView('arena');
    setAutoStartSignal((n) => n + 1);
  };

  const handleSpectateTournamentMatch = (match: TournamentMatch) => {
    const bracket = progress.activeTournament;
    if (!bracket || !match.red || !match.blue) return;
    setActiveTournamentMatchId(null);
    setActiveSpectateTournamentMatchId(match.id);
    setMatchMode('spectate');
    setActiveReplay(null);
    setSpectateConfig({
      title: `${TOURNAMENT_TIER_CONFIG[bracket.tier].title}: ${match.red.name} vs ${match.blue.name}`,
      redChassisId: match.red.chassisId,
      blueChassisId: match.blue.chassisId,
      difficulty: bracket.difficulty,
      hazardIntensity: bracket.hazardIntensity,
    });
    setActiveView('arena');
  };

  const handleSimulateTournamentMatch = (matchId: string) => {
    setProgress((prev) => {
      if (!prev.activeTournament) return prev;
      const target = prev.activeTournament.matches.find((m) => m.id === matchId);
      if (!target || !target.red || !target.blue) return prev;
      const winnerCorner = Math.random() < 0.5 ? 'red' : 'blue';
      return {
        ...prev,
        activeTournament: resolveTournamentMatch(
          prev.activeTournament,
          matchId,
          winnerCorner,
          'Simulated'
        ),
      };
    });
  };

  const handleSimulateRemainingTournament = () => {
    setProgress((prev) => {
      if (!prev.activeTournament) return prev;
      return {
        ...prev,
        activeTournament: simulateRemainingTournamentMatches(prev.activeTournament),
      };
    });
  };

  const handleWatchReplay = (replay: SavedReplay) => {
    setActiveTournamentMatchId(null);
    setActiveSpectateTournamentMatchId(null);
    setMatchMode('replay');
    setSpectateConfig(null);
    setActiveReplay(replay);
    setActiveView('arena');
  };

  const handleSelectView = (view: GameView) => {
    if (view === 'arena' && matchMode !== 'player_vs_ai') {
      setMatchMode('player_vs_ai');
      setSpectateConfig(null);
      setActiveReplay(null);
      setActiveSpectateTournamentMatchId(null);
    }
    if (view !== 'arena') {
      setActiveTournamentMatchId(null);
      setActiveSpectateTournamentMatchId(null);
    }
    setActiveView(view);
  };

  return (
    <div className="min-h-screen bg-[#0D1014] text-slate-100 flex flex-col">
      <TopBar
        activeView={activeView}
        onSelectView={handleSelectView}
        onQuickStartMatch={handleQuickStartMatch}
      />

      <main className="flex-1">
        {activeView === 'arena' && (
          <ArenaView
            progress={progress}
            activeLoadout={activeLoadout}
            selectedOpponentId={selectedOpponentId}
            difficulty={difficulty}
            controlMode={controlMode}
            hazardIntensity={hazardIntensity}
            matchMode={matchMode}
            spectateConfig={spectateConfig}
            activeReplay={activeReplay}
            autoStartSignal={autoStartSignal}
            onChangeOpponent={setSelectedOpponentId}
            onChangeDifficulty={setDifficulty}
            onChangeControlMode={setControlMode}
            onChangeHazardIntensity={setHazardIntensity}
            onMatchFinished={handleMatchFinished}
            onSaveSpectateReplay={handleSaveSpectateReplay}
            onToggleSaveReplay={handleToggleSaveReplay}
            onExitSpecialMode={() => {
              const wasTournamentSpectate = activeSpectateTournamentMatchId !== null;
              setMatchMode('player_vs_ai');
              setSpectateConfig(null);
              setActiveReplay(null);
              setActiveSpectateTournamentMatchId(null);
              setActiveView(wasTournamentSpectate ? 'tournament' : 'broadcast');
            }}
            onGoToWorkshop={() => {
              setActiveTournamentMatchId(null);
              setMatchMode('player_vs_ai');
              setActiveView('workshop');
            }}
            isTournamentMatch={activeTournamentMatchId !== null}
            onBackToTournament={() => {
              setActiveTournamentMatchId(null);
              setMatchMode('player_vs_ai');
              setActiveView('tournament');
            }}
          />
        )}

        {activeView === 'workshop' && (
          <WorkshopView
            progress={progress}
            activeLoadout={activeLoadout}
            onUpdateLoadout={handleUpdateLoadout}
            onSaveAsNewLoadout={handleSaveAsNewLoadout}
            onSelectLoadout={handleSelectLoadout}
            onDeleteLoadout={handleDeleteLoadout}
            onUpgradeStat={handleUpgradeStat}
            onGoToArena={handleQuickStartMatch}
          />
        )}

        {activeView === 'roster' && (
          <RosterView
            progress={progress}
            selectedOpponentId={selectedOpponentId}
            onUnlockBot={handleUnlockBot}
            onSelectChassisForLoadout={handleSelectChassisForLoadout}
            onSelectOpponent={setSelectedOpponentId}
            onGoToWorkshop={() => setActiveView('workshop')}
            onGoToArena={() => {
              setMatchMode('player_vs_ai');
              setActiveView('arena');
            }}
          />
        )}

        {activeView === 'tournament' && (
          <TournamentView
            progress={progress}
            activeLoadout={activeLoadout}
            bracket={progress.activeTournament}
            onStartNewTournament={handleStartNewTournament}
            onPlayTournamentMatch={handlePlayTournamentMatch}
            onSpectateTournamentMatch={handleSpectateTournamentMatch}
            onSimulateMatch={handleSimulateTournamentMatch}
            onSimulateRemaining={handleSimulateRemainingTournament}
            onWatchReplay={handleWatchReplay}
            onGoToBroadcast={() => setActiveView('broadcast')}
          />
        )}

        {activeView === 'broadcast' && (
          <BroadcastView
            ongoingMatches={ongoingMatches}
            recentMatches={progress.recentMatches}
            savedReplayIds={progress.savedReplayIds}
            activeTournament={progress.activeTournament}
            onJoinSpectatorMatch={handleJoinSpectatorMatch}
            onStartCustomSpectate={handleStartCustomSpectate}
            onSpectateTournamentMatch={handleSpectateTournamentMatch}
            onGoToTournament={() => setActiveView('tournament')}
            onWatchReplay={handleWatchReplay}
            onToggleSaveReplay={handleToggleSaveReplay}
            onDeleteReplay={handleDeleteReplay}
          />
        )}
      </main>
    </div>
  );
}
