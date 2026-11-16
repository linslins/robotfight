import {
  ArmorType,
  BotArchetype,
  BotLoadout,
  BotUpgrades,
  ComputedBotStats,
  CosmeticAttachment,
  DifficultyLevel,
  OngoingSpectatorMatch,
  PaintPattern,
  PlayerProgress,
  SecondaryWeaponType,
  StatAllocation,
  WeaponType,
} from '../types/game';

export const BOT_ARCHETYPES: BotArchetype[] = [
  {
    id: 'apex',
    name: 'Apex',
    inspiredBy: 'Bite Force / End Game',
    tagline: '4WD Vertical Disk Spinner',
    description:
      'Balanced championship chassis with wedged forks and a high-RPM vertical disk that delivers crisp uppercut pops and heavy kinetic strikes.',
    defaultWeapon: 'vertical_disk',
    defaultSecondary: 'ram_overdrive',
    defaultArmor: 'titanium_plate',
    unlockCost: 0,
    baseHp: 210,
    baseSpeed: 290,
    baseTurnRate: 4.8,
    baseMass: 1.0,
    weaponDamage: 24,
    weaponKnockback: 420,
    weaponCooldown: 1.1,
    radius: 26,
    defaultVisual: {
      primaryColor: '#2563EB',
      accentColor: '#F59E0B',
      pattern: 'racing_stripes',
      attachments: ['fork_guards', 'rear_spoiler'],
    },
  },
  {
    id: 'tungsten',
    name: 'Tungsten',
    inspiredBy: 'Tombstone',
    tagline: 'High-Inertia Horizontal Bar',
    description:
      'Brutal offset horizontal spinning bar with massive stored kinetic energy. Shreds exposed flanks and blasts opponents across the BattleBox.',
    defaultWeapon: 'horizontal_bar',
    defaultSecondary: 'shock_pulse',
    defaultArmor: 'uhmw_flex',
    unlockCost: 180,
    baseHp: 190,
    baseSpeed: 270,
    baseTurnRate: 4.2,
    baseMass: 1.12,
    weaponDamage: 32,
    weaponKnockback: 560,
    weaponCooldown: 1.4,
    radius: 27,
    defaultVisual: {
      primaryColor: '#1E293B',
      accentColor: '#EF4444',
      pattern: 'carbon_split',
      attachments: ['side_skirts'],
    },
  },
  {
    id: 'hydra_x',
    name: 'Hydra-X',
    inspiredBy: 'Hydra / Bronco',
    tagline: 'Pneumatic Launcher Flipper',
    description:
      'Ultra-low ground-scraping wedge equipped with a high-pressure nitrogen flipper arm that launches rivals airborne into arena hazards.',
    defaultWeapon: 'flipper',
    defaultSecondary: 'harpoon',
    defaultArmor: 'titanium_plate',
    unlockCost: 240,
    baseHp: 225,
    baseSpeed: 305,
    baseTurnRate: 5.1,
    baseMass: 1.05,
    weaponDamage: 17,
    weaponKnockback: 510,
    weaponCooldown: 1.65,
    radius: 26,
    defaultVisual: {
      primaryColor: '#0F766E',
      accentColor: '#F97316',
      pattern: 'hazard_chevron',
      attachments: ['fork_guards', 'underglow'],
    },
  },
  {
    id: 'valkyrie_h',
    name: 'Valkyrie-H',
    inspiredBy: 'SawBlaze / Shatter!',
    tagline: 'Articulated Overhead Hammer',
    description:
      'Fast armored control bot wielding a pneumatically driven overhead warhammer that pierces front wedges and stuns internals on direct hits.',
    defaultWeapon: 'hammer',
    defaultSecondary: 'flamethrower',
    defaultArmor: 'reactive_kevlar',
    unlockCost: 300,
    baseHp: 220,
    baseSpeed: 315,
    baseTurnRate: 5.4,
    baseMass: 0.96,
    weaponDamage: 30,
    weaponKnockback: 310,
    weaponCooldown: 1.35,
    radius: 25,
    defaultVisual: {
      primaryColor: '#991B1B',
      accentColor: '#FACC15',
      pattern: 'racing_stripes',
      attachments: ['roll_cage', 'battle_horns'],
    },
  },
  {
    id: 'inferno',
    name: 'Inferno',
    inspiredBy: 'Minotaur / Witch Doctor',
    tagline: 'High-Torque Drum Spinner',
    description:
      'Dense compact brawler packed with a twin-tooth drum spinner and heavy armor plating. Thrives in relentless nose-to-nose brawls.',
    defaultWeapon: 'drum',
    defaultSecondary: 'gyro_stabilizer',
    defaultArmor: 'hardox_heavy',
    unlockCost: 360,
    baseHp: 245,
    baseSpeed: 280,
    baseTurnRate: 4.9,
    baseMass: 1.2,
    weaponDamage: 26,
    weaponKnockback: 460,
    weaponCooldown: 1.0,
    radius: 25,
    defaultVisual: {
      primaryColor: '#C2410C',
      accentColor: '#FDE047',
      pattern: 'hazard_chevron',
      attachments: ['roll_cage', 'side_skirts'],
    },
  },
];

export const PRIMARY_WEAPONS: Record<
  WeaponType,
  {
    id: WeaponType;
    name: string;
    shortLabel: string;
    description: string;
    damageMod: number;
    knockbackMod: number;
    cooldown: number;
  }
> = {
  vertical_disk: {
    id: 'vertical_disk',
    name: 'Vertical Disk Spinner',
    shortLabel: 'V-Disk',
    description: 'Continuous front disk with active RPM overdrive burst for clean uppercut pops.',
    damageMod: 1.0,
    knockbackMod: 1.0,
    cooldown: 1.1,
  },
  horizontal_bar: {
    id: 'horizontal_bar',
    name: 'Horizontal Kinetic Bar',
    shortLabel: 'H-Bar',
    description: 'Extended spinning steel bar with huge radial reach and knockback recoil.',
    damageMod: 1.24,
    knockbackMod: 1.32,
    cooldown: 1.35,
  },
  flipper: {
    id: 'flipper',
    name: 'Pneumatic Flipper',
    shortLabel: 'Flipper',
    description: 'Fires a nitrogen wedge cone to launch opponents airborne and deal slam damage.',
    damageMod: 0.8,
    knockbackMod: 1.25,
    cooldown: 1.6,
  },
  hammer: {
    id: 'hammer',
    name: 'Overhead Warhammer',
    shortLabel: 'Hammer',
    description: 'Fast overhead strike that bypasses front wedge deflection and briefly stuns.',
    damageMod: 1.18,
    knockbackMod: 0.78,
    cooldown: 1.25,
  },
  drum: {
    id: 'drum',
    name: 'Twin-Tooth Drum',
    shortLabel: 'Drum',
    description: 'Compact high-torque drum spinner delivering rapid multi-bite vertical hits.',
    damageMod: 1.08,
    knockbackMod: 1.1,
    cooldown: 0.95,
  },
};

export const SECONDARY_WEAPONS: Record<
  SecondaryWeaponType,
  {
    id: SecondaryWeaponType;
    name: string;
    shortLabel: string;
    description: string;
    cooldown: number;
  }
> = {
  flamethrower: {
    id: 'flamethrower',
    name: 'Propane Flamethrower',
    shortLabel: 'Flame Jet',
    description: 'Projects a high-heat front fire cone that applies burn damage over time.',
    cooldown: 4.0,
  },
  harpoon: {
    id: 'harpoon',
    name: 'Magnetic Harpoon',
    shortLabel: 'Harpoon',
    description: 'Fires a tether bolt that pulls the opponent toward your primary weapon.',
    cooldown: 4.5,
  },
  shock_pulse: {
    id: 'shock_pulse',
    name: 'EMP Shock Pulse',
    shortLabel: 'Shockwave',
    description: 'Emits a radial kinetic pulse that shoves nearby bots into walls or hazards.',
    cooldown: 4.8,
  },
  ram_overdrive: {
    id: 'ram_overdrive',
    name: 'Ramming Overdrive',
    shortLabel: 'Ram Surge',
    description: 'Engages magnetic wheel lock for a brief heavy ramming burst with bonus damage.',
    cooldown: 4.2,
  },
  gyro_stabilizer: {
    id: 'gyro_stabilizer',
    name: 'Active Gyro Shield',
    shortLabel: 'Gyro Shield',
    description: 'Stabilizes chassis against flips and reduces incoming impact damage for 2.5s.',
    cooldown: 5.0,
  },
};

export const ARMOR_TYPES: Record<
  ArmorType,
  {
    id: ArmorType;
    name: string;
    description: string;
    hpMult: number;
    speedMult: number;
    massMult: number;
    mitigationBonus: number;
    wedgeBonus: number;
  }
> = {
  titanium_plate: {
    id: 'titanium_plate',
    name: 'Grade-5 Titanium',
    description: 'Balanced combat alloy offering solid durability with zero mobility penalty.',
    hpMult: 1.0,
    speedMult: 1.0,
    massMult: 1.0,
    mitigationBonus: 0.05,
    wedgeBonus: 0.06,
  },
  hardox_heavy: {
    id: 'hardox_heavy',
    name: 'Hardox 500 Heavy',
    description: 'Thick abrasion-resistant steel that boosts HP and weight at the cost of speed.',
    hpMult: 1.24,
    speedMult: 0.89,
    massMult: 1.22,
    mitigationBonus: 0.14,
    wedgeBonus: 0.08,
  },
  uhmw_flex: {
    id: 'uhmw_flex',
    name: 'UHMW Polymer Flex',
    description: 'Lightweight impact-absorbing polymer built for speed and wall-slam dampening.',
    hpMult: 0.92,
    speedMult: 1.12,
    massMult: 0.88,
    mitigationBonus: 0.03,
    wedgeBonus: 0.12,
  },
  reactive_kevlar: {
    id: 'reactive_kevlar',
    name: 'Composite Reactive',
    description: 'Layered titanium-aramid weave tuned to deflect high-energy spinner impacts.',
    hpMult: 1.06,
    speedMult: 0.97,
    massMult: 1.02,
    mitigationBonus: 0.1,
    wedgeBonus: 0.14,
  },
};

export const PAINT_COLORS = [
  { name: 'Cobalt Blue', hex: '#2563EB' },
  { name: 'Crimson Red', hex: '#DC2626' },
  { name: 'Safety Amber', hex: '#D97706' },
  { name: 'Gunmetal Slate', hex: '#334155' },
  { name: 'Tactical Teal', hex: '#0F766E' },
  { name: 'Forge Orange', hex: '#C2410C' },
  { name: 'Olive Steel', hex: '#4D7C0F' },
  { name: 'Obsidian', hex: '#18181B' },
];

export const ACCENT_COLORS = [
  { name: 'Signal Amber', hex: '#F59E0B' },
  { name: 'Flame Orange', hex: '#F97316' },
  { name: 'Hazard Yellow', hex: '#FACC15' },
  { name: 'Hot Crimson', hex: '#EF4444' },
  { name: 'Electric Cyan', hex: '#06B6D4' },
  { name: 'Titanium White', hex: '#E2E8F0' },
];

export const PAINT_PATTERNS: { id: PaintPattern; name: string }[] = [
  { id: 'solid', name: 'Solid Coat' },
  { id: 'racing_stripes', name: 'Dual Stripes' },
  { id: 'hazard_chevron', name: 'Hazard Chevrons' },
  { id: 'carbon_split', name: 'Split Chassis' },
];

export const COSMETIC_ATTACHMENTS: {
  id: CosmeticAttachment;
  name: string;
  description: string;
}[] = [
  { id: 'fork_guards', name: 'Titanium Forks', description: 'Extended front wedge prongs' },
  { id: 'side_skirts', name: 'Armored Skirts', description: 'Low-clearance wheel protection' },
  { id: 'roll_cage', name: 'Top Roll Cage', description: 'Tubular overhead frame bars' },
  { id: 'rear_spoiler', name: 'Rear Stabilizer', description: 'Machined rear aero fin' },
  { id: 'battle_horns', name: 'Front Ram Horns', description: 'Twin angled steel tusks' },
  { id: 'underglow', name: 'Chassis Underlight', description: 'Subtle arena floor ring glow' },
];

export const DIFFICULTY_CONFIG: Record<
  DifficultyLevel,
  {
    id: DifficultyLevel;
    label: string;
    scrapMultiplier: number;
    reactionInterval: number;
    aimAccuracy: number;
    hazardAwareness: number;
    aggression: number;
    secondaryUsage: number;
    description: string;
  }
> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    scrapMultiplier: 1.0,
    reactionInterval: 0.36,
    aimAccuracy: 0.55,
    hazardAwareness: 0.25,
    aggression: 0.52,
    secondaryUsage: 0.25,
    description: 'Predictable approaches, slower steering reactions, minimal hazard evasion.',
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    scrapMultiplier: 1.35,
    reactionInterval: 0.14,
    aimAccuracy: 0.8,
    hazardAwareness: 0.72,
    aggression: 0.78,
    secondaryUsage: 0.65,
    description: 'Balanced tactical flanking, solid weapon timing, avoids active hazards.',
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    scrapMultiplier: 1.8,
    reactionInterval: 0.04,
    aimAccuracy: 0.96,
    hazardAwareness: 0.96,
    aggression: 0.95,
    secondaryUsage: 0.95,
    description: 'Rapid target leading, flank hunting, hazard baiting, chained weapon combos.',
  },
};

export const BASE_STAT_POINTS = 12;
export const MAX_SINGLE_STAT = 10;

export function getUpgradeCost(currentLevel: number): number {
  if (currentLevel >= 5) return 0;
  return 75 * currentLevel + 25;
}

export function getArchetype(id: string): BotArchetype {
  return BOT_ARCHETYPES.find((b) => b.id === id) ?? BOT_ARCHETYPES[0];
}

export function computeBotStats(
  chassisId: string,
  primaryWeapon: WeaponType,
  armorType: ArmorType,
  upgrades: BotUpgrades,
  statAllocation: StatAllocation
): ComputedBotStats {
  const arch = getArchetype(chassisId);
  const wInfo = PRIMARY_WEAPONS[primaryWeapon];
  const aInfo = ARMOR_TYPES[armorType];

  const armorLevelBonus = (upgrades.armor - 1) * 0.11;
  const weaponLevelBonus = (upgrades.weapon - 1) * 0.12;
  const driveLevelBonus = (upgrades.drive - 1) * 0.08;
  const wedgeLevelBonus = (upgrades.wedge - 1) * 0.07;

  const durPts = statAllocation.durability;
  const spdPts = statAllocation.speed;
  const pwrPts = statAllocation.power;

  const maxHp = Math.round(
    arch.baseHp * aInfo.hpMult * (1 + armorLevelBonus + durPts * 0.045)
  );
  const speed = Math.round(
    arch.baseSpeed * aInfo.speedMult * (1 + driveLevelBonus + spdPts * 0.032)
  );
  const acceleration = speed * (4.4 + driveLevelBonus * 1.4 + spdPts * 0.16);
  const turnRate =
    arch.baseTurnRate * (1 + driveLevelBonus * 0.8 + spdPts * 0.03) * (2 - aInfo.massMult * 0.5 > 0.7 ? 1 : 0.9);
  const mass = arch.baseMass * aInfo.massMult * (1 + (upgrades.armor - 1) * 0.04);

  const weaponDamage = Math.round(
    arch.weaponDamage * wInfo.damageMod * (1 + weaponLevelBonus + pwrPts * 0.045)
  );
  const weaponKnockback = Math.round(
    arch.weaponKnockback * wInfo.knockbackMod * (1 + weaponLevelBonus * 0.7 + pwrPts * 0.035)
  );
  const weaponCooldown = Math.max(
    0.55,
    wInfo.cooldown * (1 - (upgrades.weapon - 1) * 0.05 - pwrPts * 0.015)
  );

  const armorMitigation = Math.min(
    0.52,
    aInfo.mitigationBonus + (upgrades.armor - 1) * 0.035 + durPts * 0.014
  );
  const wedgeDeflection = Math.min(
    0.6,
    0.16 + aInfo.wedgeBonus + wedgeLevelBonus + durPts * 0.01
  );

  const secondaryPower = 1 + (upgrades.weapon - 1) * 0.1 + pwrPts * 0.04;
  const secondaryCooldown = Math.max(2.6, 4.4 - (upgrades.drive - 1) * 0.22);

  return {
    maxHp,
    speed,
    acceleration,
    turnRate,
    mass,
    weaponDamage,
    weaponKnockback,
    weaponCooldown,
    armorMitigation,
    wedgeDeflection,
    secondaryPower,
    secondaryCooldown,
  };
}

export const INITIAL_ONGOING_SPECTATOR_MATCHES: OngoingSpectatorMatch[] = [
  {
    id: 'live-main-event',
    title: 'Main Event: Tungsten vs Hydra-X',
    eventTier: 'Championship Heat',
    difficulty: 'hard',
    redChassisId: 'tungsten',
    blueChassisId: 'hydra_x',
    redName: 'Tungsten',
    blueName: 'Hydra-X',
    redHpPct: 84,
    blueHpPct: 79,
    elapsedSeconds: 38,
    hazardIntensity: 'mayhem',
  },
  {
    id: 'live-co-main',
    title: 'Upper Bracket: Inferno vs Valkyrie-H',
    eventTier: 'Quarterfinal',
    difficulty: 'medium',
    redChassisId: 'inferno',
    blueChassisId: 'valkyrie_h',
    redName: 'Inferno',
    blueName: 'Valkyrie-H',
    redHpPct: 92,
    blueHpPct: 68,
    elapsedSeconds: 24,
    hazardIntensity: 'standard',
  },
  {
    id: 'live-rookie-brawl',
    title: 'Qualifier Bout: Apex vs Tungsten',
    eventTier: 'Open Qualifier',
    difficulty: 'easy',
    redChassisId: 'apex',
    blueChassisId: 'tungsten',
    redName: 'Apex Mk.I',
    blueName: 'Tungsten',
    redHpPct: 61,
    blueHpPct: 73,
    elapsedSeconds: 51,
    hazardIntensity: 'standard',
  },
];

export function createDefaultProgress(): PlayerProgress {
  const defaultUpgrades: Record<string, BotUpgrades> = {};
  for (const bot of BOT_ARCHETYPES) {
    defaultUpgrades[bot.id] = { armor: 1, weapon: 1, drive: 1, wedge: 1 };
  }

  const starterLoadout: BotLoadout = {
    id: 'loadout-apex-default',
    name: 'Apex Brawler',
    chassisId: 'apex',
    primaryWeapon: 'vertical_disk',
    secondaryWeapon: 'ram_overdrive',
    armorType: 'titanium_plate',
    statAllocation: { speed: 4, durability: 4, power: 4 },
    visual: {
      primaryColor: '#2563EB',
      accentColor: '#F59E0B',
      pattern: 'racing_stripes',
      attachments: ['fork_guards', 'rear_spoiler'],
    },
    updatedAt: Date.now(),
  };

  return {
    scrap: 200,
    wins: 0,
    losses: 0,
    knockouts: 0,
    tournamentsWon: 0,
    bonusStatPoints: 0,
    unlockedBotIds: ['apex', 'tungsten'],
    selectedBotId: 'apex',
    activeLoadoutId: starterLoadout.id,
    upgradesByBot: defaultUpgrades,
    loadouts: [starterLoadout],
    recentMatches: [],
    savedReplayIds: [],
    activeTournament: null,
  };
}
