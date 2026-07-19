import React, { forwardRef, useMemo } from 'react';
import QRCode from 'react-qr-code';
import { UtensilsCrossed } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { APP_NAME } from '../../config/appConfig';
import { formatDateTime } from '../../utils/timezone';

const Receipt = forwardRef(({ order, cart, cashierName }, ref) => {
  if (!order || !cart) return null;

  const items = cart.items || [];
  const subtotal = cart.subtotal ?? cart.subtotalAmount ?? 0;
  const discountAmount = cart.discountAmount ?? cart.discount ?? 0;
  const taxAmount = cart.taxAmount ?? cart.tax ?? 0;
  const totalAmount = cart.total ?? cart.totalAmount ?? 0;
  const paymentMethod = order.paymentMethod || order.payment_method || 'Unknown';

  const date = formatDateTime(order.createdAt || order.created_at || Date.now(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const qrValue = useMemo(() => {
    return `${order.orderNumber || order.id}`;
  }, [order]);

  return (
    <div ref={ref} className="receipt-print print:block w-[80mm] p-4 text-black font-mono text-sm bg-white mx-auto">
        <div className="text-center mb-4">
          <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <UtensilsCrossed size={28} className="text-cream" />
          </div>
          <h1 className="font-bold text-lg leading-tight">🎓 {APP_NAME.toUpperCase()}</h1>
          <p className="text-xs">Building A, Main Campus</p>
        </div>

        <div className="border-b border-black border-dashed pb-2 mb-2">
          <p>Order #: {order.orderNumber || order.id}</p>
          <p>Date: {date}</p>
          <p>Cashier: {cashierName || 'Staff'}</p>
          {order.amountTendered !== undefined && (
            <p>Cash Tendered: {formatCurrency(order.amountTendered)}</p>
          )}
          {order.changeDue !== undefined && (
            <p>Change: {formatCurrency(order.changeDue)}</p>
          )}
        </div>

        <div className="border-b border-black border-dashed pb-2 mb-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between mb-1">
              <div className="flex-1">
                <span>{item.quantity}x {item.name}</span>
                {item.modifiers?.length > 0 && (
                  <div className="text-xs pl-4">
                    {item.modifiers.map((m) => (m.optionName || m)).join(', ')}
                  </div>
                )}
              </div>
              <span>{formatCurrency((item.unitPrice ?? item.price ?? 0) * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="border-b border-black border-dashed pb-2 mb-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
        </div>

        <div className="border-b border-black border-dashed pb-2 mb-2 font-bold text-base">
          <div className="flex justify-between">
            <span>TOTAL:</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm font-normal mt-1">
            <span>Payment:</span>
            <span className="capitalize">{paymentMethod.replace('_', ' ')}</span>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-4 items-center border-b border-black border-dashed pb-2 mb-2">
          <div>
            <p className="text-sm font-bold">Order Status</p>
            <p className="text-xs uppercase tracking-[0.15em]">{order.status || 'Completed'}</p>
          </div>
          <div className="bg-black/5 p-2 rounded-md mx-auto">
            <QRCode value={qrValue} size={76} bgColor="#ffffff" fgColor="#000000" level="L" />
          </div>
        </div>

        <div className="text-center mt-4 text-xs font-bold">
          Thank you! Enjoy your meal!
        </div>
      </div>
  );
});

Receipt.displayName = 'Receipt';

export default Receipt;





