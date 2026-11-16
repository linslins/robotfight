import { useState } from 'react';
import {
  ACCENT_COLORS,
  ARMOR_TYPES,
  BASE_STAT_POINTS,
  BOT_ARCHETYPES,
  computeBotStats,
  COSMETIC_ATTACHMENTS,
  getArchetype,
  getUpgradeCost,
  MAX_SINGLE_STAT,
  PAINT_COLORS,
  PAINT_PATTERNS,
  PRIMARY_WEAPONS,
  SECONDARY_WEAPONS,
} from '../data/bots';
import {
  ArmorType,
  BotLoadout,
  BotUpgrades,
  CosmeticAttachment,
  PaintPattern,
  PlayerProgress,
  SecondaryWeaponType,
  StatAllocation,
  WeaponType,
} from '../types/game';
import { BotPreviewCanvas } from './BotPreviewCanvas';

interface WorkshopViewProps {
  progress: PlayerProgress;
  activeLoadout: BotLoadout;
  onUpdateLoadout: (loadout: BotLoadout) => void;
  onSaveAsNewLoadout: (loadout: BotLoadout) => void;
  onSelectLoadout: (loadoutId: string) => void;
  onDeleteLoadout: (loadoutId: string) => void;
  onUpgradeStat: (chassisId: string, key: keyof BotUpgrades) => void;
  onGoToArena: () => void;
}

type WorkshopTab = 'functional' | 'visual' | 'upgrades';

export function WorkshopView({
  progress,
  activeLoadout,
  onUpdateLoadout,
  onSaveAsNewLoadout,
  onSelectLoadout,
  onDeleteLoadout,
  onUpgradeStat,
  onGoToArena,
}: WorkshopViewProps) {
  const [tab, setTab] = useState<WorkshopTab>('functional');
  const [newNameDraft, setNewNameDraft] = useState(activeLoadout.name);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const upgrades = progress.upgradesByBot[activeLoadout.chassisId] ?? {
    armor: 1,
    weapon: 1,
    drive: 1,
    wedge: 1,
  };

  const stats = computeBotStats(
    activeLoadout.chassisId,
    activeLoadout.primaryWeapon,
    activeLoadout.armorType,
    upgrades,
    activeLoadout.statAllocation
  );

  const totalStatPool = BASE_STAT_POINTS + progress.bonusStatPoints;
  const spentPoints =
    activeLoadout.statAllocation.speed +
    activeLoadout.statAllocation.durability +
    activeLoadout.statAllocation.power;
  const remainingPoints = Math.max(0, totalStatPool - spentPoints);

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 2200);
  };

  const handleLoadoutSelect = (id: string) => {
    onSelectLoadout(id);
    const found = progress.loadouts.find((l) => l.id === id);
    if (found) setNewNameDraft(found.name);
  };

  const updateField = <K extends keyof BotLoadout>(
    key: K,
    val: BotLoadout[K]
  ) => {
    onUpdateLoadout({
      ...activeLoadout,
      [key]: val,
      updatedAt: Date.now(),
    });
  };

  const adjustStat = (key: keyof StatAllocation, delta: number) => {
    const current = activeLoadout.statAllocation[key];
    if (delta > 0 && (remainingPoints <= 0 || current >= MAX_SINGLE_STAT)) {
      return;
    }
    if (delta < 0 && current <= 0) return;
    updateField('statAllocation', {
      ...activeLoadout.statAllocation,
      [key]: current + delta,
    });
  };

  const resetStatPoints = () => {
    updateField('statAllocation', { speed: 0, durability: 0, power: 0 });
  };

  const toggleAttachment = (att: CosmeticAttachment) => {
    const exists = activeLoadout.visual.attachments.includes(att);
    const next = exists
      ? activeLoadout.visual.attachments.filter((a) => a !== att)
      : [...activeLoadout.visual.attachments, att];
    updateField('visual', {
      ...activeLoadout.visual,
      attachments: next,
    });
  };

  const handleSaveCurrent = () => {
    const clean = newNameDraft.trim() || activeLoadout.name;
    onUpdateLoadout({
      ...activeLoadout,
      name: clean,
      updatedAt: Date.now(),
    });
    notify(`Saved loadout "${clean}"`);
  };

  const handleSaveAsNew = () => {
    const baseName = newNameDraft.trim() || `${getArchetype(activeLoadout.chassisId).name} Custom`;
    const copy: BotLoadout = {
      ...activeLoadout,
      id: `loadout-${Date.now()}`,
      name: `${baseName} Copy`,
      updatedAt: Date.now(),
    };
    onSaveAsNewLoadout(copy);
    setNewNameDraft(copy.name);
    notify(`Created loadout "${copy.name}"`);
  };

  const upgradeRows: {
    key: keyof BotUpgrades;
    title: string;
    detail: string;
  }[] = [
    {
      key: 'armor',
      title: 'Armor Plating',
      detail: 'Increases Max HP, impact damage mitigation, and chassis mass.',
    },
    {
      key: 'weapon',
      title: 'Weapon Core',
      detail: 'Boosts primary weapon damage, knockback impulse, and cycle rate.',
    },
    {
      key: 'drive',
      title: 'Drive Train',
      detail: 'Improves top speed, cornering torque, and secondary cooldown.',
    },
    {
      key: 'wedge',
      title: 'Shock & Wedge',
      detail: 'Increases front wedge deflection against incoming spinner impacts.',
    },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      {/* Header Row */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide text-slate-100">
            Bot Workshop
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure weapons, armor alloys, stat allocation, paint liveries, and chassis upgrades.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-slate-400">Available Scrap</div>
            <div className="font-mono-tabular text-xl font-semibold text-orange-400">
              {progress.scrap} SCR
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToArena}
            className="rounded-md bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Take to Arena
          </button>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Live Schematic + Loadout Manager + Telemetry */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-white/10 bg-[#14181F] p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-display text-xl font-semibold text-slate-100">
                {activeLoadout.name}
              </h2>
              <span className="text-xs text-slate-400">
                {getArchetype(activeLoadout.chassisId).name} Chassis
              </span>
            </div>

            <BotPreviewCanvas
              chassisId={activeLoadout.chassisId}
              primaryWeapon={activeLoadout.primaryWeapon}
              secondaryWeapon={activeLoadout.secondaryWeapon}
              armorType={activeLoadout.armorType}
              visual={activeLoadout.visual}
              upgrades={upgrades}
              name={activeLoadout.name}
              size={280}
            />

            {/* Computed Telemetry */}
            <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Hull Integrity</span>
                <span className="font-mono-tabular font-semibold text-slate-100">
                  {stats.maxHp} HP
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Weapon Damage</span>
                <span className="font-mono-tabular font-semibold text-slate-100">
                  {stats.weaponDamage} DMG
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Drive Speed</span>
                <span className="font-mono-tabular font-semibold text-slate-100">
                  {stats.speed} u/s
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Armor Mitigation</span>
                <span className="font-mono-tabular font-semibold text-slate-100">
                  {Math.round(stats.armorMitigation * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Wedge Deflection</span>
                <span className="font-mono-tabular font-semibold text-slate-100">
                  {Math.round(stats.wedgeDeflection * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Saved Loadouts Panel */}
          <div className="rounded-xl border border-white/10 bg-[#14181F] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-slate-100">
                Saved Loadouts
              </h3>
              <span className="font-mono-tabular text-xs text-slate-400">
                {progress.loadouts.length} saved
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {progress.loadouts.map((l) => {
                const isSelected = l.id === activeLoadout.id;
                return (
                  <div
                    key={l.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      isSelected
                        ? 'border-orange-500/70 bg-orange-500/10 text-slate-100'
                        : 'border-white/10 bg-[#0D1014] text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleLoadoutSelect(l.id)}
                      className="flex-1 text-left truncate cursor-pointer"
                    >
                      <span className="font-medium">{l.name}</span>
                      <span className="ml-2 text-xs text-slate-400">
                        · {PRIMARY_WEAPONS[l.primaryWeapon].shortLabel}
                      </span>
                    </button>
                    {progress.loadouts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteLoadout(l.id)}
                        className="text-xs text-slate-400 hover:text-red-400 px-1.5 py-0.5 cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-2.5 border-t border-white/10 pt-3">
              <label className="block text-xs text-slate-400">
                Loadout Name
                <input
                  type="text"
                  value={newNameDraft}
                  onChange={(e) => setNewNameDraft(e.target.value)}
                  maxLength={28}
                  className="mt-1 w-full rounded-md border border-white/15 bg-[#0D1014] px-3 py-2 text-sm text-slate-100 focus:border-orange-500 focus:outline-none"
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCurrent}
                  className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 cursor-pointer"
                >
                  Save Loadout
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsNew}
                  className="flex-1 rounded-md border border-white/15 bg-[#0D1014] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 cursor-pointer"
                >
                  Save as New
                </button>
              </div>
              {statusMessage && (
                <p className="text-xs text-emerald-400">{statusMessage}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Configuration Tabs */}
        <div className="lg:col-span-8 space-y-6">
          {/* Segmented Tab Control */}
          <div className="inline-flex rounded-lg border border-white/10 bg-[#14181F] p-1">
            {(
              [
                { id: 'functional', label: 'Weapons & Stats' },
                { id: 'visual', label: 'Paint & Cosmetics' },
                { id: 'upgrades', label: 'Chassis Upgrades' },
              ] as { id: WorkshopTab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === t.id
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'functional' && (
            <div className="space-y-6">
              {/* Base Chassis */}
              <div className="rounded-xl border border-white/10 bg-[#14181F] p-6">
                <h3 className="font-display text-lg font-semibold text-slate-100">
                  Base Chassis Frame
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {BOT_ARCHETYPES.map((arch) => {
                    const unlocked = progress.unlockedBotIds.includes(arch.id);
                    const active = activeLoadout.chassisId === arch.id;
                    return (
                      <button
                        key={arch.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => updateField('chassisId', arch.id)}
                        className={`rounded-lg border p-3.5 text-left transition-colors ${
                          active
                            ? 'border-orange-500 bg-orange-500/10'
                            : unlocked
                              ? 'border-white/10 bg-[#0D1014] hover:border-white/25 cursor-pointer'
                              : 'border-white/5 bg-[#0D1014]/60 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-slate-100">
                            {arch.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {unlocked ? `HP ${arch.baseHp}` : 'Locked'}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {arch.tagline}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Weapon */}
              <div className="rounded-xl border border-white/10 bg-[#14181F] p-6">
                <h3 className="font-display text-lg font-semibold text-slate-100">
                  Primary Weapon (Space / Left Click)
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(Object.keys(PRIMARY_WEAPONS) as WeaponType[]).map((wKey) => {
                    const w = PRIMARY_WEAPONS[wKey];
                    const active = activeLoadout.primaryWeapon === wKey;
                    return (
                      <button
                        key={wKey}
                        type="button"
                        onClick={() => updateField('primaryWeapon', wKey)}
                        className={`rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-white/10 bg-[#0D1014] hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-100">
                            {w.name}
                          </span>
                          <span className="font-mono-tabular text-xs text-orange-400">
                            {Math.round(w.damageMod * 100)}% DMG
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                          {w.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Weapon & Armor Type */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-[#14181F] p-6">
                  <h3 className="font-display text-lg font-semibold text-slate-100">
                    Secondary Module (E / Right Click)
                  </h3>
                  <div className="mt-3 space-y-2.5">
                    {(Object.keys(SECONDARY_WEAPONS) as SecondaryWeaponType[]).map(
                      (sKey) => {
                        const s = SECONDARY_WEAPONS[sKey];
                        const active = activeLoadout.secondaryWeapon === sKey;
                        return (
                          <button
                            key={sKey}
                            type="button"
                            onClick={() => updateField('secondaryWeapon', sKey)}
                            className={`w-full rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                              active
                                ? 'border-orange-500 bg-orange-500/10'
                                : 'border-white/10 bg-[#0D1014] hover:border-white/25'
                            }`}
                          >
                            <div className="text-sm font-semibold text-slate-100">
                              {s.name}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-400">
                              {s.description}
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#14181F] p-6">
                  <h3 className="font-display text-lg font-semibold text-slate-100">
                    Armor Alloy Type
                  </h3>
                  <div className="mt-3 space-y-2.5">
                    {(Object.keys(ARMOR_TYPES) as ArmorType[]).map((aKey) => {
                      const a = ARMOR_TYPES[aKey];
                      const active = activeLoadout.armorType === aKey;
                      return (
                        <button
                          key={aKey}
                          type="button"
                          onClick={() => updateField('armorType', aKey)}
                          className={`w-full rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                            active
                              ? 'border-orange-500 bg-orange-500/10'
                              : 'border-white/10 bg-[#0D1014] hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-100">
                              {a.name}
                            </span>
                            <span className="font-mono-tabular text-xs text-slate-400">
                              HP {Math.round(a.hpMult * 100)}% · SPD{' '}
                              {Math.round(a.speedMult * 100)}%
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {a.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Stat Point Allocation */}
              <div className="rounded-xl border border-white/10 bg-[#14181F] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-100">
                      Stat Point Allocation
                    </h3>
                    <p className="text-xs text-slate-400">
                      Win matches to earn bonus stat points. Max {MAX_SINGLE_STAT} per attribute.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono-tabular text-sm text-orange-400 font-semibold">
                      {remainingPoints} Points Available
                    </span>
                    <button
                      type="button"
                      onClick={resetStatPoints}
                      className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {(
                    [
                      {
                        key: 'speed',
                        label: 'Speed',
                        sub: '+3.2% Drive Speed & Accel / pt',
                      },
                      {
                        key: 'durability',
                        label: 'Durability',
                        sub: '+4.5% Max HP & Armor / pt',
                      },
                      {
                        key: 'power',
                        label: 'Power',
                        sub: '+4.5% Weapon Damage & Impulse / pt',
                      },
                    ] as { key: keyof StatAllocation; label: string; sub: string }[]
                  ).map((item) => {
                    const val = activeLoadout.statAllocation[item.key];
                    return (
                      <div
                        key={item.key}
                        className="rounded-lg border border-white/10 bg-[#0D1014] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-100">
                            {item.label}
                          </span>
                          <span className="font-mono-tabular text-sm font-bold text-orange-400">
                            {val} / {MAX_SINGLE_STAT}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{item.sub}</p>

                        <div className="mt-3 h-2 w-full rounded bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-orange-500 transition-all"
                            style={{ width: `${(val / MAX_SINGLE_STAT) * 100}%` }}
                          />
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => adjustStat(item.key, -1)}
                            disabled={val <= 0}
                            className="flex-1 rounded border border-white/15 py-1.5 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-35 cursor-pointer"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustStat(item.key, 1)}
                            disabled={remainingPoints <= 0 || val >= MAX_SINGLE_STAT}
                            className="flex-1 rounded border border-white/15 py-1.5 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-35 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'visual' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-white/10 bg-[#14181F] p-6 space-y-6">
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-100">
                    Primary Hull Paint
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {PAINT_COLORS.map((c) => {
                      const active = activeLoadout.visual.primaryColor === c.hex;
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() =>
                            updateField('visual', {
                              ...activeLoadout.visual,
                              primaryColor: c.hex,
                            })
                          }
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer ${
                            active
                              ? 'border-orange-500 bg-orange-500/10 text-white'
                              : 'border-white/10 bg-[#0D1014] text-slate-300 hover:border-white/25'
                          }`}
                        >
                          <span
                            className="h-4 w-4 rounded border border-white/20"
                            style={{ backgroundColor: c.hex }}
                          />
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-100">
                    Trim & Weapon Accent
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {ACCENT_COLORS.map((c) => {
                      const active = activeLoadout.visual.accentColor === c.hex;
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() =>
                            updateField('visual', {
                              ...activeLoadout.visual,
                              accentColor: c.hex,
                            })
                          }
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer ${
                            active
                              ? 'border-orange-500 bg-orange-500/10 text-white'
                              : 'border-white/10 bg-[#0D1014] text-slate-300 hover:border-white/25'
                          }`}
                        >
                          <span
                            className="h-4 w-4 rounded border border-white/20"
                            style={{ backgroundColor: c.hex }}
                          />
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-100">
                    Livery Pattern
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {PAINT_PATTERNS.map((p) => {
                      const active = activeLoadout.visual.pattern === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            updateField('visual', {
                              ...activeLoadout.visual,
                              pattern: p.id as PaintPattern,
                            })
                          }
                          className={`rounded-lg border px-3 py-2.5 text-sm font-medium cursor-pointer ${
                            active
                              ? 'border-orange-500 bg-orange-500/10 text-white'
                              : 'border-white/10 bg-[#0D1014] text-slate-300 hover:border-white/25'
                          }`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Cosmetic Attachments */}
              <div className="rounded-xl border border-white/10 bg-[#14181F] p-6">
                <h3 className="font-display text-lg font-semibold text-slate-100">
                  Cosmetic Chassis Attachments
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Visible directly in top-down BattleBox combat and replay broadcasts.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {COSMETIC_ATTACHMENTS.map((att) => {
                    const enabled = activeLoadout.visual.attachments.includes(att.id);
                    return (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => toggleAttachment(att.id)}
                        className={`rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                          enabled
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-white/10 bg-[#0D1014] hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-100">
                            {att.name}
                          </span>
                          <span className="text-xs font-medium text-orange-400">
                            {enabled ? 'Equipped' : 'Off'}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {att.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'upgrades' && (
            <div className="rounded-xl border border-white/10 bg-[#14181F] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-100">
                    {getArchetype(activeLoadout.chassisId).name} Engineering Upgrades
                  </h3>
                  <p className="text-xs text-slate-400">
                    Spend Scrap Credits earned from matches to permanently reinforce this chassis.
                  </p>
                </div>
                <span className="font-mono-tabular text-sm font-semibold text-orange-400">
                  {progress.scrap} SCR
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {upgradeRows.map((row) => {
                  const lvl = upgrades[row.key];
                  const cost = getUpgradeCost(lvl);
                  const isMax = lvl >= 5;
                  const canAfford = !isMax && progress.scrap >= cost;

                  return (
                    <div
                      key={row.key}
                      className="rounded-lg border border-white/10 bg-[#0D1014] p-4 flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold text-slate-100">
                            {row.title}
                          </span>
                          <span className="font-mono-tabular text-xs font-semibold text-orange-400">
                            Tier {lvl} / 5
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{row.detail}</p>

                        <div className="mt-3 flex gap-1.5">
                          {[1, 2, 3, 4, 5].map((tier) => (
                            <div
                              key={tier}
                              className={`h-2 flex-1 rounded-sm ${
                                tier <= lvl ? 'bg-orange-500' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isMax || !canAfford}
                        onClick={() => onUpgradeStat(activeLoadout.chassisId, row.key)}
                        className="w-full rounded-md bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-orange-600 disabled:opacity-45 disabled:hover:bg-slate-800 cursor-pointer"
                      >
                        {isMax
                          ? 'Max Tier Reached'
                          : `Upgrade (${cost} SCR)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
