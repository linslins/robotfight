export type WeaponType =
  | 'vertical_disk'
  | 'horizontal_bar'
  | 'flipper'
  | 'hammer'
  | 'drum';

export type SecondaryWeaponType =
  | 'flamethrower'
  | 'harpoon'
  | 'shock_pulse'
  | 'ram_overdrive'
  | 'gyro_stabilizer';

export type ArmorType =
  | 'titanium_plate'
  | 'hardox_heavy'
  | 'uhmw_flex'
  | 'reactive_kevlar';

export type PaintPattern =
  | 'solid'
  | 'racing_stripes'
  | 'hazard_chevron'
  | 'carbon_split';

export type CosmeticAttachment =
  | 'rear_spoiler'
  | 'side_skirts'
  | 'fork_guards'
  | 'roll_cage'
  | 'underglow'
  | 'battle_horns';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type ControlMode = 'mouse_aim' | 'rc_tank';

export type CameraMode =
  | 'fixed'
  | 'action'
  | 'follow_red'
  | 'follow_blue'
  | 'free';

export type GameView =
  | 'arena'
  | 'workshop'
  | 'roster'
  | 'tournament'
  | 'broadcast';

export type TournamentTier = 'qualifier' | 'pro' | 'championship';

export type MatchMode = 'player_vs_ai' | 'spectate' | 'replay';

export type MatchPhase =
  | 'pre_match'
  | 'countdown'
  | 'fighting'
  | 'paused'
  | 'ended';

export interface BotUpgrades {
  armor: number; // 1..5
  weapon: number; // 1..5
  drive: number; // 1..5
  wedge: number; // 1..5
}

export interface StatAllocation {
  speed: number; // 0..10
  durability: number; // 0..10
  power: number; // 0..10
}

export interface BotVisualConfig {
  primaryColor: string;
  accentColor: string;
  pattern: PaintPattern;
  attachments: CosmeticAttachment[];
}

export interface BotLoadout {
  id: string;
  name: string;
  chassisId: string;
  primaryWeapon: WeaponType;
  secondaryWeapon: SecondaryWeaponType;
  armorType: ArmorType;
  statAllocation: StatAllocation;
  visual: BotVisualConfig;
  updatedAt: number;
}

export interface BotArchetype {
  id: string;
  name: string;
  inspiredBy: string;
  tagline: string;
  description: string;
  defaultWeapon: WeaponType;
  defaultSecondary: SecondaryWeaponType;
  defaultArmor: ArmorType;
  unlockCost: number;
  baseHp: number;
  baseSpeed: number;
  baseTurnRate: number;
  baseMass: number;
  weaponDamage: number;
  weaponKnockback: number;
  weaponCooldown: number; // seconds for active trigger, or 0 for continuous spin
  radius: number;
  defaultVisual: BotVisualConfig;
}

export interface ComputedBotStats {
  maxHp: number;
  speed: number;
  acceleration: number;
  turnRate: number;
  mass: number;
  weaponDamage: number;
  weaponKnockback: number;
  weaponCooldown: number;
  armorMitigation: number; // 0..0.55
  wedgeDeflection: number; // 0..0.6
  secondaryPower: number;
  secondaryCooldown: number;
}

export interface BotEntity {
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
  stats: ComputedBotStats;

  // Spatial physics
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVel: number;
  z: number; // Airborne height (when flipped!)
  vz: number;
  radius: number;

  // Combat state
  hp: number;
  maxHp: number;
  weaponSpin: number; // 0..1 normalized spin-up or charge
  weaponAngle: number; // visual rotation for spinners / hammer swing
  weaponCooldownTimer: number;
  weaponActiveTimer: number; // active animation window (flipper/hammer)
  secondaryCooldownTimer: number;
  secondaryActiveTimer: number;
  boostCooldownTimer: number;
  boostActiveTimer: number;
  stunTimer: number;
  burnTimer: number;
  hitFlashTimer: number;
  smokeTimer: number;

  // Match telemetry
  damageDealt: number;
  hazardDamageDealt: number;
  hitsLanded: number;
  flipsLanded: number;
  burnSource: 'flamethrower' | 'flamejet' | null;
  combatStats: BotCombatBreakdown;

  // AI internal memory
  aiDecisionTimer: number;
  aiDesiredAngle: number;
  aiStrafeDir: number;
  aiActionState: 'pursue' | 'flank' | 'evade_hazard' | 'retreat_spinup' | 'escape_wall';
}

export interface HazardZone {
  id: string;
  type: 'pulverizer' | 'killsaw' | 'flamejet' | 'screw';
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  side?: 'left' | 'right';
  phase: 'idle' | 'warning' | 'active' | 'cooldown';
  timer: number;
  cycleOffset: number;
  spinAngle: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: 'spark' | 'smoke' | 'flame' | 'debris' | 'ring';
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  color: string;
}

export interface ReplayBotSnapshot {
  x: number;
  y: number;
  angle: number;
  z: number;
  hp: number;
  maxHp: number;
  weaponAngle: number;
  weaponSpin: number;
  weaponActiveTimer: number;
  secondaryActiveTimer: number;
  boostActiveTimer: number;
  hitFlashTimer: number;
  burnTimer: number;
  damageDealt: number;
}

export interface ReplayHazardSnapshot {
  phase: HazardZone['phase'];
  timer: number;
  spinAngle: number;
}

export interface ReplayFrame {
  t: number; // match elapsed seconds
  red: ReplayBotSnapshot;
  blue: ReplayBotSnapshot;
  hazards: ReplayHazardSnapshot[];
}

export interface ReplayFighterMeta {
  name: string;
  chassisId: string;
  primaryWeapon: WeaponType;
  secondaryWeapon: SecondaryWeaponType;
  armorType: ArmorType;
  visual: BotVisualConfig;
  upgrades: BotUpgrades;
  radius: number;
  maxHp: number;
}

export interface SavedReplay {
  id: string;
  createdAt: number;
  title: string;
  mode: 'player_vs_ai' | 'spectate';
  difficulty: DifficultyLevel;
  winnerCorner: 'red' | 'blue' | 'draw';
  winMethod: 'KO' | 'Judges Decision';
  duration: number;
  redMeta: ReplayFighterMeta;
  blueMeta: ReplayFighterMeta;
  redDamageDealt: number;
  blueDamageDealt: number;
  frames: ReplayFrame[];
}

export interface OngoingSpectatorMatch {
  id: string;
  title: string;
  eventTier: string;
  difficulty: DifficultyLevel;
  redChassisId: string;
  blueChassisId: string;
  redName: string;
  blueName: string;
  redHpPct: number;
  blueHpPct: number;
  elapsedSeconds: number;
  hazardIntensity: 'standard' | 'mayhem';
}

export interface HazardDamageBreakdown {
  pulverizers: number;
  killsaws: number;
  wallScrews: number;
  flameJets: number;
  wallSlams: number;
}

export interface BotCombatBreakdown {
  primaryDamageDealt: number;
  secondaryDamageDealt: number;
  hazardDamageInflicted: number;
  criticalHitsLanded: number;
  hitsLanded: number;
  flipsLanded: number;
  damageTakenFromWeapons: number;
  damageTakenFromHazards: number;
  damageTakenFromWalls: number;
  damageMitigated: number;
  totalDamageTaken: number;
  hazardsTakenByType: HazardDamageBreakdown;
}

export interface MatchResult {
  winner: 'player' | 'opponent' | 'draw';
  winMethod: 'KO' | 'Judges Decision';
  duration: number;
  playerDamageDealt: number;
  opponentDamageDealt: number;
  playerHazardDamage: number;
  redBreakdown: BotCombatBreakdown;
  blueBreakdown: BotCombatBreakdown;
  scrapEarned: number;
  bonusPointsEarned: number;
  difficulty: DifficultyLevel;
  replayId?: string;
}

export interface TournamentParticipant {
  id: string;
  name: string;
  chassisId: string;
  seed: number;
  isPlayer: boolean;
}

export interface TournamentMatch {
  id: string;
  round: 'qf' | 'sf' | 'final';
  slotIndex: number;
  red: TournamentParticipant | null;
  blue: TournamentParticipant | null;
  winnerId: string | null;
  winMethod?: 'KO' | 'Judges Decision' | 'Simulated';
  replayId?: string;
  isPlayerMatch: boolean;
}

export interface TournamentBracketState {
  id: string;
  tier: TournamentTier;
  difficulty: DifficultyLevel;
  hazardIntensity: 'standard' | 'mayhem';
  status: 'in_progress' | 'champion' | 'eliminated';
  rewardClaimed: boolean;
  unlockedRewardBotName?: string;
  matches: TournamentMatch[];
  championId: string | null;
}

export interface PlayerProgress {
  scrap: number;
  wins: number;
  losses: number;
  knockouts: number;
  tournamentsWon: number;
  bonusStatPoints: number;
  unlockedBotIds: string[];
  selectedBotId: string;
  activeLoadoutId: string;
  upgradesByBot: Record<string, BotUpgrades>;
  loadouts: BotLoadout[];
  recentMatches: SavedReplay[];
  savedReplayIds: string[];
  activeTournament: TournamentBracketState | null;
}
