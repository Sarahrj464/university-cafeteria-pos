import { useState, useEffect, useCallback, useRef } from 'react';
import { LogOut, ChefHat, Volume2, VolumeX, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import { fetchKitchenOrders, updateOrderStatus } from '../services/orders';
import { socket } from '../utils/socket';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
];

const ACTIVE_KITCHEN_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

const normalizeStatus = (s) => (s ?? '').toString().toLowerCase().trim();

const STATUS_CYCLE = {
  pending: 'preparing',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'served',
};

const BORDER_COLORS = {
  pending: 'border-red-500',
  confirmed: 'border-red-500',
  preparing: 'border-amber-500',
  ready: 'border-green-500',
  served: 'border-gray-500',
};

const STATUS_LABELS = {
  pending: 'NEW',
  confirmed: 'NEW',
  preparing: 'PREPARING',
  ready: 'READY ✓',
  served: 'SERVED',
};

const ACTION_LABELS = {
  pending: 'Start Preparing',
  confirmed: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark as Served',
};

const SOUND_STORAGE_KEY = 'kitchen.soundEnabled';
const NEW_ORDER_AUDIO_URL = '/sounds/new-order.wav';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  return `${mins} min ago`;
}

function formatTime(dateStr) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(dateStr));
}

export default function KitchenPage() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [broadcastBanner, setBroadcastBanner] = useState(null);

  // Sound toggle state (persisted per-device)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioPrimedRef = useRef(false);
  const audioRef = useRef(null);

  const knownIds = useRef(new Set());
  const isFetchingRef = useRef(false);
  const requestControllerRef = useRef(null);
  const refreshOrdersRef = useRef(null);
  const playNewOrderSoundRef = useRef(null);
  const bannerTimeoutRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SOUND_STORAGE_KEY);
      if (raw === null) return;
      const restoredValue = raw === 'true';
      console.log('Restored soundEnabled from storage:', restoredValue);
      setSoundEnabled(restoredValue);
    } catch (err) {
      console.error('Failed to read sound preference:', err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
    } catch (err) {
      console.error('Failed to persist sound preference:', err);
    }
  }, [soundEnabled]);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(NEW_ORDER_AUDIO_URL);
      audioRef.current.preload = 'auto';
      console.log('Created reusable Audio instance');
    }

    audioRef.current.src = NEW_ORDER_AUDIO_URL;
    audioRef.current.load();
    return audioRef.current;
  }, []);

  const primeAudio = useCallback(async () => {
    if (audioPrimedRef.current) return;

    try {
      const audio = ensureAudio();
      audio.volume = 0;
      audio.currentTime = 0;
      console.log('Priming audio for autoplay allowance');
      console.log('Audio src before priming play:', audio.src);
      console.log('Attempting to play sound now...');
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      console.log('Audio primed successfully');
      audioPrimedRef.current = true;
    } catch (err) {
      console.warn('Audio priming failed:', err);
      audioPrimedRef.current = false;
    }
  }, [ensureAudio]);

  const handleSoundToggle = useCallback(async () => {
    const nextValue = !soundEnabled;
    console.log('soundEnabled changed:', nextValue);
    setSoundEnabled(nextValue);

    if (nextValue) {
      await primeAudio();
    }
  }, [primeAudio, soundEnabled]);

  const playNewOrderSound = useCallback(async () => {
    if (!soundEnabled) {
      console.log('Sound alerts are disabled; skipping new-order sound');
      return;
    }

    if (!audioPrimedRef.current) {
      console.log('Audio not primed yet; priming before play');
      await primeAudio();
    }

    try {
      const audio = ensureAudio();
      audio.volume = 1;
      audio.currentTime = 0;
      console.log('Audio src before new-order play:', audio.src);
      console.log('Attempting to play sound now...');
      await audio.play();
      console.log('new-order sound playback started');
    } catch (err) {
      console.error('PLAY FAILED:', err?.name, err?.message, { src: ensureAudio().src });
    }
  }, [ensureAudio, primeAudio, soundEnabled]);

  // ─────────────────────────────────────────────────────────────
  // FIX: Always fetch ALL active kitchen orders regardless of the
  // currently selected tab. The tab (`filter`) only controls what
  // is shown on screen via the `filtered` array below. Previously
  // this function sent the current `filter` value to the backend,
  // which meant the `orders` state only ever held data for ONE tab
  // at a time. Switching tabs before the next refetch resolved
  // (or before the next socket event) showed stale/empty results
  // until the next background refresh corrected it a few seconds
  // later. Fetching the full active set every time removes that
  // race condition entirely.
  // ─────────────────────────────────────────────────────────────
  const loadOrders = useCallback(async ({ force = false } = {}) => {
    if (isFetchingRef.current && !force) return;

    const wasInitialLoad = !initialLoadDone;

    isFetchingRef.current = true;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    // Only treat the initial page load as a “loading screen”. For subsequent refreshes,
    // keep showing the previously loaded orders while the request is in-flight.
    if (wasInitialLoad) {
      setLoading(true);
    }

    try {
      const data = await fetchKitchenOrders('all', { signal: controller.signal });
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
        console.error('Failed to load kitchen orders:', err);
        toast.error('Failed to refresh kitchen orders');
      }
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
      isFetchingRef.current = false;
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [initialLoadDone]);

  const refreshOrders = useCallback(() => {
    loadOrders({ force: false });
  }, [loadOrders]);

  useEffect(() => {
    refreshOrdersRef.current = refreshOrders;
  }, [refreshOrders]);

  useEffect(() => {
    playNewOrderSoundRef.current = playNewOrderSound;
  }, [playNewOrderSound]);

  const showBroadcastBanner = useCallback((message) => {
    setBroadcastBanner(message);
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
    }
    bannerTimeoutRef.current = setTimeout(() => setBroadcastBanner(null), 8000);
  }, []);

  useEffect(() => {
    void loadOrders({ force: true });
    socket.connect();

    const handleConnect = () => {
      console.log('Kitchen socket connected:', socket.id);
    };

    const handleDisconnect = () => {
      console.log('Kitchen socket disconnected');
    };

    const handleConnectError = (err) => {
      console.error('Kitchen socket connect error:', err?.message || err);
    };

    const onNewOrder = (payload) => {
      console.log('Socket event received:', payload?.type || 'new_order', payload);
      const orderId = payload?.orderId;
      const isNew = orderId != null && !knownIds.current.has(orderId);
      if (isNew) {
        knownIds.current.add(orderId);
        console.log('Handling new order event for orderId:', orderId);
        void playNewOrderSoundRef.current?.();
      }
      refreshOrdersRef.current?.();
    };

    const handleStatusRefresh = () => {
      refreshOrdersRef.current?.();
    };

    const handleKitchenBroadcast = (payload = {}) => {
      const message = payload?.message?.trim() || 'Kitchen update';
      const sentAt = payload?.sentAt || new Date().toISOString();
      console.log('[KitchenPage] kitchen:broadcast received:', { message, sentAt });
      showBroadcastBanner(message);
      toast.success(message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('new_order', onNewOrder);
    socket.on('order:new', onNewOrder);
    socket.on('order_status_changed', handleStatusRefresh);
    socket.on('order:status', handleStatusRefresh);
    socket.on('kitchen:broadcast', handleKitchenBroadcast);
    socket.on('kds:broadcast', handleKitchenBroadcast);

    const interval = setInterval(() => {
      setRefreshTick((value) => value + 1);
      refreshOrdersRef.current?.();
    }, 45000);

    return () => {
      clearInterval(interval);
      requestControllerRef.current?.abort();
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('new_order', onNewOrder);
      socket.off('order:new', onNewOrder);
      socket.off('order_status_changed', handleStatusRefresh);
      socket.off('order:status', handleStatusRefresh);
      socket.off('kitchen:broadcast', handleKitchenBroadcast);
      socket.off('kds:broadcast', handleKitchenBroadcast);
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, [showBroadcastBanner]);

  const handleStatusClick = async (order) => {
    const current = normalizeStatus(order.status);
    const next = STATUS_CYCLE[current];
    if (!next || updatingOrderId) return;

    const previousStatus = order.status;
    setUpdatingOrderId(order.id);
    setOrders((prev) => prev.map((item) => (item.id === order.id ? { ...item, status: next } : item)));

    try {
      const updatedOrder = await updateOrderStatus(order.id, next);
      setOrders((prev) => prev.map((item) => (item.id === order.id ? { ...item, ...updatedOrder, status: updatedOrder.status ?? next } : item)));
      toast.success(`Order #${updatedOrder.orderNumber || order.orderNumber} updated`);
      socket.emit('update_order_status', { orderId: order.id, status: next });
    } catch (err) {
      setOrders((prev) => prev.map((item) => (item.id === order.id ? { ...item, status: previousStatus } : item)));
      console.error('Status update failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const filtered = orders.filter((o) => {
    const status = normalizeStatus(o.status);

    if (filter === 'all') return ACTIVE_KITCHEN_STATUSES.includes(status);
    if (filter === 'pending') return ['pending', 'confirmed'].includes(status);
    if (filter === 'preparing') return status === 'preparing';
    if (filter === 'ready') return status === 'ready';
    return false;
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#1A1A1A] text-white">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <ChefHat size={32} className="text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-wide">KITCHEN DISPLAY</h1>
            <p className="text-sm text-white/50">{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSoundToggle}
            className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {soundEnabled ? 'Sound alerts on' : 'Sound alerts off'}
          </button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={logout}>
            <LogOut size={18} />
          </Button>
        </div>
      </header>

      {broadcastBanner && (
        <div className="flex shrink-0 items-center justify-between border-b border-orange-500/40 bg-orange-600/20 px-6 py-3 text-sm font-semibold text-orange-100">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em]">
              KDS Broadcast
            </span>
            <span>{broadcastBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setBroadcastBanner(null)}
            className="rounded-full px-2 py-1 text-orange-100 transition hover:bg-white/10"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex shrink-0 gap-2 border-b border-white/10 px-6 py-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`min-h-[48px] rounded-xl px-5 py-2 text-sm font-bold transition-colors ${
              filter === f.id
                ? 'bg-orange-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-x-auto overflow-y-auto p-6">
        {loading ? (
          <div className="flex h-full items-center justify-center text-white/40">Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/40 text-xl">
            No orders in queue
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filtered.map((order) => (
              <div
                key={order.id}
                className={`flex flex-col rounded-2xl border-4 bg-[#252525] p-4 shadow-lg ${BORDER_COLORS[normalizeStatus(order.status)] || 'border-gray-600'}`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-mono text-2xl font-bold text-orange-400">
                      #{order.orderNumber}
                    </p>
                    <p className="text-sm text-white/50">
                      {formatTime(order.createdAt)} · {timeAgo(order.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-lg bg-white/10 px-2 py-1 text-xs font-bold uppercase">
                    {STATUS_LABELS[normalizeStatus(order.status)]}
                  </span>
                </div>

                <ul className="mb-3 flex-1 space-y-1 border-t border-white/10 pt-3">
                  {order.items?.map((item, idx) => (
                    <li key={idx} className="text-base font-medium">
                      {item.quantity}x {item.name}
                    </li>
                  ))}
                </ul>

                {order.notes && (
                  <div className="mb-3 rounded-lg bg-red-900/30 border border-red-500/30 p-2 text-sm">
                    <span className="font-bold text-red-400">NOTE: </span>
                    {order.notes}
                  </div>
                )}

                {normalizeStatus(order.status) !== 'served' &&
                  STATUS_CYCLE[normalizeStatus(order.status)] && (
                    <button
                      type="button"
                      onClick={() => handleStatusClick(order)}
                      disabled={updatingOrderId === order.id}
                      className="min-h-[52px] w-full rounded-xl bg-orange-600 text-base font-bold uppercase tracking-wide transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {updatingOrderId === order.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={18} className="animate-spin" />
                          Updating...
                        </span>
                      ) : (
                        ACTION_LABELS[normalizeStatus(order.status)] ||
                          `→ ${STATUS_LABELS[STATUS_CYCLE[normalizeStatus(order.status)]] || 'Update'}`
                      )}
                    </button>
                  )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}