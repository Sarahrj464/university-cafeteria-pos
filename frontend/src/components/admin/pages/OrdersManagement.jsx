import React, { useState } from 'react';
import { formatDateTime } from '../../../utils/timezone';
import { Search, Download, Eye, Ban } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '../../../utils/currency';
import { fetchKitchenOrders } from '../../../services/orders';
import { refundOrder } from '../../../services/admin';
import toast from 'react-hot-toast';






const STATUSES = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];

export default function OrdersManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);

  const { data: orders = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => {
      // Fetch all kitchen/admin orders
      return fetchKitchenOrders('');
    },
    // Optional: keep previous data while refetching to avoid UI flicker/crashes
    // staleTime: 30_000,
  });

  // Debug: verify exact server field names (camelCase vs snake_case)
  // Log only once per page load to avoid console spam.
  React.useEffect(() => {
    if (Array.isArray(orders)) {
      // eslint-disable-next-line no-console
      console.log('[OrdersManagement] raw fetched orders sample:', orders[0]);
    }
  }, [orders]);

  const hasOrders = Array.isArray(orders) && orders.length > 0;

  const refundMutation = useMutation({
    mutationFn: ({ id, reason }) => refundOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-orders']);
      toast.success('Order voided and refunded');
      setShowRefundModal(false);
      setRefundReason('');
      setSelectedOrder(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to refund order');
    }
  });

  const filteredOrders = orders.filter((order) => {
    const orderNumber = order?.orderNumber ?? order?.order_number ?? '';
    const studentId = order?.studentId ?? order?.student_id ?? '';

    const matchesSearch =
      (typeof orderNumber === 'string' && orderNumber.includes(search)) ||
      (studentId != null && studentId.toString().includes(search));

    const matchesStatus = statusFilter === '' || order?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': 
      case 'served': return 'bg-green-100 text-green-700';
      case 'preparing': 
      case 'ready': return 'bg-amber-100 text-amber-700';
      case 'pending': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-forest/10 text-forest';
    }
  };

  const handleRefundClick = (order) => {
    setSelectedOrder(order);
    setShowRefundModal(true);
  };

  const submitRefund = () => {
    if (!refundReason) {
      toast.error('Please select a reason for the refund');
      return;
    }
    refundMutation.mutate({ id: selectedOrder.id, reason: refundReason });
  };

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow p-6 border border-red-100">
          <h1 className="text-2xl font-bold text-forest">Orders Management</h1>
          <p className="mt-2 text-red-700 font-bold">Something went wrong while loading orders.</p>
          <p className="mt-1 text-red-600 text-sm">
            {error?.message ?? error?.response?.data?.message ?? 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-forest">Orders Management</h1>
        <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold">
          <Download size={20} />
          Export
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
          <p className="text-blue-600 font-bold text-2xl">{orders.filter((o) => (o?.status ?? o?.status) === 'pending').length}</p>
          <p className="text-forest/60 text-sm">Pending Orders</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-amber-500">
          <p className="text-amber-600 font-bold text-2xl">{orders.filter((o) => (o?.status ?? o?.status) === 'preparing' || (o?.status ?? o?.status) === 'ready').length}</p>
          <p className="text-forest/60 text-sm">In Progress</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
          <p className="text-green-600 font-bold text-2xl">{orders.filter((o) => (o?.status ?? o?.status) === 'completed' || (o?.status ?? o?.status) === 'served').length}</p>
          <p className="text-forest/60 text-sm">Completed Orders</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-orange">
          <p className="text-orange font-bold text-2xl">{formatCurrency(orders
            .filter((o) => (o?.status ?? o?.status) !== 'cancelled')
            .reduce((acc, o) => acc + parseFloat(o?.totalAmount ?? o?.total_amount ?? 0), 0))}</p>
          <p className="text-forest/60 text-sm">Total Valid Revenue</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-forest/40" size={20} />
          <input
            type="text"
            placeholder="Search by Order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange capitalize"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-forest/10 bg-cream">
              <th className="py-3 px-4 text-left text-forest font-bold">Order #</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Items Count</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Total (PKR)</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Payment</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Status</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Time</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" className="py-4 text-center">Loading orders...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan="7" className="py-8 text-center text-forest/60 font-bold">No orders found</td></tr>
            ) : (
              filteredOrders.map((order) => {
                const orderNumber = order?.orderNumber ?? order?.order_number ?? '-';
                const items = order?.items ?? [];
                const itemsCount = Array.isArray(items)
                  ? items.reduce((acc, i) => acc + (Number(i?.quantity) || 0), 0)
                  : 0;
                const totalAmount = order?.totalAmount ?? order?.total_amount ?? 0;
                const paymentMethod = order?.paymentMethod ?? order?.payment_method ?? '';
                const createdAt = order?.createdAt ?? order?.created_at;

                return (
                  <tr key={order.id} className="border-b border-forest/5 hover:bg-cream">
                    <td className="py-3 px-4 font-bold text-forest">{orderNumber}</td>
                    <td className="py-3 px-4 text-forest/70">{itemsCount} items</td>
                    <td className="py-3 px-4 text-orange font-bold">{formatCurrency(totalAmount)}</td>
                    <td className="py-3 px-4 text-forest/70 capitalize">{paymentMethod ? paymentMethod.replace('_', ' ') : '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${getStatusColor(order?.status)}`}>
                        {order?.status ?? '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-forest/60 text-sm">
                      {createdAt
                        ? formatDateTime(createdAt, { dateStyle: 'medium', timeStyle: 'short' })
                        : '-'}
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 hover:bg-forest/10 rounded-lg transition"
                        title="View Details"
                      >
                        <Eye size={18} className="text-forest" />
                      </button>
                      {order?.status !== 'cancelled' && (
                        <button
                          onClick={() => handleRefundClick(order)}
                          className="p-2 hover:bg-red-100 rounded-lg transition"
                          title="Void / Refund"
                        >
                          <Ban size={18} className="text-red-600" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && !showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-forest text-white p-6 border-b flex justify-between">
              <h2 className="text-xl font-bold">Order Details: {selectedOrder?.orderNumber ?? selectedOrder?.order_number ?? '-'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-forest/60 text-sm mb-2">Items</p>
                <ul className="space-y-1">
                  {(selectedOrder?.items ?? []).map((item, idx) => (
                    <li key={idx} className="text-forest">• {item?.item_name ?? item?.name ?? '-'} (x{item?.quantity ?? 0}) - {formatCurrency(item?.subtotal ?? (item?.unitPrice && item?.quantity ? Number(item.unitPrice) * Number(item.quantity) : 0))}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-forest/60 text-sm">Total Amount</p>
                <p className="text-orange font-bold text-lg">{formatCurrency(selectedOrder?.totalAmount ?? selectedOrder?.total_amount ?? 0)}</p>
              </div>
              <div>
                <p className="text-forest/60 text-sm">Payment Method</p>
                <p className="text-forest font-bold capitalize">{(selectedOrder?.paymentMethod ?? selectedOrder?.payment_method) ? (selectedOrder?.paymentMethod ?? selectedOrder?.payment_method).replace('_', ' ') : '-'}</p>
              </div>
              <div>
                <p className="text-forest/60 text-sm">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold capitalize mt-1 ${getStatusColor(selectedOrder.status)}`}>
                  {selectedOrder?.status ?? '-'}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full bg-orange text-white font-bold py-2 rounded-lg hover:bg-orange/90 mt-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-red-600 text-white p-6 border-b">
              <h2 className="text-xl font-bold">Refund / Void Order {selectedOrder?.orderNumber ?? selectedOrder?.order_number ?? '-'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-forest font-bold">Are you sure you want to void this order? This will refund the payment and cancel the order.</p>
              
              <div>
                <label className="block text-sm font-bold text-forest mb-2">Reason for Refund</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-red-500"
                >
                  <option value="">Select a reason...</option>
                  <option value="wrong_item">Wrong Item</option>
                  <option value="customer_complaint">Customer Complaint</option>
                  <option value="cancelled_by_customer">Cancelled by Customer</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={submitRefund}
                  disabled={refundMutation.isLoading}
                  className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm Void
                </button>
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setSelectedOrder(null);
                  }}
                  className="flex-1 bg-forest/10 text-forest font-bold py-2 rounded-lg hover:bg-forest/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
