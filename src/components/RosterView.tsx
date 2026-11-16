import {
  ARMOR_TYPES,
  BOT_ARCHETYPES,
  PRIMARY_WEAPONS,
  SECONDARY_WEAPONS,
} from '../data/bots';
import { PlayerProgress } from '../types/game';
import { BotPreviewCanvas } from './BotPreviewCanvas';

interface RosterViewProps {
  progress: PlayerProgress;
  selectedOpponentId: string;
  onUnlockBot: (botId: string) => void;
  onSelectChassisForLoadout: (botId: string) => void;
  onSelectOpponent: (botId: string) => void;
  onGoToWorkshop: () => void;
  onGoToArena: () => void;
}

export function RosterView({
  progress,
  selectedOpponentId,
  onUnlockBot,
  onSelectChassisForLoadout,
  onSelectOpponent,
  onGoToWorkshop,
  onGoToArena,
}: RosterViewProps) {
  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide text-slate-100">
            Combat Roster
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Unlock championship-inspired chassis, assign your active frame, or pick your next rival.
          </p>
        </div>

        {/* Career Summary Line (Zero-Pill) */}
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-slate-400">Record: </span>
            <span className="font-mono-tabular font-semibold text-slate-100">
              {progress.wins}W – {progress.losses}L
            </span>
          </div>
          <div>
            <span className="text-slate-400">KOs: </span>
            <span className="font-mono-tabular font-semibold text-slate-100">
              {progress.knockouts}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Scrap: </span>
            <span className="font-mono-tabular font-semibold text-orange-400">
              {progress.scrap} SCR
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {BOT_ARCHETYPES.map((bot) => {
          const isUnlocked = progress.unlockedBotIds.includes(bot.id);
          const isPlayerChassis = progress.selectedBotId === bot.id;
          const isOpponent = selectedOpponentId === bot.id;
          const canAfford = progress.scrap >= bot.unlockCost;
          const upgrades = progress.upgradesByBot[bot.id] ?? {
            armor: 1,
            weapon: 1,
            drive: 1,
            wedge: 1,
          };

          return (
            <div
              key={bot.id}
              className={`rounded-xl border bg-[#14181F] p-5 flex flex-col justify-between gap-5 ${
                isPlayerChassis
                  ? 'border-orange-500/80'
                  : 'border-white/10'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-slate-100">
                      {bot.name}
                    </h2>
                    <div className="text-xs text-slate-400">
                      {bot.tagline} · Inspired by {bot.inspiredBy}
                    </div>
                  </div>
                  <span className="font-mono-tabular text-xs font-semibold text-slate-300">
                    {isUnlocked ? 'Unlocked' : `${bot.unlockCost} SCR`}
                  </span>
                </div>

                <BotPreviewCanvas
                  chassisId={bot.id}
                  primaryWeapon={bot.defaultWeapon}
                  secondaryWeapon={bot.defaultSecondary}
                  armorType={bot.defaultArmor}
                  visual={bot.defaultVisual}
                  upgrades={upgrades}
                  name={bot.name}
                  corner={isOpponent && !isPlayerChassis ? 'blue' : 'red'}
                  size={220}
                />

                <p className="text-xs text-slate-300 leading-relaxed">
                  {bot.description}
                </p>

                <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-xs">
                  <div>
                    <span className="text-slate-400">Primary: </span>
                    <span className="text-slate-100 font-medium">
                      {PRIMARY_WEAPONS[bot.defaultWeapon].shortLabel}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Secondary: </span>
                    <span className="text-slate-100 font-medium">
                      {SECONDARY_WEAPONS[bot.defaultSecondary].shortLabel}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Armor: </span>
                    <span className="text-slate-100 font-medium">
                      {ARMOR_TYPES[bot.defaultArmor].name.split(' ')[0]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Base Hull: </span>
                    <span className="font-mono-tabular text-slate-100 font-medium">
                      {bot.baseHp} HP
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                {!isUnlocked ? (
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => onUnlockBot(bot.id)}
                    className="w-full rounded-md bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-500 disabled:opacity-45 cursor-pointer"
                  >
                    Unlock Chassis ({bot.unlockCost} SCR)
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectChassisForLoadout(bot.id);
                        onGoToWorkshop();
                      }}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        isPlayerChassis
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                      }`}
                    >
                      {isPlayerChassis ? 'Active Chassis' : 'Customize'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectOpponent(bot.id);
                        onGoToArena();
                      }}
                      className={`flex-1 rounded-md border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        isOpponent
                          ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                          : 'border-white/15 bg-[#0D1014] text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      {isOpponent ? 'Selected Rival' : 'Set as Rival'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
