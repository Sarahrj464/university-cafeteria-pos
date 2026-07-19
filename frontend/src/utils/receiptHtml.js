import { formatCurrency } from './currency';
import { APP_NAME } from '../config/appConfig';
import { formatDateTime } from './timezone';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPaymentMethod(method) {
  return String(method || 'Unknown').replace(/_/g, ' ');
}

function formatReceiptDate(order) {
  return formatDateTime(order.createdAt || order.created_at || Date.now(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function buildReceiptHtml(order, cart, cashierName) {
  if (!order || !cart) return '';

  const items = cart.items || [];
  const subtotal = cart.subtotal ?? 0;
  const discountAmount = cart.discountAmount ?? 0;
  const taxAmount = cart.taxAmount ?? 0;
  const totalAmount = cart.total ?? order.totalAmount ?? order.total_amount ?? 0;
  const paymentMethod = order.paymentMethod || order.payment_method || 'Unknown';
  const orderNumber = order.orderNumber || order.order_number || order.id;
  const date = formatReceiptDate(order);

  const itemRows = items
    .map((item) => {
      const lineTotal = (item.unitPrice ?? item.price ?? 0) * item.quantity;
      const modifiers = item.modifiers?.length
        ? `<div style="font-size:10px;padding-left:12px;color:#555;">${item.modifiers
            .map((m) => escapeHtml(m.optionName || m))
            .join(', ')}</div>`
        : '';

      return `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <div style="flex:1;padding-right:8px;">
            <div>${item.quantity}x ${escapeHtml(item.name)}</div>
            ${modifiers}
          </div>
          <div>${escapeHtml(formatCurrency(lineTotal))}</div>
        </div>
      `;
    })
    .join('');

  const discountRow =
    discountAmount > 0
      ? `<div style="display:flex;justify-content:space-between;"><span>Discount:</span><span>-${escapeHtml(formatCurrency(discountAmount))}</span></div>`
      : '';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt ${escapeHtml(orderNumber)}</title>
    <style>
      body { font-family: 'Courier New', monospace; font-size: 12px; color: #111; margin: 0; padding: 16px; width: 80mm; }
      .center { text-align: center; }
      .divider { border-top: 1px dashed #111; margin: 10px 0; padding-top: 8px; }
      .total { font-size: 14px; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="center">
      <div style="font-size:16px;font-weight:bold;">${escapeHtml(APP_NAME.toUpperCase())}</div>
      <div style="font-size:11px;">Building A, Main Campus</div>
    </div>
    <div class="divider">
      <div>Order #: ${escapeHtml(orderNumber)}</div>
      <div>Date: ${escapeHtml(date)}</div>
      <div>Cashier: ${escapeHtml(cashierName || 'Staff')}</div>
    </div>
    <div class="divider">${itemRows}</div>
    <div class="divider">
      <div style="display:flex;justify-content:space-between;"><span>Subtotal:</span><span>${escapeHtml(formatCurrency(subtotal))}</span></div>
      ${discountRow}
      <div style="display:flex;justify-content:space-between;"><span>Tax:</span><span>${escapeHtml(formatCurrency(taxAmount))}</span></div>
    </div>
    <div class="divider total">
      <div style="display:flex;justify-content:space-between;"><span>TOTAL:</span><span>${escapeHtml(formatCurrency(totalAmount))}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:normal;margin-top:4px;">
        <span>Payment:</span>
        <span style="text-transform:capitalize;">${escapeHtml(formatPaymentMethod(paymentMethod))}</span>
      </div>
    </div>
    <div class="center" style="margin-top:16px;font-weight:bold;">Thank you! Enjoy your meal!</div>
  </body>
</html>`;
}

/**
 * Injects receipt HTML into a persistent #print-receipt-root div at the body
 * root, adds body.printing-receipt so CSS @media print only shows that div,
 * triggers window.print(), then cleans up.
 *
 * No window.open() used → no pop-up blocker issues.
 */
export function printReceiptHtml(html) {
  // Grab or create the persistent print container
  let container = document.getElementById('print-receipt-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'print-receipt-root';
    document.body.appendChild(container);
  }

  // Strip the outer <html>/<head>/<body> tags — we only want the body content
  // because we're injecting into an existing document, not a new window.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  container.innerHTML = bodyMatch ? bodyMatch[1] : html;

  // Also inject the receipt's inline <style> if present
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  let styleEl = null;
  if (styleMatch) {
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-receipt-print', 'true');
    styleEl.textContent = styleMatch[1];
    document.head.appendChild(styleEl);
  }

  // Add the class that triggers @media print CSS
  document.body.classList.add('printing-receipt');

  const cleanup = () => {
    document.body.classList.remove('printing-receipt');
    container.innerHTML = '';
    if (styleEl) styleEl.remove();
  };

  // Listen for after-print to clean up
  window.addEventListener('afterprint', cleanup, { once: true });

  // Trigger the browser print dialog
  window.print();

  // Failsafe cleanup if afterprint never fires (some browsers skip it)
  setTimeout(cleanup, 3000);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isOfflineOrder(order) {
  return String(order?.id || '').startsWith('offline-') || String(order?.orderNumber || '').startsWith('OFF-');
}

export async function sendReceiptEmail({ order, cart, cashierName, email, emailReceiptApi, toast }) {
  const trimmedEmail = email?.trim();
  if (!trimmedEmail) {
    toast.error('Please enter an email address');
    return false;
  }
  if (!isValidEmail(trimmedEmail)) {
    toast.error('Please enter a valid email address');
    return false;
  }
  if (!order?.id) {
    toast.error('Order details are missing');
    return false;
  }
  if (isOfflineOrder(order)) {
    toast.error('Offline orders cannot be emailed until synced');
    return false;
  }

  const receiptHtml = buildReceiptHtml(order, cart, cashierName);
  if (!receiptHtml) {
    toast.error('Receipt data is not available');
    return false;
  }

  try {
    console.log(`[sendReceiptEmail] Sending to: ${trimmedEmail}, orderId: ${order.id}`);
    const result = await emailReceiptApi(order.id, trimmedEmail, receiptHtml);
    console.log('[sendReceiptEmail] ✅ Success:', result);
    if (result?.previewUrl) {
      console.info(
        `%c[Email Preview] Click to view the test email → ${result.previewUrl}`,
        'color: #2D6A4F; font-weight: bold; text-decoration: underline;'
      );
    }
    toast.success(result?.message || `Receipt sent to ${trimmedEmail}`);
    return true;
  } catch (err) {
    console.error('[sendReceiptEmail] ❌ Error:', err?.response?.data || err.message, err);
    toast.error(err?.response?.data?.message || 'Failed to email receipt. Please try again.');
    return false;
  }
}

export function printOrderReceipt({ order, cart, cashierName, toast }) {
  const receiptHtml = buildReceiptHtml(order, cart, cashierName);
  if (!receiptHtml) {
    toast.error('Receipt data is not available');
    console.error('[printOrderReceipt] buildReceiptHtml returned empty — order or cart missing.', { order, cart });
    return false;
  }

  try {
    console.log('[printOrderReceipt] Triggering print for order:', order?.orderNumber || order?.id);
    printReceiptHtml(receiptHtml);
    return true;
  } catch (err) {
    console.error('[printOrderReceipt] ❌ Error:', err);
    toast.error(err.message || 'Failed to print receipt');
    return false;
  }
}
