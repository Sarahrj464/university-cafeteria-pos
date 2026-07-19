import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Ban
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/currency';
import { formatDateTime } from '../../utils/timezone';
import { fetchOrders } from '../../services/orders';

const STATUS_LABELS = {
  pending: { label: 'Pending', cls: 'bg-red-50 text-red-700 border-red-200' },
  confirmed: { label: 'Confirmed', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  preparing: { label: 'Preparing', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ready: { label: 'Ready', cls: 'bg-green-50 text-green-700 border-green-200' },
  served: { label: 'Served', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-50 text-gray-400 border-gray-200 line-through' },
};

const REFUND_REASONS = [
  'Wrong item',
  'Customer complaint',
  'Cancelled order',
  'Payment error',
  'Other',
];

export default function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [refundModal, setRefundModal] = useState(null); // { orderId, orderNumber }
  const [refundReason, setRefundReason] = useState('Wrong item');

  const loadOrders = async () => {
    try {
      setLoading(true);
      const fetched = await fetchOrders({ status: 'all', showCancelled: true });
      setOrders(fetched || []);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const handleRefund = async () => {
    if (!refundModal) return;
    try {
      await api.post(`/admin/orders/${refundModal.orderId}/refund`, { reason: refundReason });
      toast.success(`Order #${refundModal.orderNumber} voided & refunded`);
      setRefundModal(null);
      setRefundReason('Wrong item');
      loadOrders();
    } catch (err) {
      toast.error('Refund failed: ' + (err.response?.data?.message || 'Unknown error'));
    }
  };

  const filtered = orders.filter(o => {
    const matchesSearch =
      o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.studentName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      // real POS behavior: "Pending" includes confirmed too
      (statusFilter === 'pending' && (o.status === 'pending' || o.status === 'confirmed')) ||
      o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-forest flex items-center gap-2">
            <ClipboardList size={32} />
            Orders Management
          </h2>
          <p className="text-sm text-gray-500">Search orders, view details, and process refunds or voids.</p>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-forest/10 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by order # or student..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-forest"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'preparing', 'ready', 'served', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition ${
                statusFilter === s
                  ? 'bg-forest text-cream'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400 font-bold whitespace-nowrap">
          {filtered.length} order{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-20 text-forest font-bold">Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ClipboardList size={48} className="mx-auto mb-2 stroke-1" />
            <p className="font-bold">No orders match your filters</p>
          </div>
        ) : (
          filtered.map(order => {
            const expanded = expandedId === order.id;
            const statusCfg = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
            // POS policy: served orders are never refundable/voidable
            const isRefundable = order.status !== 'cancelled' && order.status !== 'served';


            return (
              <div key={order.id} className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
                {/* Row */}
                <div
                  className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer hover:bg-gray-50/50"
                  onClick={() => setExpandedId(prev => prev === order.id ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-[#FDF8F0] p-3 rounded-xl border border-forest/5">
                      <FileText size={18} className="text-forest" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-forest">#{order.orderNumber}</h4>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">
                        {formatDateTime(order.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                        {order.studentName && ` • ${order.studentName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-black text-orange-600">{formatCurrency(order.totalAmount)}</span>
                      <span className="text-[10px] text-gray-400 block font-medium uppercase">{order.paymentMethod?.replace('_', ' ')}</span>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded border font-black uppercase ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                    {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded */}
                {expanded && (
                  <div className="border-t border-gray-100 bg-[#FDF8F0]/30 px-6 py-5 space-y-4">
                    {/* Items */}
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-forest/75 mb-2">Items</h5>
                      <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm font-bold text-gray-700">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="text-gray-500">{formatCurrency(item.subtotal ?? (Number(item.unitPrice) * Number(item.quantity)) ?? 0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pricing breakdown + Refund action */}
                    <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                      <div className="text-xs text-gray-500 font-bold space-y-1">
                        <div className="flex gap-4">
                          <span className="w-24">Subtotal:</span>
                          <span>{formatCurrency(order.subtotal)}</span>
                        </div>
                        {parseFloat(order.discountAmount) > 0 && (
                          <div className="flex gap-4 text-orange-600">
                            <span className="w-24">Discount:</span>
                            <span>-{formatCurrency(order.discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex gap-4">
                          <span className="w-24">Tax:</span>
                          <span>{formatCurrency(order.taxAmount)}</span>
                        </div>
                        <div className="flex gap-4 text-forest font-black text-sm pt-1 border-t border-gray-200">
                          <span className="w-24">Total:</span>
                          <span>{formatCurrency(order.totalAmount)}</span>
                        </div>
                      </div>

                      {isRefundable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRefundModal({ orderId: order.id, orderNumber: order.orderNumber });
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow transition"
                        >
                          <Ban size={14} />
                          Void & Refund
                        </button>
                      )}
                    </div>

                    {order.notes && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs font-bold text-orange-700">
                        Note: {order.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Refund Modal */}
      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-red-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-red-600 text-white flex justify-between items-center">
              <h3 className="text-lg font-black">Void & Refund Order</h3>
              <button onClick={() => setRefundModal(null)} className="bg-white/20 p-1.5 rounded-full hover:bg-white/30">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm font-bold text-gray-700">
                You are about to <span className="text-red-600">void and refund</span> order{' '}
                <span className="font-mono text-forest">#{refundModal.orderNumber}</span>. This action cannot be undone.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Refund Reason *</label>
                <select
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-red-400"
                >
                  {REFUND_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setRefundModal(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm shadow"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}