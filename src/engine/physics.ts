import { soundEngine } from '../audio/soundEngine';
import {
  computeBotStats,
  DIFFICULTY_CONFIG,
  getArchetype,
} from '../data/bots';
import {
  ArmorType,
  BotEntity,
  BotUpgrades,
  BotVisualConfig,
  ControlMode,
  DifficultyLevel,
  FloatingText,
  HazardZone,
  Particle,
  ReplayBotSnapshot,
  ReplayFrame,
  SecondaryWeaponType,
  SkidMark,
  StatAllocation,
  WeaponType,
} from '../types/game';

export const ARENA_W = 1200;
export const ARENA_H = 720;
export const WALL_T = 44;
export const CORNER_CUT = 62;
export const MATCH_DURATION = 120; // 2:00 BattleBots match

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  primary: boolean;
  secondary: boolean;
  boost: boolean;
  mouseX: number;
  mouseY: number;
  mouseMoved: boolean;
}

export interface ArenaWorld {
  red: BotEntity;
  blue: BotEntity;
  hazards: HazardZone[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  skidMarks: SkidMark[];
  elapsed: number;
  screenShake: number;
  hazardIntensity: 'standard' | 'mayhem';
  hitStopTimer: number;
  lastReplaySample: number;
  replayFrames: ReplayFrame[];
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export interface BotSpawnConfig {
  id: string;
  name: string;
  corner: 'red' | 'blue';
  isPlayer: boolean;
  chassisId: string;
  primaryWeapon: WeaponType;
  secondaryWeapon: SecondaryWeaponType;
  armorType: ArmorType;
  visual: BotVisualConfig;
  upgrades: BotUpgrades;
  statAllocation: StatAllocation;
}

export function createBotEntity(cfg: BotSpawnConfig): BotEntity {
  const arch = getArchetype(cfg.chassisId);
  const stats = computeBotStats(
    cfg.chassisId,
    cfg.primaryWeapon,
    cfg.armorType,
    cfg.upgrades,
    cfg.statAllocation
  );
  const isRed = cfg.corner === 'red';
  return {
    id: cfg.id,
    name: cfg.name,
    corner: cfg.corner,
    isPlayer: cfg.isPlayer,
    chassisId: cfg.chassisId,
    primaryWeapon: cfg.primaryWeapon,
    secondaryWeapon: cfg.secondaryWeapon,
    armorType: cfg.armorType,
    visual: cfg.visual,
    upgrades: cfg.upgrades,
    stats,
    x: isRed ? 175 : ARENA_W - 175,
    y: ARENA_H / 2,
    vx: 0,
    vy: 0,
    angle: isRed ? 0 : Math.PI,
    angularVel: 0,
    z: 0,
    vz: 0,
    radius: arch.radius,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    weaponSpin:
      cfg.primaryWeapon === 'vertical_disk' ||
      cfg.primaryWeapon === 'horizontal_bar' ||
      cfg.primaryWeapon === 'drum'
        ? 0.55
        : 0,
    weaponAngle: 0,
    weaponCooldownTimer: 0,
    weaponActiveTimer: 0,
    secondaryCooldownTimer: 0,
    secondaryActiveTimer: 0,
    boostCooldownTimer: 0,
    boostActiveTimer: 0,
    stunTimer: 0,
    burnTimer: 0,
    hitFlashTimer: 0,
    smokeTimer: 0,
    damageDealt: 0,
    hazardDamageDealt: 0,
    hitsLanded: 0,
    flipsLanded: 0,
    burnSource: null,
    combatStats: {
      primaryDamageDealt: 0,
      secondaryDamageDealt: 0,
      hazardDamageInflicted: 0,
      criticalHitsLanded: 0,
      hitsLanded: 0,
      flipsLanded: 0,
      damageTakenFromWeapons: 0,
      damageTakenFromHazards: 0,
      damageTakenFromWalls: 0,
      damageMitigated: 0,
      totalDamageTaken: 0,
      hazardsTakenByType: {
        pulverizers: 0,
        killsaws: 0,
        wallScrews: 0,
        flameJets: 0,
        wallSlams: 0,
      },
    },
    aiDecisionTimer: 0,
    aiDesiredAngle: isRed ? 0 : Math.PI,
    aiStrafeDir: isRed ? 1 : -1,
    aiActionState: 'pursue',
  };
}

export function createArenaHazards(
  intensity: 'standard' | 'mayhem'
): HazardZone[] {
  const fastMod = intensity === 'mayhem' ? 0.65 : 1.0;
  return [
    {
      id: 'pulv-nw',
      type: 'pulverizer',
      x: 170,
      y: 150,
      width: 110,
      height: 110,
      radius: 56,
      phase: 'idle',
      timer: 2.2 * fastMod,
      cycleOffset: 0,
      spinAngle: 0,
    },
    {
      id: 'pulv-se',
      type: 'pulverizer',
      x: ARENA_W - 170,
      y: ARENA_H - 150,
      width: 110,
      height: 110,
      radius: 56,
      phase: 'idle',
      timer: 4.5 * fastMod,
      cycleOffset: 2.3,
      spinAngle: 0,
    },
    {
      id: 'saw-nw',
      type: 'killsaw',
      x: 410,
      y: 230,
      width: 68,
      height: 68,
      radius: 34,
      phase: 'idle',
      timer: 1.5 * fastMod,
      cycleOffset: 0,
      spinAngle: 0,
    },
    {
      id: 'saw-ne',
      type: 'killsaw',
      x: ARENA_W - 410,
      y: 230,
      width: 68,
      height: 68,
      radius: 34,
      phase: 'idle',
      timer: 3.4 * fastMod,
      cycleOffset: 1.8,
      spinAngle: 0,
    },
    {
      id: 'saw-sw',
      type: 'killsaw',
      x: 410,
      y: ARENA_H - 230,
      width: 68,
      height: 68,
      radius: 34,
      phase: 'idle',
      timer: 3.4 * fastMod,
      cycleOffset: 1.8,
      spinAngle: 0,
    },
    {
      id: 'saw-se',
      type: 'killsaw',
      x: ARENA_W - 410,
      y: ARENA_H - 230,
      width: 68,
      height: 68,
      radius: 34,
      phase: 'idle',
      timer: 1.5 * fastMod,
      cycleOffset: 0,
      spinAngle: 0,
    },
    {
      id: 'flame-n',
      type: 'flamejet',
      x: ARENA_W / 2,
      y: 138,
      width: 84,
      height: 64,
      radius: 42,
      phase: 'idle',
      timer: 2.8 * fastMod,
      cycleOffset: 0.8,
      spinAngle: 0,
    },
    {
      id: 'flame-s',
      type: 'flamejet',
      x: ARENA_W / 2,
      y: ARENA_H - 138,
      width: 84,
      height: 64,
      radius: 42,
      phase: 'idle',
      timer: 5.0 * fastMod,
      cycleOffset: 3.0,
      spinAngle: 0,
    },
    {
      id: 'screw-left',
      type: 'screw',
      x: WALL_T + 14,
      y: ARENA_H / 2,
      width: 28,
      height: 230,
      radius: 26,
      side: 'left',
      phase: 'active',
      timer: 0,
      cycleOffset: 0,
      spinAngle: 0,
    },
    {
      id: 'screw-right',
      type: 'screw',
      x: ARENA_W - WALL_T - 14,
      y: ARENA_H / 2,
      width: 28,
      height: 230,
      radius: 26,
      side: 'right',
      phase: 'active',
      timer: 0,
      cycleOffset: 0,
      spinAngle: 0,
    },
  ];
}

export function createArenaWorld(
  redCfg: BotSpawnConfig,
  blueCfg: BotSpawnConfig,
  hazardIntensity: 'standard' | 'mayhem' = 'standard'
): ArenaWorld {
  const red = createBotEntity(redCfg);
  const blue = createBotEntity(blueCfg);
  const hazards = createArenaHazards(hazardIntensity);

  return {
    red,
    blue,
    hazards,
    particles: [],
    floatingTexts: [],
    skidMarks: [],
    elapsed: 0,
    screenShake: 0,
    hazardIntensity,
    hitStopTimer: 0,
    lastReplaySample: -1,
    replayFrames: [],
  };
}

function snapshotBot(b: BotEntity): ReplayBotSnapshot {
  return {
    x: Math.round(b.x * 10) / 10,
    y: Math.round(b.y * 10) / 10,
    angle: Math.round(b.angle * 1000) / 1000,
    z: Math.round(b.z * 10) / 10,
    hp: Math.max(0, Math.round(b.hp * 10) / 10),
    maxHp: b.maxHp,
    weaponAngle: Math.round(b.weaponAngle * 100) / 100,
    weaponSpin: Math.round(b.weaponSpin * 100) / 100,
    weaponActiveTimer: Math.round(b.weaponActiveTimer * 100) / 100,
    secondaryActiveTimer: Math.round(b.secondaryActiveTimer * 100) / 100,
    boostActiveTimer: Math.round(b.boostActiveTimer * 100) / 100,
    hitFlashTimer: Math.round(b.hitFlashTimer * 100) / 100,
    burnTimer: Math.round(b.burnTimer * 100) / 100,
    damageDealt: Math.round(b.damageDealt),
  };
}

export function recordReplayFrame(world: ArenaWorld): void {
  world.replayFrames.push({
    t: Math.round(world.elapsed * 100) / 100,
    red: snapshotBot(world.red),
    blue: snapshotBot(world.blue),
    hazards: world.hazards.map((h) => ({
      phase: h.phase,
      timer: Math.round(h.timer * 100) / 100,
      spinAngle: Math.round(h.spinAngle * 100) / 100,
    })),
  });
}

function spawnSparks(
  world: ArenaWorld,
  x: number,
  y: number,
  count: number,
  color: string = '#FBBF24',
  speedScale: number = 1
): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = (90 + Math.random() * 280) * speedScale;
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 0.22 + Math.random() * 0.3,
      maxLife: 0.52,
      size: 2 + Math.random() * 2.5,
      color: i % 3 === 0 ? '#FEF3C7' : color,
      kind: 'spark',
    });
  }
}

function spawnRing(
  world: ArenaWorld,
  x: number,
  y: number,
  size: number,
  color: string
): void {
  world.particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.34,
    maxLife: 0.34,
    size,
    color,
    kind: 'ring',
  });
}

function addFloatingText(
  world: ArenaWorld,
  x: number,
  y: number,
  text: string,
  color: string
): void {
  world.floatingTexts.push({
    x: x + (Math.random() - 0.5) * 18,
    y: y - 16,
    vy: -42,
    text,
    color,
    life: 0.85,
    maxLife: 0.85,
  });
}

type DamageSource =
  | 'primary'
  | 'secondary'
  | 'pulverizer'
  | 'killsaw'
  | 'screw'
  | 'flamejet'
  | 'wall'
  | 'slam';

function applyDamage(
  world: ArenaWorld,
  victim: BotEntity,
  attacker: BotEntity | null,
  rawDamage: number,
  source: DamageSource,
  label?: string,
  bypassWedge: boolean = false,
  hitAngleFromAttacker?: number
): number {
  const isHazard =
    source === 'pulverizer' ||
    source === 'killsaw' ||
    source === 'screw' ||
    source === 'flamejet';
  const isWallOrSlam = source === 'wall' || source === 'slam';

  let finalDmg = rawDamage;

  // Armor mitigation
  finalDmg *= 1 - victim.stats.armorMitigation;

  // Gyro stabilizer secondary active protection
  if (
    victim.secondaryWeapon === 'gyro_stabilizer' &&
    victim.secondaryActiveTimer > 0
  ) {
    finalDmg *= 0.6;
  }

  let isCrit = false;
  if (!bypassWedge && hitAngleFromAttacker !== undefined) {
    // Check which side of victim was struck
    const incomingToVictim = normalizeAngle(hitAngleFromAttacker + Math.PI);
    const diff = Math.abs(normalizeAngle(incomingToVictim - victim.angle));
    if (diff < 0.68) {
      // Struck front armored wedge!
      finalDmg *= 1 - victim.stats.wedgeDeflection * 0.72;
    } else if (diff > 1.35) {
      // Flank or rear hit!
      finalDmg *= 1.36;
      isCrit = true;
    }
  }

  const dmg = Math.max(1, Math.round(finalDmg));
  const mitigated = Math.max(0, Math.round(rawDamage - finalDmg));
  victim.hp = Math.max(0, victim.hp - dmg);
  victim.hitFlashTimer = 0.14;

  // Victim damage-taken breakdown
  victim.combatStats.totalDamageTaken += dmg;
  victim.combatStats.damageMitigated += mitigated;
  if (isHazard) {
    victim.combatStats.damageTakenFromHazards += dmg;
    if (source === 'pulverizer') victim.combatStats.hazardsTakenByType.pulverizers += dmg;
    else if (source === 'killsaw') victim.combatStats.hazardsTakenByType.killsaws += dmg;
    else if (source === 'screw') victim.combatStats.hazardsTakenByType.wallScrews += dmg;
    else if (source === 'flamejet') victim.combatStats.hazardsTakenByType.flameJets += dmg;
  } else if (isWallOrSlam) {
    victim.combatStats.damageTakenFromWalls += dmg;
    victim.combatStats.hazardsTakenByType.wallSlams += dmg;
  } else {
    victim.combatStats.damageTakenFromWeapons += dmg;
  }

  // Attacker damage-dealt breakdown
  if (attacker) {
    attacker.damageDealt += dmg;
    attacker.hitsLanded += 1;
    attacker.combatStats.hitsLanded += 1;
    if (isCrit) {
      attacker.combatStats.criticalHitsLanded += 1;
    }
    if (isHazard) {
      attacker.hazardDamageDealt += dmg;
      attacker.combatStats.hazardDamageInflicted += dmg;
    } else if (source === 'secondary') {
      attacker.combatStats.secondaryDamageDealt += dmg;
    } else if (source === 'primary') {
      attacker.combatStats.primaryDamageDealt += dmg;
    }
  }

  const txt = label
    ? `${label} -${dmg}`
    : isCrit
      ? `CRIT -${dmg}`
      : `-${dmg}`;
  addFloatingText(
    world,
    victim.x,
    victim.y - victim.z * 0.7,
    txt,
    isCrit ? '#F97316' : isHazard ? '#EF4444' : '#F8FAFC'
  );

  return dmg;
}

function triggerPrimaryWeapon(
  world: ArenaWorld,
  bot: BotEntity,
  opponent: BotEntity
): void {
  if (bot.weaponCooldownTimer > 0 || bot.stunTimer > 0 || bot.z > 8) return;

  const isSpinner =
    bot.primaryWeapon === 'vertical_disk' ||
    bot.primaryWeapon === 'horizontal_bar' ||
    bot.primaryWeapon === 'drum';

  if (isSpinner) {
    bot.weaponCooldownTimer = bot.stats.weaponCooldown;
    bot.weaponActiveTimer = 0.65;
    bot.weaponSpin = Math.min(1.25, bot.weaponSpin + 0.45);
    soundEngine.playBoost();
    spawnSparks(
      world,
      bot.x + Math.cos(bot.angle) * bot.radius,
      bot.y + Math.sin(bot.angle) * bot.radius,
      6,
      '#38BDF8',
      0.6
    );
    return;
  }

  if (bot.primaryWeapon === 'flipper') {
    bot.weaponCooldownTimer = bot.stats.weaponCooldown;
    bot.weaponActiveTimer = 0.34;
    soundEngine.playFlipperBlast();
    spawnRing(
      world,
      bot.x + Math.cos(bot.angle) * (bot.radius + 14),
      bot.y + Math.sin(bot.angle) * (bot.radius + 14),
      44,
      '#FB923C'
    );

    // Check cone in front
    const dx = opponent.x - bot.x;
    const dy = opponent.y - bot.y;
    const dist = Math.hypot(dx, dy);
    const angToOpp = Math.atan2(dy, dx);
    const diff = Math.abs(normalizeAngle(angToOpp - bot.angle));
    const gyroResistant =
      opponent.secondaryWeapon === 'gyro_stabilizer' &&
      opponent.secondaryActiveTimer > 0;

    if (dist < bot.radius + opponent.radius + 46 && diff < 0.85 && opponent.z < 18) {
      const flingScale = bot.stats.weaponKnockback / opponent.stats.mass;
      opponent.vx += Math.cos(bot.angle) * flingScale * 0.92;
      opponent.vy += Math.sin(bot.angle) * flingScale * 0.92;
      if (!gyroResistant) {
        opponent.vz = 365 + (bot.upgrades.weapon - 1) * 28;
        opponent.z = Math.max(opponent.z, 2);
        opponent.angularVel += (Math.random() > 0.5 ? 1 : -1) * 9;
      }
      bot.flipsLanded += 1;
      bot.combatStats.flipsLanded += 1;
      applyDamage(
        world,
        opponent,
        bot,
        bot.stats.weaponDamage,
        'primary',
        'FLIP',
        true
      );
      spawnSparks(world, opponent.x, opponent.y, 16, '#F97316', 1.1);
      world.screenShake = Math.max(world.screenShake, 7);
    }
    return;
  }

  if (bot.primaryWeapon === 'hammer') {
    bot.weaponCooldownTimer = bot.stats.weaponCooldown;
    bot.weaponActiveTimer = 0.36;
    soundEngine.playHammerSlam();

    const strikeX = bot.x + Math.cos(bot.angle) * (bot.radius + 26);
    const strikeY = bot.y + Math.sin(bot.angle) * (bot.radius + 26);
    spawnRing(world, strikeX, strikeY, 52, '#FACC15');

    const dx = opponent.x - bot.x;
    const dy = opponent.y - bot.y;
    const dist = Math.hypot(dx, dy);
    const angToOpp = Math.atan2(dy, dx);
    const diff = Math.abs(normalizeAngle(angToOpp - bot.angle));

    if (dist < bot.radius + opponent.radius + 52 && diff < 0.82 && opponent.z < 28) {
      // Overhead hammer pierces front wedge!
      applyDamage(
        world,
        opponent,
        bot,
        bot.stats.weaponDamage,
        'primary',
        'CRUSH',
        true
      );
      opponent.stunTimer = Math.max(opponent.stunTimer, 0.35);
      const impulse = (bot.stats.weaponKnockback * 0.72) / opponent.stats.mass;
      opponent.vx += Math.cos(angToOpp) * impulse;
      opponent.vy += Math.sin(angToOpp) * impulse;
      spawnSparks(world, strikeX, strikeY, 22, '#FACC15', 1.25);
      world.screenShake = Math.max(world.screenShake, 9);
      world.hitStopTimer = 0.035;
    }
  }
}

function triggerSecondaryWeapon(
  world: ArenaWorld,
  bot: BotEntity,
  opponent: BotEntity
): void {
  if (bot.secondaryCooldownTimer > 0 || bot.stunTimer > 0) return;

  bot.secondaryCooldownTimer = bot.stats.secondaryCooldown;

  switch (bot.secondaryWeapon) {
    case 'flamethrower': {
      bot.secondaryActiveTimer = 0.9;
      soundEngine.playFlameBurst();
      break;
    }
    case 'harpoon': {
      bot.secondaryActiveTimer = 0.38;
      soundEngine.playMetallicHit(0.7);
      const dx = opponent.x - bot.x;
      const dy = opponent.y - bot.y;
      const dist = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      const diff = Math.abs(normalizeAngle(ang - bot.angle));
      if (dist < 300 && diff < 0.55) {
        const pull = (390 * bot.stats.secondaryPower) / opponent.stats.mass;
        opponent.vx -= Math.cos(ang) * pull;
        opponent.vy -= Math.sin(ang) * pull;
        applyDamage(world, opponent, bot, 9 * bot.stats.secondaryPower, 'secondary', 'HOOK', true);
        spawnSparks(world, opponent.x, opponent.y, 10, '#38BDF8', 0.8);
      }
      break;
    }
    case 'shock_pulse': {
      bot.secondaryActiveTimer = 0.35;
      soundEngine.playHammerSlam();
      spawnRing(world, bot.x, bot.y, 145, '#38BDF8');
      const dx = opponent.x - bot.x;
      const dy = opponent.y - bot.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 160 && dist > 0.1) {
        const push = (520 * bot.stats.secondaryPower) / opponent.stats.mass;
        opponent.vx += (dx / dist) * push;
        opponent.vy += (dy / dist) * push;
        applyDamage(world, opponent, bot, 11 * bot.stats.secondaryPower, 'secondary', 'PULSE', true);
        spawnSparks(world, opponent.x, opponent.y, 12, '#38BDF8', 1.0);
      }
      break;
    }
    case 'ram_overdrive': {
      bot.secondaryActiveTimer = 1.1;
      bot.vx += Math.cos(bot.angle) * 260;
      bot.vy += Math.sin(bot.angle) * 260;
      soundEngine.playBoost();
      break;
    }
    case 'gyro_stabilizer': {
      bot.secondaryActiveTimer = 2.5;
      soundEngine.playBoost();
      spawnRing(world, bot.x, bot.y, 44, '#10B981');
      break;
    }
  }
}

function triggerBoost(world: ArenaWorld, bot: BotEntity): void {
  if (bot.boostCooldownTimer > 0 || bot.stunTimer > 0 || bot.z > 8) return;
  bot.boostCooldownTimer = 2.2;
  bot.boostActiveTimer = 0.32;
  bot.vx += Math.cos(bot.angle) * (bot.stats.speed * 1.18);
  bot.vy += Math.sin(bot.angle) * (bot.stats.speed * 1.18);
  soundEngine.playBoost();
  spawnSparks(
    world,
    bot.x - Math.cos(bot.angle) * bot.radius,
    bot.y - Math.sin(bot.angle) * bot.radius,
    8,
    '#F97316',
    0.7
  );
}

function applyPlayerControls(
  world: ArenaWorld,
  bot: BotEntity,
  opponent: BotEntity,
  input: InputState,
  controlMode: ControlMode,
  dt: number
): void {
  if (bot.stunTimer > 0 || bot.z > 6) return;

  const isRamOverdrive =
    bot.secondaryWeapon === 'ram_overdrive' && bot.secondaryActiveTimer > 0;
  const speedMult =
    (bot.boostActiveTimer > 0 ? 1.45 : 1) * (isRamOverdrive ? 1.32 : 1);
  const maxSpd = bot.stats.speed * speedMult;
  const accel = bot.stats.acceleration * speedMult;

  if (controlMode === 'mouse_aim') {
    let moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const len = Math.hypot(moveX, moveY);
    if (len > 0) {
      moveX /= len;
      moveY /= len;
      bot.vx += moveX * accel * dt;
      bot.vy += moveY * accel * dt;
    }

    // Smoothly orient front weapon toward mouse cursor (or movement vector if mouse untouched)
    const targetAngle = input.mouseMoved
      ? Math.atan2(input.mouseY - bot.y, input.mouseX - bot.x)
      : len > 0
        ? Math.atan2(moveY, moveX)
        : bot.angle;

    const diff = normalizeAngle(targetAngle - bot.angle);
    const maxTurn = bot.stats.turnRate * 1.35 * dt;
    bot.angle = normalizeAngle(
      bot.angle + clamp(diff, -maxTurn, maxTurn)
    );
  } else {
    // Classic RC Tank Drive: W/S throttle, A/D rotate
    const throttle = (input.up ? 1 : 0) - (input.down ? 0.78 : 0);
    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    bot.angle = normalizeAngle(
      bot.angle + steer * bot.stats.turnRate * 1.25 * dt
    );
    if (throttle !== 0) {
      bot.vx += Math.cos(bot.angle) * throttle * accel * dt;
      bot.vy += Math.sin(bot.angle) * throttle * accel * dt;
    }
  }

  // Clamp linear velocity smoothly
  const curSpd = Math.hypot(bot.vx, bot.vy);
  if (curSpd > maxSpd) {
    const blend = 1 - Math.min(1, dt * 8);
    const targetSpd = curSpd * blend + maxSpd * (1 - blend);
    bot.vx = (bot.vx / curSpd) * targetSpd;
    bot.vy = (bot.vy / curSpd) * targetSpd;
  }

  if (input.primary) triggerPrimaryWeapon(world, bot, opponent);
  if (input.secondary) triggerSecondaryWeapon(world, bot, opponent);
  if (input.boost) triggerBoost(world, bot);
}

function updateBotAI(
  world: ArenaWorld,
  bot: BotEntity,
  target: BotEntity,
  difficulty: DifficultyLevel,
  dt: number
): void {
  if (bot.stunTimer > 0 || bot.z > 6) return;

  const cfg = DIFFICULTY_CONFIG[difficulty];
  bot.aiDecisionTimer -= dt;

  const dx = target.x - bot.x;
  const dy = target.y - bot.y;
  const dist = Math.hypot(dx, dy);

  if (bot.aiDecisionTimer <= 0) {
    bot.aiDecisionTimer = cfg.reactionInterval * (0.85 + Math.random() * 0.3);

    // 1. Check wall proximity
    const nearWall =
      bot.x < WALL_T + 75 ||
      bot.x > ARENA_W - WALL_T - 75 ||
      bot.y < WALL_T + 75 ||
      bot.y > ARENA_H - WALL_T - 75;

    // 2. Check hazard danger
    let hazardEscapeAngle: number | null = null;
    if (Math.random() < cfg.hazardAwareness) {
      for (const h of world.hazards) {
        if (h.type === 'screw') {
          if (Math.abs(bot.x - h.x) < 62 && Math.abs(bot.y - h.y) < h.height / 2 + 25) {
            hazardEscapeAngle = Math.atan2(ARENA_H / 2 - bot.y, ARENA_W / 2 - bot.x);
            break;
          }
        } else if (h.phase === 'warning' || h.phase === 'active') {
          const hd = Math.hypot(bot.x - h.x, bot.y - h.y);
          if (hd < h.radius + bot.radius + 48) {
            hazardEscapeAngle = Math.atan2(bot.y - h.y, bot.x - h.x);
            break;
          }
        }
      }
    }

    if (hazardEscapeAngle !== null) {
      bot.aiActionState = 'evade_hazard';
      bot.aiDesiredAngle = hazardEscapeAngle;
    } else if (nearWall && dist > 180) {
      bot.aiActionState = 'escape_wall';
      bot.aiDesiredAngle = Math.atan2(ARENA_H / 2 - bot.y, ARENA_W / 2 - bot.x);
    } else {
      // Predictive lead aiming (stronger on Hard)
      const leadTime =
        difficulty === 'hard' ? 0.22 : difficulty === 'medium' ? 0.1 : 0;
      const aimX = target.x + target.vx * leadTime;
      const aimY = target.y + target.vy * leadTime;

      const isSpinner =
        bot.primaryWeapon === 'vertical_disk' ||
        bot.primaryWeapon === 'horizontal_bar' ||
        bot.primaryWeapon === 'drum';

      if (isSpinner && bot.weaponSpin < 0.55 && dist < 175 && difficulty !== 'easy') {
        bot.aiActionState = 'retreat_spinup';
        bot.aiDesiredAngle = Math.atan2(bot.y - aimY, bot.x - aimX);
      } else if (difficulty === 'hard' && dist > 95 && dist < 240) {
        // Hard AI flanks around the target's front weapon to strike exposed side/rear
        bot.aiActionState = 'flank';
        const targetFrontDiff = Math.abs(
          normalizeAngle(Math.atan2(bot.y - target.y, bot.x - target.x) - target.angle)
        );
        if (targetFrontDiff < 0.7) {
          // Approach at a diagonal flank angle
          if (Math.random() < 0.15) bot.aiStrafeDir *= -1;
          const baseAng = Math.atan2(aimY - bot.y, aimX - bot.x);
          bot.aiDesiredAngle = normalizeAngle(baseAng + bot.aiStrafeDir * 0.52);
        } else {
          bot.aiDesiredAngle = Math.atan2(aimY - bot.y, aimX - bot.x);
        }
      } else {
        bot.aiActionState = 'pursue';
        const wobble =
          difficulty === 'easy'
            ? Math.sin(world.elapsed * 2.1) * 0.38
            : difficulty === 'medium'
              ? Math.sin(world.elapsed * 3.0) * 0.1
              : 0;
        bot.aiDesiredAngle = normalizeAngle(
          Math.atan2(aimY - bot.y, aimX - bot.x) + wobble
        );
      }
    }
  }

  // Turn smoothly toward desired angle (Hard turns crisper)
  const turnScale =
    difficulty === 'hard' ? 1.25 : difficulty === 'medium' ? 1.0 : 0.74;
  const diff = normalizeAngle(bot.aiDesiredAngle - bot.angle);
  const maxTurn = bot.stats.turnRate * turnScale * dt;
  bot.angle = normalizeAngle(bot.angle + clamp(diff, -maxTurn, maxTurn));

  // Throttle control
  const isRamOverdrive =
    bot.secondaryWeapon === 'ram_overdrive' && bot.secondaryActiveTimer > 0;
  const speedMult =
    (bot.boostActiveTimer > 0 ? 1.4 : 1) *
    (isRamOverdrive ? 1.3 : 1) *
    (difficulty === 'easy' ? 0.84 : difficulty === 'medium' ? 0.96 : 1.04);

  const throttle =
    bot.aiActionState === 'evade_hazard'
      ? 1.0
      : Math.abs(diff) < 1.15
        ? cfg.aggression
        : 0.35;

  bot.vx += Math.cos(bot.angle) * bot.stats.acceleration * speedMult * throttle * dt;
  bot.vy += Math.sin(bot.angle) * bot.stats.acceleration * speedMult * throttle * dt;

  const maxSpd = bot.stats.speed * speedMult;
  const curSpd = Math.hypot(bot.vx, bot.vy);
  if (curSpd > maxSpd) {
    bot.vx = (bot.vx / curSpd) * maxSpd;
    bot.vy = (bot.vy / curSpd) * maxSpd;
  }

  // Weapon triggers
  const angToTarget = Math.atan2(dy, dx);
  const faceDiff = Math.abs(normalizeAngle(angToTarget - bot.angle));

  if (
    (bot.primaryWeapon === 'flipper' || bot.primaryWeapon === 'hammer') &&
    dist < bot.radius + target.radius + 45 &&
    faceDiff < (difficulty === 'hard' ? 0.7 : 0.95)
  ) {
    if (difficulty !== 'easy' || Math.random() < 0.08) {
      triggerPrimaryWeapon(world, bot, target);
    }
  } else if (
    (bot.primaryWeapon === 'vertical_disk' ||
      bot.primaryWeapon === 'horizontal_bar' ||
      bot.primaryWeapon === 'drum') &&
    dist < 145 &&
    faceDiff < 0.75 &&
    difficulty !== 'easy'
  ) {
    triggerPrimaryWeapon(world, bot, target);
  }

  // Secondary weapon usage
  if (bot.secondaryCooldownTimer <= 0 && Math.random() < cfg.secondaryUsage * dt * 2.4) {
    const shouldFireSecondary =
      (bot.secondaryWeapon === 'flamethrower' && dist < 135 && faceDiff < 0.6) ||
      (bot.secondaryWeapon === 'harpoon' && dist > 110 && dist < 275 && faceDiff < 0.4) ||
      (bot.secondaryWeapon === 'shock_pulse' && dist < 130) ||
      (bot.secondaryWeapon === 'ram_overdrive' && dist > 90 && dist < 240 && faceDiff < 0.5) ||
      (bot.secondaryWeapon === 'gyro_stabilizer' && dist < 130);

    if (shouldFireSecondary) {
      triggerSecondaryWeapon(world, bot, target);
    }
  }

  // Tactical boost
  if (
    bot.boostCooldownTimer <= 0 &&
    ((bot.aiActionState === 'evade_hazard' && difficulty !== 'easy') ||
      (dist > 140 && dist < 280 && faceDiff < 0.35 && Math.random() < cfg.aggression * dt * 1.4))
  ) {
    triggerBoost(world, bot);
  }
}

function updateBotKinematics(world: ArenaWorld, bot: BotEntity, dt: number): void {
  const prevX = bot.x;
  const prevY = bot.y;

  // Timers
  bot.weaponCooldownTimer = Math.max(0, bot.weaponCooldownTimer - dt);
  bot.weaponActiveTimer = Math.max(0, bot.weaponActiveTimer - dt);
  bot.secondaryCooldownTimer = Math.max(0, bot.secondaryCooldownTimer - dt);
  bot.secondaryActiveTimer = Math.max(0, bot.secondaryActiveTimer - dt);
  bot.boostCooldownTimer = Math.max(0, bot.boostCooldownTimer - dt);
  bot.boostActiveTimer = Math.max(0, bot.boostActiveTimer - dt);
  bot.stunTimer = Math.max(0, bot.stunTimer - dt);
  bot.hitFlashTimer = Math.max(0, bot.hitFlashTimer - dt);

  // Burn DoT
  if (bot.burnTimer > 0) {
    const prevTick = Math.floor(bot.burnTimer * 3);
    bot.burnTimer = Math.max(0, bot.burnTimer - dt);
    const nextTick = Math.floor(bot.burnTimer * 3);
    if (nextTick !== prevTick) {
      const other = bot.corner === 'red' ? world.blue : world.red;
      if (bot.burnSource === 'flamethrower') {
        applyDamage(world, bot, other, 3, 'secondary', 'BURN', true);
      } else {
        applyDamage(world, bot, other, 3, 'flamejet', 'BURN', true);
      }
    }
    if (Math.random() < 0.45) {
      world.particles.push({
        x: bot.x + (Math.random() - 0.5) * 20,
        y: bot.y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 40,
        vy: -30 - Math.random() * 50,
        life: 0.28,
        maxLife: 0.28,
        size: 5 + Math.random() * 4,
        color: '#F97316',
        kind: 'flame',
      });
    }
  }

  // Damage smoke & sputtering sparks scaled continuously with structural damage
  const hpPct = Math.max(0, bot.hp / Math.max(1, bot.maxHp));
  if (hpPct < 0.75 && bot.hp > 0) {
    const damageSeverity = (0.75 - hpPct) / 0.75; // 0..1
    bot.smokeTimer -= dt;
    if (bot.smokeTimer <= 0) {
      bot.smokeTimer = Math.max(0.035, 0.14 - damageSeverity * 0.1);
      world.particles.push({
        x: bot.x + (Math.random() - 0.5) * 16,
        y: bot.y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * (24 + damageSeverity * 26),
        vy: -16 - Math.random() * (22 + damageSeverity * 24),
        life: 0.45 + damageSeverity * 0.2,
        maxLife: 0.65,
        size: 5 + Math.random() * (4 + damageSeverity * 5),
        color: hpPct < 0.3 ? '#3F3F46' : '#94A3B8',
        kind: 'smoke',
      });

      if (hpPct < 0.65 && Math.random() < 0.35 + damageSeverity * 0.6) {
        const sparkAng = Math.random() * Math.PI * 2;
        const sparkSpd = 70 + Math.random() * (120 + damageSeverity * 150);
        world.particles.push({
          x: bot.x + (Math.random() - 0.5) * bot.radius * 0.9,
          y: bot.y + (Math.random() - 0.5) * bot.radius * 0.9,
          vx: Math.cos(sparkAng) * sparkSpd,
          vy: Math.sin(sparkAng) * sparkSpd,
          life: 0.18 + Math.random() * 0.18,
          maxLife: 0.36,
          size: 1.6 + damageSeverity * 1.4,
          color: Math.random() < 0.4 ? '#FEF08A' : '#F97316',
          kind: 'spark',
        });
      }
    }
  }

  // Spinner spin-up physics
  const isSpinner =
    bot.primaryWeapon === 'vertical_disk' ||
    bot.primaryWeapon === 'horizontal_bar' ||
    bot.primaryWeapon === 'drum';
  if (isSpinner) {
    const targetSpin = bot.weaponActiveTimer > 0 ? 1.2 : 0.92;
    bot.weaponSpin += (targetSpin - bot.weaponSpin) * Math.min(1, dt * 1.45);
    bot.weaponAngle += bot.weaponSpin * 24 * dt;
  }

  // Integrate linear velocity
  bot.x += bot.vx * dt;
  bot.y += bot.vy * dt;

  // Ground friction vs airborne drag
  const friction = bot.z > 0 ? 0.6 : 5.4;
  const damping = Math.exp(-friction * dt);
  bot.vx *= damping;
  bot.vy *= damping;

  if (Math.abs(bot.angularVel) > 0.01) {
    bot.angle = normalizeAngle(bot.angle + bot.angularVel * dt);
    bot.angularVel *= Math.exp(-6.5 * dt);
  }

  // Airborne Z physics (flipper launch + landing slam)
  if (bot.z > 0 || bot.vz > 0) {
    bot.z += bot.vz * dt;
    bot.vz -= 980 * dt;
    if (bot.z <= 0) {
      const impactSpeed = Math.abs(bot.vz);
      bot.z = 0;
      bot.vz = 0;
      if (impactSpeed > 180) {
        const slamDmg = Math.round((impactSpeed - 140) * 0.055);
        if (slamDmg > 0) {
          applyDamage(world, bot, null, slamDmg, 'slam', 'SLAM', true);
        }
        soundEngine.playHammerSlam();
        spawnRing(world, bot.x, bot.y, bot.radius + 22, '#94A3B8');
        world.screenShake = Math.max(world.screenShake, 6);
      }
    }
  }

  // Tire skid marks on sharp high-speed turns / boosts
  const spd = Math.hypot(bot.vx, bot.vy);
  if (bot.z <= 1 && (spd > 230 || bot.boostActiveTimer > 0) && Math.random() < 0.45) {
    world.skidMarks.push({
      x1: prevX,
      y1: prevY,
      x2: bot.x,
      y2: bot.y,
      alpha: 0.28,
      color: bot.boostActiveTimer > 0 ? '#F97316' : '#090B0E',
    });
    if (world.skidMarks.length > 260) {
      world.skidMarks.shift();
    }
  }

  // Arena wall & chamfered corner collisions
  resolveWallCollisions(world, bot);
}

function resolveWallCollisions(world: ArenaWorld, bot: BotEntity): void {
  const minX = WALL_T + bot.radius;
  const maxX = ARENA_W - WALL_T - bot.radius;
  const minY = WALL_T + bot.radius;
  const maxY = ARENA_H - WALL_T - bot.radius;

  let hitWall = false;
  let impactSpeed = 0;

  if (bot.x < minX) {
    impactSpeed = Math.max(impactSpeed, Math.abs(bot.vx));
    bot.x = minX;
    bot.vx = Math.abs(bot.vx) * 0.62;
    hitWall = true;
  } else if (bot.x > maxX) {
    impactSpeed = Math.max(impactSpeed, Math.abs(bot.vx));
    bot.x = maxX;
    bot.vx = -Math.abs(bot.vx) * 0.62;
    hitWall = true;
  }

  if (bot.y < minY) {
    impactSpeed = Math.max(impactSpeed, Math.abs(bot.vy));
    bot.y = minY;
    bot.vy = Math.abs(bot.vy) * 0.62;
    hitWall = true;
  } else if (bot.y > maxY) {
    impactSpeed = Math.max(impactSpeed, Math.abs(bot.vy));
    bot.y = maxY;
    bot.vy = -Math.abs(bot.vy) * 0.62;
    hitWall = true;
  }

  // 45-degree chamfered steel corner bumpers
  const corners = [
    { cx: WALL_T, cy: WALL_T, nx: Math.SQRT1_2, ny: Math.SQRT1_2 },
    { cx: ARENA_W - WALL_T, cy: WALL_T, nx: -Math.SQRT1_2, ny: Math.SQRT1_2 },
    { cx: WALL_T, cy: ARENA_H - WALL_T, nx: Math.SQRT1_2, ny: -Math.SQRT1_2 },
    {
      cx: ARENA_W - WALL_T,
      cy: ARENA_H - WALL_T,
      nx: -Math.SQRT1_2,
      ny: -Math.SQRT1_2,
    },
  ];

  for (const c of corners) {
    const distFromCorner = (bot.x - c.cx) * c.nx + (bot.y - c.cy) * c.ny;
    const minCornerDist = CORNER_CUT * Math.SQRT1_2 + bot.radius;
    if (distFromCorner < minCornerDist) {
      const pen = minCornerDist - distFromCorner;
      bot.x += c.nx * pen;
      bot.y += c.ny * pen;
      const vn = bot.vx * c.nx + bot.vy * c.ny;
      if (vn < 0) {
        impactSpeed = Math.max(impactSpeed, Math.abs(vn));
        bot.vx -= 1.6 * vn * c.nx;
        bot.vy -= 1.6 * vn * c.ny;
        hitWall = true;
      }
    }
  }

  if (hitWall && impactSpeed > 265) {
    const uhmwReduction = bot.armorType === 'uhmw_flex' ? 0.55 : 1;
    const wallDmg = Math.round(((impactSpeed - 245) / 36) * uhmwReduction);
    if (wallDmg >= 2) {
      applyDamage(world, bot, null, wallDmg, 'wall', 'WALL', true);
      soundEngine.playMetallicHit(0.75);
      spawnSparks(world, bot.x, bot.y, 12, '#FBBF24', 0.9);
      world.screenShake = Math.max(world.screenShake, 5);
    }
  }
}

function resolveBotToBotCombat(world: ArenaWorld, dt: number): void {
  const a = world.red;
  const b = world.blue;

  // Flamethrower continuous cone checks
  for (const [attacker, defender] of [
    [a, b],
    [b, a],
  ] as [BotEntity, BotEntity][]) {
    if (
      attacker.secondaryWeapon === 'flamethrower' &&
      attacker.secondaryActiveTimer > 0
    ) {
      const dx = defender.x - attacker.x;
      const dy = defender.y - attacker.y;
      const dist = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      const diff = Math.abs(normalizeAngle(ang - attacker.angle));
      if (dist < 145 && diff < 0.58) {
        defender.burnTimer = Math.max(defender.burnTimer, 1.8);
        defender.burnSource = 'flamethrower';
      }
      if (Math.random() < 0.7) {
        const coneAng = attacker.angle + (Math.random() - 0.5) * 0.55;
        world.particles.push({
          x: attacker.x + Math.cos(attacker.angle) * (attacker.radius + 6),
          y: attacker.y + Math.sin(attacker.angle) * (attacker.radius + 6),
          vx: Math.cos(coneAng) * (240 + Math.random() * 140),
          vy: Math.sin(coneAng) * (240 + Math.random() * 140),
          life: 0.24,
          maxLife: 0.24,
          size: 7 + Math.random() * 6,
          color: Math.random() > 0.4 ? '#F97316' : '#FACC15',
          kind: 'flame',
        });
      }
    }
  }

  // Skip physical body collision if one bot is launched high airborne
  if (Math.abs(a.z - b.z) > 36) return;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);

  // Horizontal bar has slightly extended weapon reach
  const aBarReach = a.primaryWeapon === 'horizontal_bar' ? 10 : 0;
  const bBarReach = b.primaryWeapon === 'horizontal_bar' ? 10 : 0;
  const minDist = a.radius + b.radius + Math.max(aBarReach, bBarReach) * 0.4;

  if (dist >= minDist || dist < 0.001) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  const totalMass = a.stats.mass + b.stats.mass;
  a.x -= nx * overlap * (b.stats.mass / totalMass);
  a.y -= ny * overlap * (b.stats.mass / totalMass);
  b.x += nx * overlap * (a.stats.mass / totalMass);
  b.y += ny * overlap * (a.stats.mass / totalMass);

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;

  if (velAlongNormal > 0) return;

  const restitution = 0.58;
  const j = (-(1 + restitution) * velAlongNormal) / (1 / a.stats.mass + 1 / b.stats.mass);
  a.vx -= (j / a.stats.mass) * nx;
  a.vy -= (j / a.stats.mass) * ny;
  b.vx += (j / b.stats.mass) * nx;
  b.vy += (j / b.stats.mass) * ny;

  const impactX = (a.x + b.x) / 2;
  const impactY = (a.y + b.y) / 2;
  const impactSpeed = Math.abs(velAlongNormal);

  // Check spinner / ram weapon contacts
  const angAtoB = Math.atan2(dy, dx);
  const angBtoA = normalizeAngle(angAtoB + Math.PI);

  const aFrontDiff = Math.abs(normalizeAngle(angAtoB - a.angle));
  const bFrontDiff = Math.abs(normalizeAngle(angBtoA - b.angle));

  const aSpinnerHit =
    (a.primaryWeapon === 'vertical_disk' ||
      a.primaryWeapon === 'horizontal_bar' ||
      a.primaryWeapon === 'drum') &&
    a.weaponSpin > 0.3 &&
    aFrontDiff < (a.primaryWeapon === 'horizontal_bar' ? 0.92 : 0.72);

  const bSpinnerHit =
    (b.primaryWeapon === 'vertical_disk' ||
      b.primaryWeapon === 'horizontal_bar' ||
      b.primaryWeapon === 'drum') &&
    b.weaponSpin > 0.3 &&
    bFrontDiff < (b.primaryWeapon === 'horizontal_bar' ? 0.92 : 0.72);

  // Weapon-on-weapon clash!
  if (aSpinnerHit && bSpinnerHit) {
    soundEngine.playMetallicHit(1.3);
    spawnSparks(world, impactX, impactY, 26, '#FBBF24', 1.4);
    const clashRecoil = 340;
    a.vx -= nx * (clashRecoil / a.stats.mass);
    a.vy -= ny * (clashRecoil / a.stats.mass);
    b.vx += nx * (clashRecoil / b.stats.mass);
    b.vy += ny * (clashRecoil / b.stats.mass);
    a.weaponSpin = Math.max(0.25, a.weaponSpin * 0.55);
    b.weaponSpin = Math.max(0.25, b.weaponSpin * 0.55);
    world.screenShake = Math.max(world.screenShake, 8);
    world.hitStopTimer = 0.03;
  }

  if (aSpinnerHit && a.hitFlashTimer <= 0.05) {
    const overdriveBonus = a.weaponActiveTimer > 0 ? 1.28 : 1.0;
    const rawDmg = a.stats.weaponDamage * (0.45 + a.weaponSpin * 0.6) * overdriveBonus;
    applyDamage(world, b, a, rawDmg, 'primary', undefined, false, angAtoB);

    const kb =
      (a.stats.weaponKnockback * (0.5 + a.weaponSpin * 0.55) * overdriveBonus) /
      b.stats.mass;
    b.vx += nx * kb;
    b.vy += ny * kb;
    if (a.primaryWeapon === 'vertical_disk' || a.primaryWeapon === 'drum') {
      b.vz = Math.max(b.vz, 130 * a.weaponSpin);
      b.z = Math.max(b.z, 1);
    }
    a.weaponSpin = Math.max(0.22, a.weaponSpin * 0.62);
    a.vx -= nx * 130;
    a.vy -= ny * 130;
    soundEngine.playMetallicHit(1.1);
    spawnSparks(world, impactX, impactY, 20, '#FBBF24', 1.2);
    world.screenShake = Math.max(world.screenShake, 7);
    world.hitStopTimer = 0.025;
  }

  if (bSpinnerHit && b.hitFlashTimer <= 0.05) {
    const overdriveBonus = b.weaponActiveTimer > 0 ? 1.28 : 1.0;
    const rawDmg = b.stats.weaponDamage * (0.45 + b.weaponSpin * 0.6) * overdriveBonus;
    applyDamage(world, a, b, rawDmg, 'primary', undefined, false, angBtoA);

    const kb =
      (b.stats.weaponKnockback * (0.5 + b.weaponSpin * 0.55) * overdriveBonus) /
      a.stats.mass;
    a.vx -= nx * kb;
    a.vy -= ny * kb;
    if (b.primaryWeapon === 'vertical_disk' || b.primaryWeapon === 'drum') {
      a.vz = Math.max(a.vz, 130 * b.weaponSpin);
      a.z = Math.max(a.z, 1);
    }
    b.weaponSpin = Math.max(0.22, b.weaponSpin * 0.62);
    b.vx += nx * 130;
    b.vy += ny * 130;
    soundEngine.playMetallicHit(1.1);
    spawnSparks(world, impactX, impactY, 20, '#FBBF24', 1.2);
    world.screenShake = Math.max(world.screenShake, 7);
    world.hitStopTimer = 0.025;
  }

  // High-speed ramming impact (especially with Ram Overdrive)
  if (impactSpeed > 150 && !aSpinnerHit && !bSpinnerHit) {
    soundEngine.playMetallicHit(Math.min(1.2, impactSpeed / 280));
    spawnSparks(world, impactX, impactY, 10, '#E2E8F0', 0.8);

    if (a.secondaryWeapon === 'ram_overdrive' && a.secondaryActiveTimer > 0 && aFrontDiff < 0.7) {
      applyDamage(world, b, a, 16 * a.stats.secondaryPower, 'secondary', 'RAM', false, angAtoB);
      b.vx += nx * 320;
      b.vy += ny * 320;
    } else if (b.secondaryWeapon === 'ram_overdrive' && b.secondaryActiveTimer > 0 && bFrontDiff < 0.7) {
      applyDamage(world, a, b, 16 * b.stats.secondaryPower, 'secondary', 'RAM', false, angBtoA);
      a.vx -= nx * 320;
      a.vy -= ny * 320;
    }
  }

  // Prevent infinite tiny overlap jitter
  if (dt > 0 && impactSpeed > 80) {
    world.screenShake = Math.max(world.screenShake, 2.5);
  }
}

function updateHazards(world: ArenaWorld, dt: number): void {
  const fastMod = world.hazardIntensity === 'mayhem' ? 0.65 : 1.0;

  for (const h of world.hazards) {
    if (h.type === 'screw') {
      h.spinAngle += dt * 11;
      for (const bot of [world.red, world.blue]) {
        if (bot.z > 16) continue;
        const nearX = Math.abs(bot.x - h.x) < bot.radius + 18;
        const nearY = Math.abs(bot.y - h.y) < h.height / 2 + bot.radius * 0.4;
        if (nearX && nearY) {
          const pushX = h.side === 'left' ? 1 : -1;
          const pullY = h.side === 'left' ? 120 : -120;
          bot.vx += pushX * 260 * dt * 8;
          bot.vy += pullY * dt * 4;
          if (Math.random() < 0.28) {
            const other = bot.corner === 'red' ? world.blue : world.red;
            applyDamage(world, bot, other, 5, 'screw', 'SCREW', true);
            soundEngine.playMetallicHit(0.5);
            spawnSparks(world, h.x, bot.y, 7, '#F97316', 0.8);
          }
        }
      }
      continue;
    }

    h.timer -= dt;
    if (h.type === 'killsaw' && h.phase === 'active') {
      h.spinAngle += dt * 26;
    }

    if (h.timer <= 0) {
      if (h.phase === 'idle') {
        h.phase = 'warning';
        h.timer = h.type === 'pulverizer' ? 1.1 : 0.95;
      } else if (h.phase === 'warning') {
        h.phase = 'active';
        if (h.type === 'pulverizer') {
          h.timer = 0.35;
          soundEngine.playHammerSlam();
          spawnRing(world, h.x, h.y, h.radius + 32, '#EF4444');
          world.screenShake = Math.max(world.screenShake, 8);
          // Pulverizer instant area strike
          for (const bot of [world.red, world.blue]) {
            const d = Math.hypot(bot.x - h.x, bot.y - h.y);
            if (d < h.radius + bot.radius + 6 && bot.z < 28) {
              const other = bot.corner === 'red' ? world.blue : world.red;
              applyDamage(world, bot, other, 24, 'pulverizer', 'PULVERIZER', true);
              bot.stunTimer = Math.max(bot.stunTimer, 0.45);
              const ang = Math.atan2(bot.y - h.y, bot.x - h.x);
              bot.vx += Math.cos(ang) * 340;
              bot.vy += Math.sin(ang) * 340;
              spawnSparks(world, bot.x, bot.y, 18, '#EF4444', 1.2);
            }
          }
        } else if (h.type === 'killsaw') {
          h.timer = 3.8;
        } else if (h.type === 'flamejet') {
          h.timer = 2.6;
          soundEngine.playFlameBurst();
        }
      } else if (h.phase === 'active') {
        h.phase = 'cooldown';
        h.timer = 0.9 * fastMod;
      } else {
        h.phase = 'idle';
        h.timer = (h.type === 'pulverizer' ? 3.2 : 2.6) * fastMod;
      }
    }

    // Continuous hazard contact while active
    if (h.phase === 'active' && h.type === 'killsaw') {
      for (const bot of [world.red, world.blue]) {
        if (bot.z > 14) continue;
        const d = Math.hypot(bot.x - h.x, bot.y - h.y);
        if (d < h.radius + bot.radius - 4) {
          const ang = Math.atan2(bot.y - h.y, bot.x - h.x);
          bot.vx += Math.cos(ang) * 320;
          bot.vy += Math.sin(ang) * 320;
          bot.vz = Math.max(bot.vz, 110);
          bot.z = Math.max(bot.z, 1);
          const other = bot.corner === 'red' ? world.blue : world.red;
          applyDamage(world, bot, other, 13, 'killsaw', 'KILLSAW', true);
          soundEngine.playMetallicHit(0.95);
          spawnSparks(world, bot.x, bot.y, 16, '#FACC15', 1.1);
          world.screenShake = Math.max(world.screenShake, 5);
        }
      }
    } else if (h.phase === 'active' && h.type === 'flamejet') {
      if (Math.random() < 0.65) {
        world.particles.push({
          x: h.x + (Math.random() - 0.5) * 44,
          y: h.y + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60,
          life: 0.25,
          maxLife: 0.25,
          size: 8 + Math.random() * 6,
          color: Math.random() > 0.35 ? '#F97316' : '#FACC15',
          kind: 'flame',
        });
      }
      for (const bot of [world.red, world.blue]) {
        if (bot.z > 22) continue;
        const d = Math.hypot(bot.x - h.x, bot.y - h.y);
        if (d < h.radius + bot.radius) {
          bot.burnTimer = Math.max(bot.burnTimer, 1.5);
          bot.burnSource = 'flamejet';
          if (Math.random() < 0.14) {
            const other = bot.corner === 'red' ? world.blue : world.red;
            applyDamage(world, bot, other, 5, 'flamejet', 'FLAME', true);
          }
        }
      }
    }
  }
}

function updateParticles(world: ArenaWorld, dt: number): void {
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const p = world.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      world.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'spark') {
      p.vx *= Math.exp(-5 * dt);
      p.vy *= Math.exp(-5 * dt);
    }
  }

  for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
    const f = world.floatingTexts[i];
    f.life -= dt;
    f.y += f.vy * dt;
    if (f.life <= 0) {
      world.floatingTexts.splice(i, 1);
    }
  }

  world.screenShake = Math.max(0, world.screenShake - dt * 24);
}

export function stepArenaWorld(
  world: ArenaWorld,
  playerInput: InputState,
  controlMode: ControlMode,
  difficulty: DifficultyLevel,
  dt: number
): void {
  const clampedDt = Math.min(0.033, dt);

  if (world.hitStopTimer > 0) {
    world.hitStopTimer -= clampedDt;
    updateParticles(world, clampedDt * 0.35);
    return;
  }

  world.elapsed += clampedDt;

  // Red Bot controls (Player or AI in Spectator mode)
  if (world.red.isPlayer) {
    applyPlayerControls(
      world,
      world.red,
      world.blue,
      playerInput,
      controlMode,
      clampedDt
    );
  } else {
    updateBotAI(world, world.red, world.blue, difficulty, clampedDt);
  }

  // Blue Bot AI
  updateBotAI(world, world.blue, world.red, difficulty, clampedDt);

  updateBotKinematics(world, world.red, clampedDt);
  updateBotKinematics(world, world.blue, clampedDt);
  resolveBotToBotCombat(world, clampedDt);
  updateHazards(world, clampedDt);
  updateParticles(world, clampedDt);

  // Record replay frame at 20Hz
  if (world.elapsed - world.lastReplaySample >= 0.05) {
    world.lastReplaySample = world.elapsed;
    recordReplayFrame(world);
  }
}
