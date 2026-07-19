import { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useShift } from '../../contexts/ShiftContext';
import { useCart } from '../../hooks/useCart';
import { getShiftSummary } from '../../services/shifts';
import { useToast } from '../../hooks/useToast';
import Button from '../ui/Button';
import { Play, LogOut, FileText, Check, Loader2, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/currency';
import { APP_POS_NAME } from '../../config/appConfig';
import { formatDateTime } from '../../utils/timezone';

export function StartShiftOverlay() {
  const { openShift } = useShift();
  const { logout, user } = useAuth();
  const toast = useToast();
  const [openingCash, setOpeningCash] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(openingCash);
    if (isNaN(val) || val < 0) {
      toast.error('Please enter a valid opening cash amount');
      return;
    }
    setSubmitting(true);
    try {
      await openShift(val);
      toast.success('Shift started successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start shift');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl bg-cream p-6 shadow-2xl border border-forest/10">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest text-cream mb-3">
            <Play size={24} className="ml-1" />
          </div>
          <h2 className="text-2xl font-bold text-forest">Start New Shift</h2>
          <p className="text-sm text-forest/70 mt-1">
            Welcome back, <span className="font-semibold">{user?.name}</span>. Please enter the starting cash in your drawer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-forest mb-2">Opening Cash Amount (PKR)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="0.00"
              className="w-full min-h-[56px] text-2xl font-mono text-center rounded-xl border-2 border-forest/20 focus:border-accent focus:outline-none"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 py-3 text-forest border-forest/30 hover:bg-forest/5"
              onClick={logout}
            >
              <LogOut size={18} className="mr-2" />
              Logout
            </Button>
            <Button
              type="submit"
              variant="accent"
              className="flex-1 py-3"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Start Shift'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EndShiftModal({ isOpen, onClose }) {
  const { activeShift, closeShift } = useShift();
  const { logout } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const toastRef = useRef(toast);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [closing, setClosing] = useState(false);

  const zReportRef = useRef();
  const handlePrint = useReactToPrint({ content: () => zReportRef.current });

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    let mounted = true;
    if (isOpen && activeShift) {
      setLoading(true);
      setError('');
      setSummary(null);
      setSubmitError('');

      const fetchSummary = async () => {
        try {
          // Add a 10s timeout to avoid indefinite spinner
          const data = await Promise.race([
            getShiftSummary(activeShift.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 10000)),
          ]);
          if (!mounted) return;
          setSummary(data);
          setActualCash('');
        } catch (err) {
          console.error('Failed to load shift summary:', err?.message, err?.stack || err);
          if (!mounted) return;
          const msg = err.response?.data?.message || err.message || 'Failed to load shift summary';
          setError(msg);
          toastRef.current.error(msg);
          // keep modal open so user can retry or cancel
        } finally {
          if (mounted) setLoading(false);
        }
      };

      fetchSummary();
    } else if (isOpen && !activeShift) {
      setLoading(false);
      setError('Unable to load shift details. Please refresh or re-open the shift.');
      setSummary(null);
    }

    return () => {
      mounted = false;
    };
  }, [isOpen, activeShift, onClose]);

  const actualCashVal = parseFloat(actualCash) || 0;
  const safeExpectedCash = Number(summary?.expectedCash ?? 0) || 0;
  const varianceVal = actualCash.trim() !== '' ? actualCashVal - safeExpectedCash : 0;

  const varianceLabel =
    actualCash.trim() === ''
      ? 'Enter counted cash to compare expected drawer amount'
      : varianceVal < 0
      ? `Shortage: ${formatCurrency(Math.abs(varianceVal))}`
      : varianceVal > 0
      ? `Overage: ${formatCurrency(Math.abs(varianceVal))}`
      : 'Balanced ✓';

  const varianceClass =
    actualCash.trim() === ''
      ? 'text-forest/70'
      : varianceVal < 0
      ? 'text-error'
      : varianceVal > 0
      ? 'text-orange-600'
      : 'text-success';

  const handleModalClose = () => {
    if (closing) return;
    // Avoid resetting modal state here; the parent unmount/isOpen toggle can race and cause flashing.
    onClose();
  };

  const handleRetry = async () => {
    if (!activeShift) {
      const msg = 'No active shift is available to load. Please refresh the page.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError('');
    setSubmitError('');

    try {
      const data = await getShiftSummary(activeShift.id);
      setSummary(data);
      setActualCash('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load shift summary';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) {
      const msg = 'No active shift is available to close. Refresh the page and try again.';
      setSubmitError(msg);
      toast.error(msg);
      return;
    }

    if (actualCash.trim() === '') {
      const msg = 'Please input the actual cash counted';
      setSubmitError(msg);
      toast.error(msg);
      return;
    }

    const closingCash = Number(actualCash);
    if (Number.isNaN(closingCash) || closingCash < 0) {
      const msg = 'Please enter a valid cash amount';
      setSubmitError(msg);
      toast.error(msg);
      return;
    }

    setClosing(true);
    setSubmitError('');

    try {
      await closeShift(activeShift.id, closingCash);
      cart.clearCart();

      // Close modal first to avoid any further rendering/state usage during logout/unmount.
      onClose();

      toast.success('Shift closed successfully!');
      await logout().catch((err) => {
        console.error('Logout after shift close failed:', err?.message, err?.stack || err);
      });
      window.location.href = '/login';
    } catch (err) {
      console.error('Failed to close shift:', err?.message, err?.stack || err);
      const msg = err.response?.data?.message || err.message || 'Failed to close shift';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setClosing(false);
    }
  };

  const formatMin = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Live-updating duration for the currently loaded shift summary.
  // Uses ms diff from the SAME start timestamp the top-bar uses.
  // Fallbacks to activeShift.openedAt if summary payload doesn't include it.
  const [durationMinutes, setDurationMinutes] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const startRaw =
      summary?.openedAt ??
      summary?.opened_at ??
      activeShift?.openedAt ??
      activeShift?.opened_at ??
      null;

    const startMs = startRaw ? new Date(startRaw).getTime() : NaN;

    const tick = () => {
      if (!Number.isFinite(startMs)) {
        setDurationMinutes(0);
        return;
      }
      const ms = Math.max(0, Date.now() - startMs);
      setDurationMinutes(Math.floor(ms / 60000));
    };

    // Ensure immediate calculation on modal open (prevents showing 0m due to deferred tick)
    tick();

    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [isOpen, summary?.openedAt, summary?.opened_at, activeShift?.openedAt, activeShift?.opened_at]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-cream shadow-2xl overflow-hidden border border-forest/10 text-forest">
        <div className="flex items-center justify-between border-b border-forest/10 bg-forest p-4 text-cream">
          <h2 className="text-xl font-bold">Shift Summary</h2>
          <button onClick={handleModalClose} className="rounded-full p-1 hover:bg-forest-light transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-accent" size={48} />
            <p className="mt-4 text-sm font-medium">Loading shift details...</p>
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 px-6">
            <div className="rounded-lg bg-red-100 p-4 text-sm text-red-800 mb-4">{error}</div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRetry} disabled={loading || closing}>
                Retry
              </Button>
              <Button variant="outline" onClick={handleModalClose} disabled={loading || closing}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          summary ? (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="rounded-xl bg-forest/5 p-4 border border-forest/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-forest/70">Cashier</span>
                    <span className="font-bold">{summary?.cashierName ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-forest/70">Started</span>
                    <span className="font-medium">
                      {summary?.openedAt
                        ? formatDateTime(summary.openedAt, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: 'Asia/Karachi',
                          })
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-forest/70">Duration</span>
                    <span className="font-medium">{formatMin(durationMinutes)}</span>
                  </div>

                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-forest/70 uppercase tracking-wider">Transaction Breakdown</h3>
                  <div className="space-y-2 bg-white rounded-xl border border-forest/10 p-4 shadow-sm">
                    <div className="flex justify-between">
                      <span>Orders Processed</span>
                      <span className="font-bold">{summary.ordersProcessed}</span>
                    </div>
                    <div className="flex justify-between border-t border-forest/5 pt-2">
                      <span>Subtotal</span>
                      <span className="font-bold">{formatCurrency(summary.subtotalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-forest/70 pl-3">
                      <span>- Discounts</span>
                      <span>-{formatCurrency(summary.discountAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-forest/70 pl-3">
                      <span>- Tax</span>
                      <span>{formatCurrency(summary.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-forest/5 pt-2 font-semibold">
                      <span>Total Sales</span>
                      <span>{formatCurrency(summary.totalSales)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-forest/70 pl-3">
                      <span>- Cash Sales</span>
                      <span>{formatCurrency(summary.cashSales)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-forest/70 pl-3">
                      <span>- Card Sales</span>
                      <span>{formatCurrency(summary.cardSales)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-forest/70 pl-3">
                      <span>- Meal Plan Sales</span>
                      <span>{formatCurrency(summary.mealPlanSales)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-forest/70 pl-3">
                      <span>- Wallet Sales</span>
                      <span>{formatCurrency(summary.walletSales)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-forest/70 pl-3">
                      <span>- QR/UPI Sales</span>
                      <span>{formatCurrency(summary.qrUpiSales)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-forest/70 pl-3">
                      <span>- Split Pay Sales</span>
                      <span>{formatCurrency(summary.splitSales)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="bg-forest-light/5 border border-forest/10 p-4 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">Expected Cash in Drawer</span>
                      <span className="font-bold text-lg">{formatCurrency(summary?.expectedCash ?? 0)}</span>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1.5">Actual Cash Counted</label>
                      <input
                        type="number"
                        placeholder="Enter counted cash..."
                        value={actualCash}
                        onChange={(e) => setActualCash(e.target.value)}
                        className="w-full min-h-[48px] rounded-lg border-2 border-forest/15 px-3 focus:border-accent focus:outline-none text-lg font-mono"
                      />
                    </div>
                    <div className="flex justify-between items-center border-t border-forest/10 pt-3">
                      <span className="font-bold">Variance</span>
                      <span
                        className={`text-xl font-bold font-mono ${varianceClass}`}
                      >
                        {varianceLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

<div className="flex gap-3 border-t border-forest/10 bg-forest/5 p-4">
                  <Button
                    variant="outline"
                    className="flex-1 py-3 text-forest border-forest/30 hover:bg-forest/10 flex justify-center items-center gap-2"
                    onClick={onClose}
                    disabled={closing}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="accent"
                    className="flex-1 py-3 flex justify-center items-center gap-2"
                    disabled={closing || actualCash.trim() === ''}
                    onClick={handleCloseShift}
                  >
                    {closing ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                    Close Shift & Logout
                </Button>
              </div>
              {submitError && (
                <div className="rounded-xl bg-red-100 border border-red-200 p-3 text-sm text-red-800 mt-3">
                  {submitError}
                </div>
              )}

              {/* Printable Z-Report (hidden from screen) */}
              <div className="hidden">
                <div ref={zReportRef} className="p-8 text-black bg-white font-mono text-sm max-w-sm">
                  <div className="text-center border-b border-black pb-4 mb-4">
                    <h1 className="text-lg font-bold">{APP_POS_NAME}</h1>
                    <p className="text-xs">{APP_POS_NAME}</p>
                    <p className="text-xs">Z-REPORT SUMMARY</p>
                  </div>

                  <div className="space-y-1 mb-4">
                    <p>
                      <strong>Cashier:</strong> {summary?.cashierName ?? '-'}
                    </p>
                    <p>
                      <strong>Shift ID:</strong>{' '}
                      {summary?.id ? `${String(summary.id).slice(0, 8)}...` : '-'}
                    </p>
                    <p>
                      <strong>Opened:</strong>{' '}
                      {summary?.openedAt
                        ? formatDateTime(summary.openedAt, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '-'}
                    </p>
                    <p>
                      <strong>Closed:</strong>{' '}
                      {formatDateTime(new Date(), {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                    <p>
                      <strong>Duration:</strong> {formatMin(durationMinutes)}
                    </p>
                  </div>

                  <div className="border-t border-b border-black py-2 my-2 space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>ORDERS PROCESSED:</span>
                      <span>{summary?.ordersProcessed ?? 0}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base">
                      <span>TOTAL SALES:</span>
                      <span>{formatCurrency(summary?.totalSales ?? 0)}</span>
                    </div>

                    <div className="flex justify-between text-xs pl-2">
                      <span>- Cash Sales:</span>
                      <span>{formatCurrency(summary?.cashSales ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs pl-2">
                      <span>- Card Sales:</span>
                      <span>{formatCurrency(summary?.cardSales ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs pl-2">
                      <span>- Meal Plan Sales:</span>
                      <span>{formatCurrency(summary?.mealPlanSales ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs pl-2">
                      <span>- Wallet Sales:</span>
                      <span>{formatCurrency(summary?.walletSales ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs pl-2">
                      <span>- QR/UPI Sales:</span>
                      <span>{formatCurrency(summary?.qrUpiSales ?? 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between">
                      <span>Opening Cash:</span>
                      <span>{formatCurrency(summary?.openingCash ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expected Cash in Drawer:</span>
                      <span>{formatCurrency(summary?.expectedCash ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Actual Cash Counted:</span>
                      <span>{formatCurrency(actualCashVal)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-black pt-1">
                      <span>VARIANCE:</span>
                      <span>{formatCurrency(varianceVal)}</span>
                    </div>
                  </div>

                  <div className="text-center mt-8 pt-4 border-t border-black text-xs">
                    <p>End of Z-Report</p>
                    <p>Thank you!</p>
                  </div>
                </div>
              </div>
            </>
          ) : null
        )}
      </div>
    </div>
  );
}
