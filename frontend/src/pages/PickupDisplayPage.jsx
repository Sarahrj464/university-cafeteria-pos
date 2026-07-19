import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, CheckCircle } from 'lucide-react';
import { fetchDisplayOrders } from '../services/orders';
import { socket } from '../utils/socket';

export default function PickupDisplayPage() {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    try {
      const data = await fetchDisplayOrders();
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to fetch orders on display:', err);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchOrders, 10000);

    // Socket.io integration
    socket.connect();

    socket.on('new_order', () => {
      fetchOrders();
    });

    socket.on('order_status_changed', () => {
      fetchOrders();
    });

    socket.on('order_cancelled', () => {
      fetchOrders();
    });

    return () => {
      clearInterval(interval);
      socket.off('new_order');
      socket.off('order_status_changed');
      socket.off('order_cancelled');
      socket.disconnect();
    };
  }, []);

  // Filter orders by column
  const preparingOrders = orders.filter(
    o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing'
  );
  const readyOrders = orders.filter(o => o.status === 'ready');
  // Show only last 8 served orders so it doesn't clutter the screen
  const servedOrders = orders
    .filter(o => o.status === 'served')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-[#0C0F0A] text-white flex flex-col font-sans p-6 overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center border-b-2 border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <ChefHat size={40} className="text-orange-500" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-wider text-orange-500 uppercase">
              Order Collection Status
            </h1>
            <p className="text-sm text-white/50">Please collect your order when it moves to READY</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-[#1E2519] border border-green-900 px-4 py-2 rounded-lg text-green-400 font-bold text-sm tracking-wider animate-pulse">
            LIVE UPDATES
          </div>
        </div>
      </header>

      {/* Columns Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Column 1: Preparing */}
        <div className="flex flex-col bg-[#111] rounded-2xl border border-white/5 overflow-hidden">
          <div className="bg-amber-600/10 border-b border-amber-500/20 px-6 py-4 flex items-center justify-between">
            <span className="text-xl font-bold tracking-widest text-amber-500 uppercase flex items-center gap-2">
              <Clock size={20} className="animate-spin text-amber-500" />
              Preparing
            </span>
            <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-black">
              {preparingOrders.length}
            </span>
          </div>
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {preparingOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/20 text-lg">
                No orders preparing
              </div>
            ) : (
              preparingOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-[#1C1C1C] border border-white/5 rounded-xl p-5 flex items-center justify-between shadow-md"
                >
                  <span className="text-3xl font-extrabold tracking-wider text-white/95">
                    #{order.orderNumber}
                  </span>
                  <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 uppercase">
                    {order.status === 'preparing' ? 'Preparing' : 'New'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Ready */}
        <div className="flex flex-col bg-[#111] rounded-2xl border border-white/5 overflow-hidden">
          <div className="bg-green-600/10 border-b border-green-500/20 px-6 py-4 flex items-center justify-between">
            <span className="text-xl font-bold tracking-widest text-green-500 uppercase flex items-center gap-2">
              <CheckCircle size={20} className="text-green-500 animate-bounce" />
              Ready
            </span>
            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-black">
              {readyOrders.length}
            </span>
          </div>
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {readyOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/20 text-lg">
                No orders ready for collection
              </div>
            ) : (
              readyOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-green-600/20 border-2 border-green-500 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg animate-pulse"
                >
                  <span className="text-5xl font-black tracking-widest text-green-400">
                    #{order.orderNumber}
                  </span>
                  <span className="text-xs text-green-400 font-extrabold uppercase mt-2 tracking-wider bg-green-500/10 px-3 py-1 rounded border border-green-500/30">
                    Ready to Collect!
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Served */}
        <div className="flex flex-col bg-[#111] rounded-2xl border border-white/5 overflow-hidden">
          <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between">
            <span className="text-xl font-bold tracking-widest text-white/60 uppercase">
              Recently Served
            </span>
            <span className="bg-white/5 text-white/50 px-3 py-1 rounded-full text-xs font-black">
              {servedOrders.length}
            </span>
          </div>
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {servedOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/20 text-lg">
                No orders served yet
              </div>
            ) : (
              servedOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-[#181818] border border-white/5 rounded-xl p-5 flex items-center justify-between opacity-50"
                >
                  <span className="text-2xl font-bold tracking-wider text-white/60 line-through">
                    #{order.orderNumber}
                  </span>
                  <span className="text-xs text-white/40 font-bold bg-white/5 px-2.5 py-1 rounded uppercase">
                    Served
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
