import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Printer, FileText, ShoppingBag, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/currency';
import { formatDateTime } from '../../utils/timezone';
import { printOrderReceipt } from '../../utils/receiptHtml';


export default function StudentHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await api.get(`/students/${user.id}/orders`);
      setOrders(response.data.data.orders || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user?.id]);

  const toggleExpand = (orderId) => {
    setExpandedOrderId(prev => (prev === orderId ? null : orderId));
  };

  const triggerPrintReceipt = (order) => {
    const cart = {
      items: (order.items || []).map((item) => ({
        id: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        price: item.unitPrice ?? item.price ?? 0,
        unitPrice: item.unitPrice ?? item.price ?? 0,
        modifiers: item.modifiers,
        subtotal: item.subtotal,
      })),
      subtotal: order.subtotal ?? 0,
      discountAmount: order.discountAmount ?? 0,
      taxAmount: order.taxAmount ?? 0,
      total: order.totalAmount ?? 0,
    };

    printOrderReceipt({
      order,
      cart,
      cashierName: 'Student Portal',
      toast,
    });
  };


  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-red-50 text-red-700 border-red-200',
      confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
      preparing: 'bg-amber-50 text-amber-700 border-amber-200',
      ready: 'bg-green-50 text-green-700 border-green-200',
      served: 'bg-gray-100 text-gray-700 border-gray-200',
      cancelled: 'bg-gray-50 text-gray-400 border-gray-200',
    };
    return styles[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const formatDate = (dateString) => {
    return formatDateTime(dateString, { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Page Header */}
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-2xl font-black text-forest">Order History</h2>
        <p className="text-sm text-gray-500">Track and review all of your campus dining orders.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20 text-forest font-bold">
          Loading order history...
        </div>
      ) : orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-gray-400">
          <ShoppingBag size={64} className="stroke-1 mb-3 text-gray-300" />
          <p className="font-bold">No orders found</p>
          <p className="text-sm">When you place orders at the cafeteria, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                className="border border-gray-150 rounded-2xl bg-white shadow-sm overflow-hidden transition-all duration-200 hover:border-forest/20"
              >
                {/* Order Summary Line */}
                <div
                  onClick={() => toggleExpand(order.id)}
                  className="px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-gray-50/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-[#FDF8F0] p-3 rounded-xl border border-forest/5 text-forest hidden sm:block">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-forest">
                        #{order.orderNumber}
                      </h4>
                      <p className="text-xs text-gray-500 font-bold flex items-center gap-1.5 mt-0.5">
                        <Calendar size={12} />
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <span className="text-sm font-black text-orange-600 block">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                        {order.paymentMethod ? order.paymentMethod.replace('_', ' ') : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wide ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                      {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-[#FDF8F0]/30 px-6 py-5 space-y-4">
                    {/* Items List */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-forest/75">
                        Order Items
                      </h5>
                      <div className="space-y-2.5">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start text-sm font-bold text-gray-700">
                            <div>
                              <span>{item.quantity}x {item.name}</span>
                              {item.modifiers && item.modifiers.length > 0 && (
                                <ul className="text-xs font-medium text-gray-400 list-disc pl-5 mt-0.5">
                                  {item.modifiers.map((mod, mIdx) => (
                                    <li key={mIdx}>{mod}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Breakdown and Receipt Action */}
                    <div className="border-t border-gray-150 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      {/* Pricing Breakdown */}
                      <div className="text-xs font-bold text-gray-500 space-y-1">
                        <div className="flex gap-4">
                          <span className="w-24">Subtotal:</span>
                          <span className="text-gray-700">{formatCurrency(order.subtotal)}</span>
                        </div>
                        {order.discountAmount > 0 && (
                          <div className="flex gap-4 text-orange-600">
                            <span className="w-24">Discount:</span>
                            <span>-{formatCurrency(order.discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex gap-4">
                          <span className="w-24">Tax:</span>
                          <span className="text-gray-700">{formatCurrency(order.taxAmount)}</span>
                        </div>
                      </div>

                      {/* Receipt Print button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerPrintReceipt(order);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-forest hover:bg-forest-light text-cream font-bold text-xs rounded-xl shadow transition active:scale-95"
                      >
                        <Printer size={14} />
                        Print / Download Receipt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt printing handled via receiptHtml.js (no hidden DOM receipt needed). */}

    </div>
  );
}



