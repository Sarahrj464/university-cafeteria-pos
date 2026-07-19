import { useEffect, useState } from 'react';
import { WifiOff, Wifi, Loader2 } from 'lucide-react';
import { getPendingOrders, deletePendingOrder } from '../../utils/indexedDb';
import { createOrder } from '../../services/orders';
import { processPayment } from '../../services/payments';
import { useToast } from '../../hooks/useToast';

export default function OfflineBanner() {
  const toast = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updatePendingCount = async () => {
      try {
        const orders = await getPendingOrders();
        setPendingCount(orders.length);
      } catch (err) {
        console.error('Failed to get pending orders count', err);
      }
    };

    updatePendingCount();

    const handleOnline = async () => {
      setIsOnline(true);
      toast.success('You are back online! Syncing pending orders...');
      await syncPendingOrders();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("You're offline - orders will sync when reconnected");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll pending count occasionally in case items are added offline
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [toast]);

  const syncPendingOrders = async () => {
    setSyncing(true);
    try {
      const pendingOrders = await getPendingOrders();
      if (pendingOrders.length === 0) {
        setSyncing(false);
        return;
      }

      let successCount = 0;
      for (const order of pendingOrders) {
        try {
          // 1. Create order
          const createdOrder = await createOrder({
            items: order.items,
            subtotal: order.subtotal,
            discountAmount: order.discountAmount,
            taxAmount: order.taxAmount,
            totalAmount: order.totalAmount,
            notes: order.notes,
            studentId: order.studentId,
            status: 'pending',
          });

          // 2. Process payment
          await processPayment({
            orderId: createdOrder.id,
            paymentMethod: order.paymentMethod || 'cash',
            amount: order.totalAmount,
            transactionRef: order.transactionRef || null,
          });

          // 3. Remove from IndexedDB
          await deletePendingOrder(order.offlineId);
          successCount++;
        } catch (err) {
          console.error('Failed to sync order:', order, err);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} order${successCount > 1 ? 's' : ''} synced successfully!`);
      }
      const remaining = await getPendingOrders();
      setPendingCount(remaining.length);
    } catch (err) {
      console.error('Sync process failed:', err);
      toast.error('Failed to sync pending orders');
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`w-full flex items-center justify-between px-4 py-2 text-sm font-semibold transition-all ${
        !isOnline
          ? 'bg-amber-500 text-black border-b border-amber-600'
          : 'bg-emerald-600 text-cream border-b border-emerald-700'
      }`}
      style={{ minHeight: '44px' }}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? <WifiOff size={18} /> : <Wifi size={18} />}
        <span>
          {!isOnline
            ? "You're offline - orders will sync when reconnected"
            : syncing
            ? 'Syncing local orders...'
            : 'Connection restored'}
        </span>
      </div>
      {pendingCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="bg-black/20 rounded px-2 py-0.5 text-xs font-mono">
            {pendingCount} order{pendingCount > 1 ? 's' : ''} pending
          </span>
          {syncing && <Loader2 className="animate-spin" size={14} />}
        </div>
      )}
    </div>
  );
}
