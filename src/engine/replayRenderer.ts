import {
  ARENA_H,
  ARENA_W,
  createArenaHazards,
  createArenaWorld,
} from './physics';
import {
  CameraState,
  renderArenaWorld,
} from './renderer';
import {
  CameraMode,
  ReplayBotSnapshot,
  ReplayFrame,
  SavedReplay,
} from '../types/game';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function sampleBotSnapshot(
  a: ReplayBotSnapshot,
  b: ReplayBotSnapshot,
  t: number
): ReplayBotSnapshot {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    angle: lerpAngle(a.angle, b.angle, t),
    z: lerp(a.z, b.z, t),
    hp: lerp(a.hp, b.hp, t),
    maxHp: a.maxHp,
    weaponAngle: lerp(a.weaponAngle, b.weaponAngle, t),
    weaponSpin: lerp(a.weaponSpin, b.weaponSpin, t),
    weaponActiveTimer: b.weaponActiveTimer,
    secondaryActiveTimer: b.secondaryActiveTimer,
    boostActiveTimer: b.boostActiveTimer,
    hitFlashTimer: b.hitFlashTimer,
    burnTimer: b.burnTimer,
    damageDealt: b.damageDealt,
  };
}

export function getInterpolatedReplayFrame(
  replay: SavedReplay,
  timeSec: number
): ReplayFrame | null {
  const frames = replay.frames;
  if (frames.length === 0) return null;
  if (timeSec <= frames[0].t) return frames[0];
  if (timeSec >= frames[frames.length - 1].t) return frames[frames.length - 1];

  // Binary search for frame index
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= timeSec) lo = mid;
    else hi = mid;
  }

  const f0 = frames[lo];
  const f1 = frames[hi];
  const span = Math.max(0.0001, f1.t - f0.t);
  const alpha = Math.max(0, Math.min(1, (timeSec - f0.t) / span));

  return {
    t: timeSec,
    red: sampleBotSnapshot(f0.red, f1.red, alpha),
    blue: sampleBotSnapshot(f0.blue, f1.blue, alpha),
    hazards: f0.hazards.map((h0, idx) => {
      const h1 = f1.hazards[idx] ?? h0;
      return {
        phase: h1.phase,
        timer: lerp(h0.timer, h1.timer, alpha),
        spinAngle: lerp(h0.spinAngle, h1.spinAngle, alpha),
      };
    }),
  };
}

export function createReplayWorldFromMeta(replay: SavedReplay) {
  const world = createArenaWorld(
    {
      id: 'replay-red',
      name: replay.redMeta.name,
      corner: 'red',
      isPlayer: false,
      chassisId: replay.redMeta.chassisId,
      primaryWeapon: replay.redMeta.primaryWeapon,
      secondaryWeapon: replay.redMeta.secondaryWeapon,
      armorType: replay.redMeta.armorType,
      visual: replay.redMeta.visual,
      upgrades: replay.redMeta.upgrades,
      statAllocation: { speed: 4, durability: 4, power: 4 },
    },
    {
      id: 'replay-blue',
      name: replay.blueMeta.name,
      corner: 'blue',
      isPlayer: false,
      chassisId: replay.blueMeta.chassisId,
      primaryWeapon: replay.blueMeta.primaryWeapon,
      secondaryWeapon: replay.blueMeta.secondaryWeapon,
      armorType: replay.blueMeta.armorType,
      visual: replay.blueMeta.visual,
      upgrades: replay.blueMeta.upgrades,
      statAllocation: { speed: 4, durability: 4, power: 4 },
    },
    'standard'
  );
  world.hazards = createArenaHazards('standard');
  return world;
}

export function renderReplayAtTime(
  ctx: CanvasRenderingContext2D,
  replay: SavedReplay,
  worldBuffer: ReturnType<typeof createReplayWorldFromMeta>,
  timeSec: number,
  cameraMode: CameraMode,
  cameraCurrent: CameraState,
  freeCam: CameraState,
  dt: number
): { nextCam: CameraState; frame: ReplayFrame | null } {
  const frame = getInterpolatedReplayFrame(replay, timeSec);
  if (!frame) {
    return {
      nextCam: { x: ARENA_W / 2, y: ARENA_H / 2, zoom: 1 },
      frame: null,
    };
  }

  worldBuffer.elapsed = frame.t;
  Object.assign(worldBuffer.red, frame.red);
  Object.assign(worldBuffer.blue, frame.blue);
  worldBuffer.hazards.forEach((h, idx) => {
    const snap = frame.hazards[idx];
    if (snap) {
      h.phase = snap.phase;
      h.timer = snap.timer;
      h.spinAngle = snap.spinAngle;
    }
  });

  const nextCam = renderArenaWorld(
    ctx,
    worldBuffer,
    cameraMode,
    cameraCurrent,
    freeCam,
    dt
  );
  return { nextCam, frame };
}
