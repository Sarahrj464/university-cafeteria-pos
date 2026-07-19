import { useEffect, useState } from 'react';
import { LogOut, UtensilsCrossed, Clock, Square } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useShift } from '../../contexts/ShiftContext';
import Button from '../ui/Button';
import { APP_POS_NAME } from '../../config/appConfig';

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function POSTopBar({ cartCount, onEndShift }) {
  const { user, logout } = useAuth();
  const { activeShift } = useShift();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeShift) {
      setElapsed(0);
      return;
    }

    const start = new Date(activeShift.openedAt || activeShift.opened_at).getTime();
    const tick = () => {
      setElapsed(Math.max(0, Date.now() - start));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeShift]);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between bg-forest px-4 text-cream lg:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
          <UtensilsCrossed size={22} />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">{APP_POS_NAME}</h1>
          <p className="text-xs text-cream/70">
            {user?.name} {activeShift && <span className="font-mono text-accent">({activeShift.id.slice(0, 8)})</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {activeShift && (
          <div className="flex flex-col gap-2 rounded-2xl bg-forest-light px-3 py-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-forest px-3 py-1.5 text-cream">
              <Clock size={16} className="text-accent" />
              <span className="font-mono text-sm font-medium">{formatDuration(elapsed)}</span>
              <span className="text-xs text-cream/60">Shift</span>
            </div>

            {user?.role === 'cashier' && (
              <Button
                variant="accent"
                size="sm"
                className="min-w-[136px] whitespace-nowrap rounded-2xl font-semibold"
                onClick={onEndShift}
              >
                <Square size={16} className="mr-1.5 fill-current" />
                End Shift
              </Button>
            )}
          </div>
        )}

        <Button
          variant="primary"
          size="sm"
          className="min-w-[110px] whitespace-nowrap bg-white/10 text-white hover:bg-white/20 shadow-sm"
          onClick={logout}
        >
          <LogOut size={18} className="text-white" />
          <span className="text-white">Logout</span>
        </Button>

        {cartCount > 0 && (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-bold animate-pulse">
            {cartCount}
          </span>
        )}
      </div>
    </header>
  );
}
