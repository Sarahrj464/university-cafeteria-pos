import {
  createOrder,
  getOrderById,
  updateOrderStatus,
  listOrders,
  storeReceipt,
} from '../services/order.service.js';
import { sendReceiptEmail } from '../services/email.service.js';

export async function createOrderHandler(req, res, next) {
  try {
    const order = await createOrder(req.user.userId, req.body);

    // NEW: notify kitchen display of the new order
    const io = req.app.get('io');
    if (io) {
      io.emit('order:new', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items,
      });
    }

    res.status(201).json({ success: true, data: { order } });
  } catch (err) {
    next(err);
  }
}

export async function listOrdersHandler(req, res, next) {
  try {
    const limit = Number(req.query.limit || 500);
    const showCancelled = req.query.showCancelled === 'true';
    const orders = await listOrders({ status: req.query.status, limit, showCancelled });
    res.json({ success: true, data: { orders } });
  } catch (err) {
    next(err);
  }
}

export async function getDisplayOrders(req, res, next) {
  try {
    const orders = await listOrders({ limit: 100 });
    res.json({ success: true, data: { orders } });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await getOrderById(req.params.id);
    res.json({ success: true, data: { order } });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Status is required',
      });
    }
    const order = await updateOrderStatus(req.params.id, status, req.user?.userId);
    const io = req.app.get('io');
    if (io) {
      const payload = { orderId: order.id, orderNumber: order.orderNumber, status: order.status };
      io.emit('order_status_changed', payload);
      io.emit('order:status', payload);
    }
    res.json({ success: true, data: { order } });
  } catch (err) {
    next(err);
  }
}

export async function emailReceipt(req, res, next) {
  try {
    const { email, receiptHtml } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    console.log(`[emailReceipt] Request for order ${req.params.id} → to: ${email}`);

    if (!email?.trim() || !emailRegex.test(email.trim())) {
      console.warn('[emailReceipt] Rejected: invalid email address:', email);
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'A valid email address is required',
      });
    }

    if (!receiptHtml?.trim()) {
      console.warn('[emailReceipt] Rejected: missing receiptHtml');
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Receipt content is required',
      });
    }

    const order = await getOrderById(req.params.id);

    // 1. Persist receipt in audit log (fire-and-forget — never blocks the email send)
    storeReceipt(req.params.id, email.trim(), receiptHtml).catch((err) =>
      console.error('[emailReceipt] Audit log failed (non-critical):', err.message)
    );

    // 2. Actually send the email via Nodemailer
    const { messageId, previewUrl } = await sendReceiptEmail(
      email.trim(),
      order.orderNumber,
      receiptHtml
    );

    console.log(
      `[emailReceipt] ✅ Receipt for Order ${order.orderNumber} delivered. messageId=${messageId}`
    );

    res.json({
      success: true,
      message: `Receipt sent to ${email.trim()}`,
      // In Ethereal test mode this URL lets you view the email in the browser
      ...(previewUrl ? { previewUrl } : {}),
    });
  } catch (err) {
    console.error('[emailReceipt] ❌ Error:', err.message);
    next(err);
  }
}
