import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Pause, Play, RotateCcw } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import {
  BOT_ARCHETYPES,
  DIFFICULTY_CONFIG,
  getArchetype,
  PRIMARY_WEAPONS,
  SECONDARY_WEAPONS,
} from '../data/bots';
import {
  ARENA_H,
  ARENA_W,
  ArenaWorld,
  BotSpawnConfig,
  createArenaWorld,
  InputState,
  MATCH_DURATION,
  recordReplayFrame,
  stepArenaWorld,
} from '../engine/physics';
import { CameraState, renderArenaWorld } from '../engine/renderer';
import {
  createReplayWorldFromMeta,
  renderReplayAtTime,
} from '../engine/replayRenderer';
import {
  BotLoadout,
  CameraMode,
  ControlMode,
  DifficultyLevel,
  MatchMode,
  MatchPhase,
  MatchResult,
  PlayerProgress,
  SavedReplay,
} from '../types/game';

interface HudSnapshot {
  redHp: number;
  redMaxHp: number;
  blueHp: number;
  blueMaxHp: number;
  elapsed: number;
  redPrimaryCd: number;
  redSecondaryCd: number;
  redBoostCd: number;
  redDamage: number;
  blueDamage: number;
}

interface ArenaViewProps {
  progress: PlayerProgress;
  activeLoadout: BotLoadout;
  selectedOpponentId: string;
  difficulty: DifficultyLevel;
  controlMode: ControlMode;
  hazardIntensity: 'standard' | 'mayhem';
  matchMode: MatchMode;
  spectateConfig: {
    title: string;
    redChassisId: string;
    blueChassisId: string;
    difficulty: DifficultyLevel;
    hazardIntensity: 'standard' | 'mayhem';
    initialElapsed?: number;
    initialRedPct?: number;
    initialBluePct?: number;
  } | null;
  activeReplay: SavedReplay | null;
  autoStartSignal: number;
  onChangeOpponent: (id: string) => void;
  onChangeDifficulty: (d: DifficultyLevel) => void;
  onChangeControlMode: (c: ControlMode) => void;
  onChangeHazardIntensity: (h: 'standard' | 'mayhem') => void;
  onMatchFinished: (result: MatchResult, replay: SavedReplay) => void;
  onSaveSpectateReplay: (replay: SavedReplay) => void;
  onToggleSaveReplay: (replayId: string) => void;
  onExitSpecialMode: () => void;
  onGoToWorkshop: () => void;
  isTournamentMatch?: boolean;
  onBackToTournament?: () => void;
}

const CAMERA_LABELS: { id: CameraMode; label: string }[] = [
  { id: 'fixed', label: 'Fixed' },
  { id: 'action', label: 'Action Cam' },
  { id: 'follow_red', label: 'Follow Red' },
  { id: 'follow_blue', label: 'Follow Blue' },
  { id: 'free', label: 'Free-Cam' },
];

export function ArenaView({
  progress,
  activeLoadout,
  selectedOpponentId,
  difficulty,
  controlMode,
  hazardIntensity,
  matchMode,
  spectateConfig,
  activeReplay,
  autoStartSignal,
  onChangeOpponent,
  onChangeDifficulty,
  onChangeControlMode,
  onChangeHazardIntensity,
  onMatchFinished,
  onSaveSpectateReplay,
  onToggleSaveReplay,
  onExitSpecialMode,
  onGoToWorkshop,
  isTournamentMatch = false,
  onBackToTournament,
}: ArenaViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<ArenaWorld | null>(null);
  const replayWorldRef = useRef<ReturnType<typeof createReplayWorldFromMeta> | null>(null);

  const [phase, setPhase] = useState<MatchPhase>('pre_match');
  const [countdownText, setCountdownText] = useState<string>('3');
  const [muted, setMuted] = useState<boolean>(soundEngine.isMuted());
  const [cameraMode, setCameraMode] = useState<CameraMode>('fixed');
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);
  const [lastReplayId, setLastReplayId] = useState<string | null>(null);

  // Replay playback state
  const [replayPlaying, setReplayPlaying] = useState(true);
  const [replayTime, setReplayTime] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState<0.5 | 1 | 2>(1);
  const replayTimeRef = useRef(0);

  const [hud, setHud] = useState<HudSnapshot>({
    redHp: 210,
    redMaxHp: 210,
    blueHp: 210,
    blueMaxHp: 210,
    elapsed: 0,
    redPrimaryCd: 0,
    redSecondaryCd: 0,
    redBoostCd: 0,
    redDamage: 0,
    blueDamage: 0,
  });

  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    primary: false,
    secondary: false,
    boost: false,
    mouseX: ARENA_W / 2,
    mouseY: ARENA_H / 2,
    mouseMoved: false,
  });

  const camStateRef = useRef<CameraState>({
    x: ARENA_W / 2,
    y: ARENA_H / 2,
    zoom: 1,
  });
  const freeCamRef = useRef<CameraState>({
    x: ARENA_W / 2,
    y: ARENA_H / 2,
    zoom: 1.15,
  });
  const draggingFreeCamRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  const buildWorldForMatch = useCallback(() => {
    if (matchMode === 'spectate' && spectateConfig) {
      const redArch = getArchetype(spectateConfig.redChassisId);
      const blueArch = getArchetype(spectateConfig.blueChassisId);
      const redCfg: BotSpawnConfig = {
        id: 'spectate-red',
        name: redArch.name,
        corner: 'red',
        isPlayer: false,
        chassisId: redArch.id,
        primaryWeapon: redArch.defaultWeapon,
        secondaryWeapon: redArch.defaultSecondary,
        armorType: redArch.defaultArmor,
        visual: redArch.defaultVisual,
        upgrades: { armor: 2, weapon: 2, drive: 2, wedge: 2 },
        statAllocation: { speed: 4, durability: 4, power: 4 },
      };
      const blueCfg: BotSpawnConfig = {
        id: 'spectate-blue',
        name: blueArch.name,
        corner: 'blue',
        isPlayer: false,
        chassisId: blueArch.id,
        primaryWeapon: blueArch.defaultWeapon,
        secondaryWeapon: blueArch.defaultSecondary,
        armorType: blueArch.defaultArmor,
        visual: blueArch.defaultVisual,
        upgrades: { armor: 2, weapon: 2, drive: 2, wedge: 2 },
        statAllocation: { speed: 4, durability: 4, power: 4 },
      };
      const w = createArenaWorld(redCfg, blueCfg, spectateConfig.hazardIntensity);
      if (spectateConfig.initialRedPct !== undefined) {
        w.red.hp = Math.max(20, (w.red.maxHp * spectateConfig.initialRedPct) / 100);
      }
      if (spectateConfig.initialBluePct !== undefined) {
        w.blue.hp = Math.max(20, (w.blue.maxHp * spectateConfig.initialBluePct) / 100);
      }
      if (spectateConfig.initialElapsed) {
        w.elapsed = spectateConfig.initialElapsed;
      }
      recordReplayFrame(w);
      return w;
    }

    // Player vs AI world
    const oppArch = getArchetype(selectedOpponentId);
    const playerUpgrades = progress.upgradesByBot[activeLoadout.chassisId] ?? {
      armor: 1,
      weapon: 1,
      drive: 1,
      wedge: 1,
    };
    const oppTierLevel =
      difficulty === 'hard' ? 4 : difficulty === 'medium' ? 2 : 1;

    const redCfg: BotSpawnConfig = {
      id: 'player',
      name: activeLoadout.name,
      corner: 'red',
      isPlayer: true,
      chassisId: activeLoadout.chassisId,
      primaryWeapon: activeLoadout.primaryWeapon,
      secondaryWeapon: activeLoadout.secondaryWeapon,
      armorType: activeLoadout.armorType,
      visual: activeLoadout.visual,
      upgrades: playerUpgrades,
      statAllocation: activeLoadout.statAllocation,
    };

    const blueCfg: BotSpawnConfig = {
      id: 'opponent',
      name: oppArch.name,
      corner: 'blue',
      isPlayer: false,
      chassisId: oppArch.id,
      primaryWeapon: oppArch.defaultWeapon,
      secondaryWeapon: oppArch.defaultSecondary,
      armorType: oppArch.defaultArmor,
      visual: {
        ...oppArch.defaultVisual,
        primaryColor:
          oppArch.defaultVisual.primaryColor === activeLoadout.visual.primaryColor
            ? '#DC2626'
            : oppArch.defaultVisual.primaryColor,
      },
      upgrades: {
        armor: oppTierLevel,
        weapon: oppTierLevel,
        drive: oppTierLevel,
        wedge: oppTierLevel,
      },
      statAllocation: { speed: 4, durability: 4, power: 4 },
    };

    const w = createArenaWorld(redCfg, blueCfg, hazardIntensity);
    recordReplayFrame(w);
    return w;
  }, [
    matchMode,
    spectateConfig,
    selectedOpponentId,
    progress.upgradesByBot,
    activeLoadout,
    difficulty,
    hazardIntensity,
  ]);

  const startBattleCountdown = useCallback(() => {
    const world = buildWorldForMatch();
    worldRef.current = world;
    setLastResult(null);
    setLastReplayId(null);
    camStateRef.current = { x: ARENA_W / 2, y: ARENA_H / 2, zoom: 1 };
    freeCamRef.current = { x: ARENA_W / 2, y: ARENA_H / 2, zoom: 1.15 };

    setHud({
      redHp: world.red.hp,
      redMaxHp: world.red.maxHp,
      blueHp: world.blue.hp,
      blueMaxHp: world.blue.maxHp,
      elapsed: world.elapsed,
      redPrimaryCd: 0,
      redSecondaryCd: 0,
      redBoostCd: 0,
      redDamage: 0,
      blueDamage: 0,
    });

    if (matchMode === 'spectate') {
      setPhase('fighting');
      return;
    }

    setPhase('countdown');
    setCountdownText('3');
    soundEngine.playCountdown(false);
  }, [buildWorldForMatch, matchMode]);

  // Trigger start from TopBar CTA or Spectate entry
  useEffect(() => {
    if (matchMode === 'replay' && activeReplay) {
      replayWorldRef.current = createReplayWorldFromMeta(activeReplay);
      replayTimeRef.current = 0;
      setReplayTime(0);
      setReplayPlaying(true);
      setCameraMode('action');
      setPhase('fighting');
      return;
    }

    if (matchMode === 'spectate' && spectateConfig) {
      setCameraMode('action');
      startBattleCountdown();
      return;
    }

    if (autoStartSignal > 0 && matchMode === 'player_vs_ai') {
      setCameraMode('fixed');
      startBattleCountdown();
    }
  }, [
    autoStartSignal,
    matchMode,
    spectateConfig,
    activeReplay,
    startBattleCountdown,
  ]);

  // Countdown sequence
  useEffect(() => {
    if (phase !== 'countdown') return;

    const t1 = setTimeout(() => {
      setCountdownText('2');
      soundEngine.playCountdown(false);
    }, 650);
    const t2 = setTimeout(() => {
      setCountdownText('1');
      soundEngine.playCountdown(false);
    }, 1300);
    const t3 = setTimeout(() => {
      setCountdownText('FIGHT!');
      soundEngine.playCountdown(true);
    }, 1950);
    const t4 = setTimeout(() => {
      setPhase('fighting');
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [phase]);

  // Initialize static preview world on pre_match
  useEffect(() => {
    if (matchMode === 'player_vs_ai' && phase === 'pre_match') {
      const world = buildWorldForMatch();
      worldRef.current = world;
      setHud({
        redHp: world.red.hp,
        redMaxHp: world.red.maxHp,
        blueHp: world.blue.hp,
        blueMaxHp: world.blue.maxHp,
        elapsed: 0,
        redPrimaryCd: 0,
        redSecondaryCd: 0,
        redBoostCd: 0,
        redDamage: 0,
        blueDamage: 0,
      });
    }
  }, [matchMode, phase, buildWorldForMatch]);

  // Keyboard & Mouse Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') inputRef.current.up = true;
      if (k === 's' || e.key === 'ArrowDown') inputRef.current.down = true;
      if (k === 'a' || e.key === 'ArrowLeft') inputRef.current.left = true;
      if (k === 'd' || e.key === 'ArrowRight') inputRef.current.right = true;
      if (e.code === 'Space') {
        if (phase === 'fighting') e.preventDefault();
        inputRef.current.primary = true;
      }
      if (k === 'e') inputRef.current.secondary = true;
      if (e.key === 'Shift') inputRef.current.boost = true;

      if (e.key === 'Escape' || k === 'p') {
        if (matchMode === 'player_vs_ai') {
          setPhase((prev) =>
            prev === 'fighting'
              ? 'paused'
              : prev === 'paused'
                ? 'fighting'
                : prev
          );
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') inputRef.current.up = false;
      if (k === 's' || e.key === 'ArrowDown') inputRef.current.down = false;
      if (k === 'a' || e.key === 'ArrowLeft') inputRef.current.left = false;
      if (k === 'd' || e.key === 'ArrowRight') inputRef.current.right = false;
      if (e.code === 'Space') inputRef.current.primary = false;
      if (k === 'e') inputRef.current.secondary = false;
      if (e.key === 'Shift') inputRef.current.boost = false;
    };

    const onBlur = () => {
      inputRef.current.up = false;
      inputRef.current.down = false;
      inputRef.current.left = false;
      inputRef.current.right = false;
      inputRef.current.primary = false;
      inputRef.current.secondary = false;
      inputRef.current.boost = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [phase, matchMode]);

  // Main 60FPS Game / Spectate / Replay Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();
    let hudAccumulator = 0;

    const finalizeMatch = (world: ArenaWorld) => {
      recordReplayFrame(world);
      const redPct = world.red.hp / world.red.maxHp;
      const bluePct = world.blue.hp / world.blue.maxHp;

      let winnerCorner: 'red' | 'blue' | 'draw' = 'draw';
      let winMethod: 'KO' | 'Judges Decision' = 'Judges Decision';

      if (world.blue.hp <= 0 && world.red.hp > 0) {
        winnerCorner = 'red';
        winMethod = 'KO';
      } else if (world.red.hp <= 0 && world.blue.hp > 0) {
        winnerCorner = 'blue';
        winMethod = 'KO';
      } else if (world.red.hp <= 0 && world.blue.hp <= 0) {
        winnerCorner = 'draw';
        winMethod = 'KO';
      } else {
        const redScore = redPct * 100 + world.red.damageDealt * 0.25;
        const blueScore = bluePct * 100 + world.blue.damageDealt * 0.25;
        if (Math.abs(redScore - blueScore) < 1) winnerCorner = 'draw';
        else winnerCorner = redScore > blueScore ? 'red' : 'blue';
      }

      const activeDiff =
        matchMode === 'spectate' && spectateConfig
          ? spectateConfig.difficulty
          : difficulty;

      const replay: SavedReplay = {
        id: `replay-${Date.now()}`,
        createdAt: Date.now(),
        title: `${world.red.name} vs ${world.blue.name}`,
        mode: matchMode === 'spectate' ? 'spectate' : 'player_vs_ai',
        difficulty: activeDiff,
        winnerCorner,
        winMethod,
        duration: world.elapsed,
        redMeta: {
          name: world.red.name,
          chassisId: world.red.chassisId,
          primaryWeapon: world.red.primaryWeapon,
          secondaryWeapon: world.red.secondaryWeapon,
          armorType: world.red.armorType,
          visual: world.red.visual,
          upgrades: world.red.upgrades,
          radius: world.red.radius,
          maxHp: world.red.maxHp,
        },
        blueMeta: {
          name: world.blue.name,
          chassisId: world.blue.chassisId,
          primaryWeapon: world.blue.primaryWeapon,
          secondaryWeapon: world.blue.secondaryWeapon,
          armorType: world.blue.armorType,
          visual: world.blue.visual,
          upgrades: world.blue.upgrades,
          radius: world.blue.radius,
          maxHp: world.blue.maxHp,
        },
        redDamageDealt: Math.round(world.red.damageDealt),
        blueDamageDealt: Math.round(world.blue.damageDealt),
        frames: world.replayFrames,
      };

      setLastReplayId(replay.id);

      const redBreakdown = {
        ...world.red.combatStats,
        hazardsTakenByType: { ...world.red.combatStats.hazardsTakenByType },
      };
      const blueBreakdown = {
        ...world.blue.combatStats,
        hazardsTakenByType: { ...world.blue.combatStats.hazardsTakenByType },
      };

      if (matchMode === 'spectate') {
        onSaveSpectateReplay(replay);
        setLastResult({
          winner:
            winnerCorner === 'red'
              ? 'player'
              : winnerCorner === 'blue'
                ? 'opponent'
                : 'draw',
          winMethod,
          duration: world.elapsed,
          playerDamageDealt: Math.round(world.red.damageDealt),
          opponentDamageDealt: Math.round(world.blue.damageDealt),
          playerHazardDamage: Math.round(world.red.hazardDamageDealt),
          redBreakdown,
          blueBreakdown,
          scrapEarned: 0,
          bonusPointsEarned: 0,
          difficulty: activeDiff,
          replayId: replay.id,
        });
        setPhase('ended');
        return;
      }

      const won = winnerCorner === 'red';
      soundEngine.playVictoryHorn(won);

      const mult = DIFFICULTY_CONFIG[difficulty].scrapMultiplier;
      const baseScrap = won ? 110 : 42;
      const koBonus = won && winMethod === 'KO' ? 40 : 0;
      const dmgBonus = Math.min(45, Math.round(world.red.damageDealt * 0.14));
      const scrapEarned = Math.round((baseScrap + koBonus + dmgBonus) * mult);
      const bonusPointsEarned = won ? (difficulty === 'hard' ? 2 : 1) : 0;

      const result: MatchResult = {
        winner:
          winnerCorner === 'red'
            ? 'player'
            : winnerCorner === 'blue'
              ? 'opponent'
              : 'draw',
        winMethod,
        duration: world.elapsed,
        playerDamageDealt: Math.round(world.red.damageDealt),
        opponentDamageDealt: Math.round(world.blue.damageDealt),
        playerHazardDamage: Math.round(world.red.hazardDamageDealt),
        redBreakdown,
        blueBreakdown,
        scrapEarned,
        bonusPointsEarned,
        difficulty,
        replayId: replay.id,
      };

      setLastResult(result);
      setPhase('ended');
      onMatchFinished(result, replay);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Free-cam keyboard panning when in Free-Cam during Spectate or Replay
      if (cameraMode === 'free' && (matchMode === 'spectate' || matchMode === 'replay')) {
        const panSpeed = (440 / freeCamRef.current.zoom) * dt;
        if (inputRef.current.left) freeCamRef.current.x -= panSpeed;
        if (inputRef.current.right) freeCamRef.current.x += panSpeed;
        if (inputRef.current.up) freeCamRef.current.y -= panSpeed;
        if (inputRef.current.down) freeCamRef.current.y += panSpeed;
        freeCamRef.current.x = Math.max(100, Math.min(ARENA_W - 100, freeCamRef.current.x));
        freeCamRef.current.y = Math.max(80, Math.min(ARENA_H - 80, freeCamRef.current.y));
      }

      // REPLAY MODE
      if (matchMode === 'replay' && activeReplay && replayWorldRef.current) {
        if (replayPlaying) {
          replayTimeRef.current += dt * replaySpeed;
          if (replayTimeRef.current >= activeReplay.duration) {
            replayTimeRef.current = activeReplay.duration;
            setReplayPlaying(false);
          }
        }
        const { nextCam, frame } = renderReplayAtTime(
          ctx,
          activeReplay,
          replayWorldRef.current,
          replayTimeRef.current,
          cameraMode,
          camStateRef.current,
          freeCamRef.current,
          dt
        );
        camStateRef.current = nextCam;

        hudAccumulator += dt;
        if (hudAccumulator >= 0.06 && frame) {
          hudAccumulator = 0;
          setReplayTime(replayTimeRef.current);
          setHud({
            redHp: frame.red.hp,
            redMaxHp: frame.red.maxHp,
            blueHp: frame.blue.hp,
            blueMaxHp: frame.blue.maxHp,
            elapsed: frame.t,
            redPrimaryCd: 0,
            redSecondaryCd: 0,
            redBoostCd: 0,
            redDamage: frame.red.damageDealt,
            blueDamage: frame.blue.damageDealt,
          });
        }
        rafId = requestAnimationFrame(tick);
        return;
      }

      const world = worldRef.current;
      if (world) {
        if (phase === 'fighting') {
          const activeDiff =
            matchMode === 'spectate' && spectateConfig
              ? spectateConfig.difficulty
              : difficulty;

          stepArenaWorld(world, inputRef.current, controlMode, activeDiff, dt);

          // End condition check
          if (
            world.red.hp <= 0 ||
            world.blue.hp <= 0 ||
            world.elapsed >= MATCH_DURATION
          ) {
            finalizeMatch(world);
          }
        }

        const effectiveCamMode =
          matchMode === 'player_vs_ai' ? 'fixed' : cameraMode;
        camStateRef.current = renderArenaWorld(
          ctx,
          world,
          effectiveCamMode,
          camStateRef.current,
          freeCamRef.current,
          dt
        );

        hudAccumulator += dt;
        if (hudAccumulator >= 0.06) {
          hudAccumulator = 0;
          setHud({
            redHp: world.red.hp,
            redMaxHp: world.red.maxHp,
            blueHp: world.blue.hp,
            blueMaxHp: world.blue.maxHp,
            elapsed: world.elapsed,
            redPrimaryCd: world.red.weaponCooldownTimer,
            redSecondaryCd: world.red.secondaryCooldownTimer,
            redBoostCd: world.red.boostCooldownTimer,
            redDamage: Math.round(world.red.damageDealt),
            blueDamage: Math.round(world.blue.damageDealt),
          });
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    phase,
    matchMode,
    difficulty,
    controlMode,
    cameraMode,
    spectateConfig,
    activeReplay,
    replayPlaying,
    replaySpeed,
    onMatchFinished,
    onSaveSpectateReplay,
  ]);

  const updateCanvasMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = ARENA_W / rect.width;
    const scaleY = ARENA_H / rect.height;
    inputRef.current.mouseX = (e.clientX - rect.left) * scaleX;
    inputRef.current.mouseY = (e.clientY - rect.top) * scaleY;
    inputRef.current.mouseMoved = true;

    if (draggingFreeCamRef.current.active && cameraMode === 'free') {
      const dx = (e.clientX - draggingFreeCamRef.current.lastX) * scaleX;
      const dy = (e.clientY - draggingFreeCamRef.current.lastY) * scaleY;
      freeCamRef.current.x = Math.max(
        100,
        Math.min(ARENA_W - 100, freeCamRef.current.x - dx / freeCamRef.current.zoom)
      );
      freeCamRef.current.y = Math.max(
        80,
        Math.min(ARENA_H - 80, freeCamRef.current.y - dy / freeCamRef.current.zoom)
      );
      draggingFreeCamRef.current.lastX = e.clientX;
      draggingFreeCamRef.current.lastY = e.clientY;
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (cameraMode === 'free' && (matchMode === 'spectate' || matchMode === 'replay')) {
      draggingFreeCamRef.current = {
        active: true,
        lastX: e.clientX,
        lastY: e.clientY,
      };
      return;
    }
    if (matchMode === 'player_vs_ai' && phase === 'fighting') {
      if (e.button === 0) inputRef.current.primary = true;
      if (e.button === 2) inputRef.current.secondary = true;
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    draggingFreeCamRef.current.active = false;
    if (e.button === 0) inputRef.current.primary = false;
    if (e.button === 2) inputRef.current.secondary = false;
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (cameraMode === 'free' && (matchMode === 'spectate' || matchMode === 'replay')) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      freeCamRef.current.zoom = Math.max(
        0.8,
        Math.min(2.2, freeCamRef.current.zoom + delta)
      );
    }
  };

  const toggleMute = () => {
    const next = !muted;
    soundEngine.setMuted(next);
    setMuted(next);
  };

  const formatClock = (sec: number) => {
    const rem =
      matchMode === 'replay'
        ? Math.max(0, sec)
        : Math.max(0, MATCH_DURATION - sec);
    const m = Math.floor(rem / 60);
    const s = Math.floor(rem % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const redTitle =
    matchMode === 'replay' && activeReplay
      ? activeReplay.redMeta.name
      : matchMode === 'spectate' && spectateConfig
        ? getArchetype(spectateConfig.redChassisId).name
        : activeLoadout.name;

  const blueTitle =
    matchMode === 'replay' && activeReplay
      ? activeReplay.blueMeta.name
      : matchMode === 'spectate' && spectateConfig
        ? getArchetype(spectateConfig.blueChassisId).name
        : getArchetype(selectedOpponentId).name;

  const isSavedReplay =
    lastReplayId !== null && progress.savedReplayIds.includes(lastReplayId);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      {/* Pre-Match Configuration Strip (Only in Player vs AI pre-match or ended) */}
      {matchMode === 'player_vs_ai' && phase === 'pre_match' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#14181F] px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-5">
            <div>
              <div className="text-xs text-slate-400">Your Bot (Red)</div>
              <div className="text-sm font-semibold text-slate-100">
                {activeLoadout.name} ·{' '}
                <span className="text-orange-400">
                  {PRIMARY_WEAPONS[activeLoadout.primaryWeapon].shortLabel}
                </span>
              </div>
            </div>

            <label className="text-xs text-slate-400">
              Opponent (Blue)
              <select
                value={selectedOpponentId}
                onChange={(e) => onChangeOpponent(e.target.value)}
                className="ml-2 rounded-md border border-white/15 bg-[#0D1014] px-2.5 py-1.5 text-xs font-medium text-slate-100"
              >
                {BOT_ARCHETYPES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({PRIMARY_WEAPONS[b.defaultWeapon].shortLabel})
                  </option>
                ))}
              </select>
            </label>

            {/* AI Difficulty Segmented Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">AI Difficulty</span>
              <div className="inline-flex rounded-md border border-white/10 bg-[#0D1014] p-0.5">
                {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onChangeDifficulty(d)}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      difficulty === d
                        ? 'bg-orange-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {DIFFICULTY_CONFIG[d].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drive Control Mode */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Controls</span>
              <div className="inline-flex rounded-md border border-white/10 bg-[#0D1014] p-0.5">
                <button
                  type="button"
                  onClick={() => onChangeControlMode('mouse_aim')}
                  className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    controlMode === 'mouse_aim'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mouse Aim
                </button>
                <button
                  type="button"
                  onClick={() => onChangeControlMode('rc_tank')}
                  className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    controlMode === 'rc_tank'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  RC Tank
                </button>
              </div>
            </div>

            {/* Hazard Intensity */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Hazards</span>
              <div className="inline-flex rounded-md border border-white/10 bg-[#0D1014] p-0.5">
                {(['standard', 'mayhem'] as const).map((hz) => (
                  <button
                    key={hz}
                    type="button"
                    onClick={() => onChangeHazardIntensity(hz)}
                    className={`rounded px-2.5 py-1 text-xs font-medium capitalize cursor-pointer ${
                      hazardIntensity === hz
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {hz}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={startBattleCountdown}
            className="rounded-md bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-500 cursor-pointer"
          >
            Enter BattleBox
          </button>
        </div>
      )}

      {/* Spectator / Replay Top Control Bar */}
      {(matchMode === 'spectate' || matchMode === 'replay') && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#14181F] px-5 py-3">
          <div className="flex items-center gap-4">
            <span className="font-display text-lg font-bold text-orange-400">
              {matchMode === 'spectate' ? 'Spectator Feed' : 'Match Replay'}
            </span>
            <span className="text-sm text-slate-200">
              {matchMode === 'spectate' && spectateConfig
                ? spectateConfig.title
                : activeReplay?.title}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400">Camera</span>
            <div className="inline-flex rounded-md border border-white/10 bg-[#0D1014] p-0.5">
              {CAMERA_LABELS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCameraMode(c.id)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    cameraMode === c.id
                      ? 'bg-orange-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {cameraMode === 'free' && (
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    freeCamRef.current.zoom = Math.max(
                      0.8,
                      freeCamRef.current.zoom - 0.15
                    );
                  }}
                  className="rounded border border-white/15 px-2 py-1 hover:bg-white/10 cursor-pointer"
                >
                  -
                </button>
                <span>Zoom</span>
                <button
                  type="button"
                  onClick={() => {
                    freeCamRef.current.zoom = Math.min(
                      2.2,
                      freeCamRef.current.zoom + 0.15
                    );
                  }}
                  className="rounded border border-white/15 px-2 py-1 hover:bg-white/10 cursor-pointer"
                >
                  +
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onExitSpecialMode}
              className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 cursor-pointer"
            >
              Exit to Broadcast
            </button>
          </div>
        </div>
      )}

      {/* Unobtrusive Top Combat HUD */}
      <div className="mb-3 grid grid-cols-1 items-center gap-4 rounded-xl border border-white/10 bg-[#14181F] px-5 py-3 md:grid-cols-12">
        {/* Red Corner Meter */}
        <div className="md:col-span-5 space-y-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-display text-lg font-bold text-red-400">
              {redTitle}
            </span>
            <span className="font-mono-tabular text-xs font-semibold text-slate-200">
              {Math.ceil(hud.redHp)} / {hud.redMaxHp} HP · {hud.redDamage} DMG
            </span>
          </div>
          <div className="h-3 w-full rounded bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-red-500 transition-[width] duration-75"
              style={{
                width: `${Math.max(0, (hud.redHp / Math.max(1, hud.redMaxHp)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Center Timer & Quick Utility */}
        <div className="md:col-span-2 flex items-center justify-center gap-3">
          <div className="text-center">
            <div className="font-mono-tabular text-2xl font-bold text-slate-100">
              {formatClock(hud.elapsed)}
            </div>
            <div className="text-[11px] text-slate-400">
              {matchMode === 'replay'
                ? 'Replay'
                : matchMode === 'spectate'
                  ? 'Spectate'
                  : `${DIFFICULTY_CONFIG[difficulty].label} AI`}
            </div>
          </div>

          <button
            type="button"
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            onClick={toggleMute}
            className="rounded-md border border-white/10 p-2 text-slate-300 hover:bg-white/5 cursor-pointer"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {matchMode === 'player_vs_ai' &&
            (phase === 'fighting' || phase === 'paused') && (
              <button
                type="button"
                aria-label={phase === 'paused' ? 'Resume match' : 'Pause match'}
                onClick={() =>
                  setPhase((p) => (p === 'fighting' ? 'paused' : 'fighting'))
                }
                className="rounded-md border border-white/10 p-2 text-slate-300 hover:bg-white/5 cursor-pointer"
              >
                {phase === 'paused' ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </button>
            )}
        </div>

        {/* Blue Corner Meter */}
        <div className="md:col-span-5 space-y-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-mono-tabular text-xs font-semibold text-slate-200">
              {Math.ceil(hud.blueHp)} / {hud.blueMaxHp} HP · {hud.blueDamage} DMG
            </span>
            <span className="font-display text-lg font-bold text-blue-400">
              {blueTitle}
            </span>
          </div>
          <div className="h-3 w-full rounded bg-slate-800 overflow-hidden">
            <div
              className="ml-auto h-full bg-blue-500 transition-[width] duration-75"
              style={{
                width: `${Math.max(0, (hud.blueHp / Math.max(1, hud.blueMaxHp)) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Arena Canvas Stage */}
      <div className="relative overflow-hidden rounded-xl border border-white/15 bg-[#090B0E]">
        <canvas
          ref={canvasRef}
          width={ARENA_W}
          height={ARENA_H}
          onMouseMove={updateCanvasMouse}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleWheelZoom}
          onContextMenu={(e) => e.preventDefault()}
          className={`block w-full h-auto aspect-[5/3] ${
            cameraMode === 'free' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
          }`}
        />

        {/* Countdown Overlay */}
        {phase === 'countdown' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="font-display text-7xl font-bold tracking-wider text-orange-400 drop-shadow-lg">
              {countdownText}
            </div>
          </div>
        )}

        {/* Pause Overlay */}
        {phase === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#14181F] p-6 text-center space-y-5">
              <h2 className="font-display text-3xl font-bold text-slate-100">
                Match Paused
              </h2>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-slate-400">Drive Mode:</span>
                <button
                  type="button"
                  onClick={() =>
                    onChangeControlMode(
                      controlMode === 'mouse_aim' ? 'rc_tank' : 'mouse_aim'
                    )
                  }
                  className="rounded border border-white/15 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer"
                >
                  {controlMode === 'mouse_aim' ? 'Mouse Aim' : 'RC Tank'}
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setPhase('fighting')}
                  className="w-full rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 cursor-pointer"
                >
                  Resume Match
                </button>
                <button
                  type="button"
                  onClick={startBattleCountdown}
                  className="w-full rounded-md bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700 cursor-pointer"
                >
                  Restart Match
                </button>
                <button
                  type="button"
                  onClick={() => setPhase('pre_match')}
                  className="w-full rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 cursor-pointer"
                >
                  Leave Arena
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Post-Match Result Modal */}
        {phase === 'ended' && lastResult && (() => {
          const redB = lastResult.redBreakdown;
          const blueB = lastResult.blueBreakdown;
          const hazardRows = [
            {
              label: 'Pulverizers',
              toOpponent: blueB.hazardsTakenByType.pulverizers,
              toPlayer: redB.hazardsTakenByType.pulverizers,
            },
            {
              label: 'Kill Saws',
              toOpponent: blueB.hazardsTakenByType.killsaws,
              toPlayer: redB.hazardsTakenByType.killsaws,
            },
            {
              label: 'Wall Screws',
              toOpponent: blueB.hazardsTakenByType.wallScrews,
              toPlayer: redB.hazardsTakenByType.wallScrews,
            },
            {
              label: 'Flame Jets',
              toOpponent: blueB.hazardsTakenByType.flameJets,
              toPlayer: redB.hazardsTakenByType.flameJets,
            },
            {
              label: 'Wall & Floor Slams',
              toOpponent: blueB.hazardsTakenByType.wallSlams,
              toPlayer: redB.hazardsTakenByType.wallSlams,
            },
          ];
          const maxHazardTotal = Math.max(
            1,
            ...hazardRows.map((r) => r.toOpponent + r.toPlayer)
          );
          const totalHazardDamage = hazardRows.reduce(
            (sum, r) => sum + r.toOpponent + r.toPlayer,
            0
          );

          const formatElapsed = (sec: number) => {
            const s = Math.max(0, Math.round(sec));
            return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
          };

          return (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/15 bg-[#14181F] p-6 space-y-5">
                {/* Outcome Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <div className="text-xs font-medium text-slate-400">
                      {lastResult.winMethod} · {formatElapsed(lastResult.duration)} elapsed ·{' '}
                      {DIFFICULTY_CONFIG[lastResult.difficulty].label} AI
                    </div>
                    <h2 className="mt-1 font-display text-4xl font-bold text-slate-100">
                      {matchMode === 'spectate'
                        ? lastResult.winner === 'player'
                          ? `${redTitle} Wins`
                          : lastResult.winner === 'opponent'
                            ? `${blueTitle} Wins`
                            : 'Draw Match'
                        : lastResult.winner === 'player'
                          ? 'Victory'
                          : lastResult.winner === 'opponent'
                            ? 'Defeat'
                            : 'Draw'}
                    </h2>
                  </div>

                  {matchMode === 'player_vs_ai' && (
                    <div className="flex items-center gap-5 text-right">
                      <div>
                        <div className="text-xs text-slate-400">Scrap Earned</div>
                        <div className="font-mono-tabular text-lg font-bold text-orange-400">
                          +{lastResult.scrapEarned} SCR
                        </div>
                      </div>
                      {lastResult.bonusPointsEarned > 0 && (
                        <div>
                          <div className="text-xs text-slate-400">Stat Points</div>
                          <div className="font-mono-tabular text-lg font-bold text-emerald-400">
                            +{lastResult.bonusPointsEarned} PT
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Damage Dealt & Taken Side-by-Side Breakdown */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Red / Player Bot */}
                  <div className="rounded-lg border border-white/10 bg-[#0D1014] p-4 space-y-3">
                    <div className="flex items-baseline justify-between border-b border-white/10 pb-2">
                      <span className="font-display text-lg font-bold text-red-400">
                        {redTitle}
                      </span>
                      <span className="text-xs text-slate-400">Red Corner</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between font-semibold text-slate-100">
                        <span>Damage Dealt</span>
                        <span className="font-mono-tabular">
                          {lastResult.playerDamageDealt} DMG
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Primary Weapon ({redB.hitsLanded} hits)</span>
                        <span className="font-mono-tabular text-slate-200">
                          {redB.primaryDamageDealt}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Secondary Module</span>
                        <span className="font-mono-tabular text-slate-200">
                          {redB.secondaryDamageDealt}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Arena Hazard Assists</span>
                        <span className="font-mono-tabular text-slate-200">
                          {redB.hazardDamageInflicted}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Critical Flank Hits</span>
                        <span className="font-mono-tabular text-orange-400">
                          {redB.criticalHitsLanded}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-white/10 pt-2.5 text-xs">
                      <div className="flex justify-between font-semibold text-slate-100">
                        <span>Damage Taken</span>
                        <span className="font-mono-tabular">
                          {redB.totalDamageTaken} DMG
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>From Enemy Weapons</span>
                        <span className="font-mono-tabular text-slate-200">
                          {redB.damageTakenFromWeapons}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>From Arena Hazards</span>
                        <span className="font-mono-tabular text-slate-200">
                          {redB.damageTakenFromHazards}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>From Wall & Slam Impacts</span>
                        <span className="font-mono-tabular text-slate-200">
                          {redB.damageTakenFromWalls}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Mitigated by Armor & Wedge</span>
                        <span className="font-mono-tabular font-semibold">
                          {redB.damageMitigated}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Blue / Opponent Bot */}
                  <div className="rounded-lg border border-white/10 bg-[#0D1014] p-4 space-y-3">
                    <div className="flex items-baseline justify-between border-b border-white/10 pb-2">
                      <span className="font-display text-lg font-bold text-blue-400">
                        {blueTitle}
                      </span>
                      <span className="text-xs text-slate-400">Blue Corner</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between font-semibold text-slate-100">
                        <span>Damage Dealt</span>
                        <span className="font-mono-tabular">
                          {lastResult.opponentDamageDealt} DMG
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Primary Weapon ({blueB.hitsLanded} hits)</span>
                        <span className="font-mono-tabular text-slate-200">
                          {blueB.primaryDamageDealt}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Secondary Module</span>
                        <span className="font-mono-tabular text-slate-200">
                          {blueB.secondaryDamageDealt}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Arena Hazard Assists</span>
                        <span className="font-mono-tabular text-slate-200">
                          {blueB.hazardDamageInflicted}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Critical Flank Hits</span>
                        <span className="font-mono-tabular text-orange-400">
                          {blueB.criticalHitsLanded}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-white/10 pt-2.5 text-xs">
                      <div className="flex justify-between font-semibold text-slate-100">
                        <span>Damage Taken</span>
                        <span className="font-mono-tabular">
                          {blueB.totalDamageTaken} DMG
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>From Enemy Weapons</span>
                        <span className="font-mono-tabular text-slate-200">
                          {blueB.damageTakenFromWeapons}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>From Arena Hazards</span>
                        <span className="font-mono-tabular text-slate-200">
                          {blueB.damageTakenFromHazards}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>From Wall & Slam Impacts</span>
                        <span className="font-mono-tabular text-slate-200">
                          {blueB.damageTakenFromWalls}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Mitigated by Armor & Wedge</span>
                        <span className="font-mono-tabular font-semibold">
                          {blueB.damageMitigated}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Specific Arena Hazard Contributions */}
                <div className="rounded-lg border border-white/10 bg-[#0D1014] p-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-lg font-semibold text-slate-100">
                      Arena Hazard Contributions
                    </h3>
                    <span className="font-mono-tabular text-xs text-slate-400">
                      {totalHazardDamage} Total Hazard DMG
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {hazardRows.map((row) => {
                      const combined = row.toOpponent + row.toPlayer;
                      const oppPct =
                        combined > 0 ? (row.toOpponent / maxHazardTotal) * 100 : 0;
                      const plrPct =
                        combined > 0 ? (row.toPlayer / maxHazardTotal) * 100 : 0;

                      return (
                        <div key={row.label} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-200">
                              {row.label}
                            </span>
                            <span className="font-mono-tabular text-slate-400">
                              To {blueTitle}:{' '}
                              <strong className="text-blue-400">
                                {row.toOpponent}
                              </strong>{' '}
                              · To {redTitle}:{' '}
                              <strong className="text-red-400">
                                {row.toPlayer}
                              </strong>
                            </span>
                          </div>
                          <div className="flex h-1.5 w-full overflow-hidden rounded bg-slate-800">
                            {oppPct > 0 && (
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${oppPct}%` }}
                              />
                            )}
                            {plrPct > 0 && (
                              <div
                                className="h-full bg-red-500"
                                style={{ width: `${plrPct}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {lastReplayId && (
                    <button
                      type="button"
                      onClick={() => onToggleSaveReplay(lastReplayId)}
                      className={`w-full rounded-md border px-4 py-2 text-xs font-semibold cursor-pointer ${
                        isSavedReplay
                          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                          : 'border-white/15 bg-[#0D1014] text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      {isSavedReplay ? 'Replay Saved to Archive' : 'Save Match Replay'}
                    </button>
                  )}

                  {isTournamentMatch && onBackToTournament ? (
                    <>
                      <button
                        type="button"
                        onClick={onBackToTournament}
                        className="flex-1 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 cursor-pointer"
                      >
                        View Tournament Bracket
                      </button>
                      <button
                        type="button"
                        onClick={onGoToWorkshop}
                        className="flex-1 rounded-md bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700 cursor-pointer"
                      >
                        Workshop
                      </button>
                    </>
                  ) : matchMode === 'spectate' ? (
                    <button
                      type="button"
                      onClick={onExitSpecialMode}
                      className="flex-1 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 cursor-pointer"
                    >
                      Back to Broadcast
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={startBattleCountdown}
                        className="flex-1 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 cursor-pointer"
                      >
                        Play Again
                      </button>
                      <button
                        type="button"
                        onClick={onGoToWorkshop}
                        className="flex-1 rounded-md bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700 cursor-pointer"
                      >
                        Workshop
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Bottom Controls / Replay Scrubber Bar */}
      {matchMode === 'replay' && activeReplay ? (
        <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-[#14181F] px-5 py-3">
          <button
            type="button"
            onClick={() => {
              if (replayTimeRef.current >= activeReplay.duration) {
                replayTimeRef.current = 0;
              }
              setReplayPlaying((p) => !p);
            }}
            className="rounded-md bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-500 flex items-center gap-1.5 cursor-pointer"
          >
            {replayPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Play
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              replayTimeRef.current = 0;
              setReplayTime(0);
              setReplayPlaying(true);
            }}
            className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restart
          </button>

          <div className="flex-1 flex items-center gap-3 min-w-[200px]">
            <span className="font-mono-tabular text-xs text-slate-300">
              {formatClock(replayTime)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0.1, activeReplay.duration)}
              step={0.05}
              value={replayTime}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                replayTimeRef.current = v;
                setReplayTime(v);
              }}
              className="flex-1 accent-orange-500 cursor-pointer"
            />
            <span className="font-mono-tabular text-xs text-slate-400">
              {formatClock(activeReplay.duration)}
            </span>
          </div>

          <div className="inline-flex rounded-md border border-white/10 bg-[#0D1014] p-0.5">
            {([0.5, 1, 2] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setReplaySpeed(spd)}
                className={`rounded px-2.5 py-1 text-xs font-mono-tabular font-medium cursor-pointer ${
                  replaySpeed === spd
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#14181F] px-5 py-2.5 text-xs text-slate-400">
          {matchMode === 'spectate' ? (
            <span>
              Camera Tip: Switch between Fixed, Action Cam, Follow Red/Blue, or Free-Cam (WASD / Drag to pan, Scroll to zoom).
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span>
                Drive:{' '}
                <strong className="text-slate-200">
                  {controlMode === 'mouse_aim'
                    ? 'WASD Move + Mouse Aim'
                    : 'W/S Throttle + A/D Steer'}
                </strong>
              </span>
              <span>
                Primary ({PRIMARY_WEAPONS[activeLoadout.primaryWeapon].shortLabel}):{' '}
                <strong className="text-slate-200">
                  {hud.redPrimaryCd > 0
                    ? `${hud.redPrimaryCd.toFixed(1)}s`
                    : 'Ready (Space / L-Click)'}
                </strong>
              </span>
              <span>
                Secondary ({SECONDARY_WEAPONS[activeLoadout.secondaryWeapon].shortLabel}):{' '}
                <strong className="text-slate-200">
                  {hud.redSecondaryCd > 0
                    ? `${hud.redSecondaryCd.toFixed(1)}s`
                    : 'Ready (E / R-Click)'}
                </strong>
              </span>
              <span>
                Nitro Dash:{' '}
                <strong className="text-slate-200">
                  {hud.redBoostCd > 0 ? `${hud.redBoostCd.toFixed(1)}s` : 'Ready (Shift)'}
                </strong>
              </span>
            </div>
          )}

          <span>Hazards: Pulverizers · Kill Saws · Wall Screws · Flame Jets</span>
        </div>
      )}
    </div>
  );
}
