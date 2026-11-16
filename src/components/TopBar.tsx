import { GameView } from '../types/game';

interface TopBarProps {
  activeView: GameView;
  onSelectView: (view: GameView) => void;
  onQuickStartMatch: () => void;
}

const NAV_ITEMS: { id: GameView; label: string }[] = [
  { id: 'arena', label: 'Arena' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'roster', label: 'Roster' },
  { id: 'tournament', label: 'Tournament' },
  { id: 'broadcast', label: 'Broadcast' },
];

export function TopBar({
  activeView,
  onSelectView,
  onQuickStartMatch,
}: TopBarProps) {
  return (
    <header className="w-full border-b border-white/10 bg-[#0D1014]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectView('arena')}
          className="font-display text-2xl font-bold tracking-wider text-slate-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
        >
          IRONPIT
        </button>

        {/* Zone 2: 4 single-line text nav links */}
        <nav
          aria-label="Primary Navigation"
          className="flex items-center gap-6 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`relative py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded ${
                  isActive
                    ? 'text-orange-400'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-orange-500"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onQuickStartMatch}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            Start Match
          </button>
        </div>
      </div>
    </header>
  );
}
