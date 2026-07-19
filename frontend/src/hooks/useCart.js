import { useCallback, useEffect, useMemo, useState } from 'react';

const CART_STORAGE_KEY = 'pos_cart_v1';
const TAX_RATE = 0.05;
const STUDENT_DISCOUNT_RATE = 0.1;

export const DISCOUNT_CODES = {
  STAFF10: { percent: 10, label: 'Staff 10% off' },
  STUDENT15: { percent: 15, label: 'Student 15% off' },
  PROMO20: { percent: 20, label: 'Promo 20% off' },
};

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Clear promo code on page load — cashier must re-enter every session
    return {
      ...parsed,
      promoCode: '',
      promoPercent: 0,
      studentDiscountEnabled: false,
    };
  } catch {
    return null;
  }
}

function saveCart(state) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
}

function modifierKey(modifiers = []) {
  return modifiers
    .map((m) => `${m.groupId}:${m.optionId}`)
    .sort()
    .join('|');
}

function calcUnitPrice(basePrice, modifiers = []) {
  const adjustment = modifiers.reduce((sum, m) => sum + (m.priceAdjustment || 0), 0);
  return parseFloat((basePrice + adjustment).toFixed(2));
}

const defaultState = {
  items: [],
  promoCode: '',
  promoPercent: 0,
  studentId: '',
  studentDiscountEnabled: false,
  orderNote: '',
};

export function useCart() {
  const [cart, setCart] = useState(() => loadCart() || defaultState);
  const [lastAddedId, setLastAddedId] = useState(null);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const addItem = useCallback((item, selectedModifiers = []) => {
    const basePrice = Number(item.flashDiscountPrice ?? item.price ?? 0);
    const unitPrice = calcUnitPrice(basePrice, selectedModifiers);
    const modKey = modifierKey(selectedModifiers);
    const lineId = `${item.id}-${modKey}`;

    setCart((prev) => {
      const existing = prev.items.find((i) => i.lineId === lineId);
      const items = existing
        ? prev.items.map((i) =>
            i.lineId === lineId ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [
            ...prev.items,
            {
              lineId,
              menuItemId: item.id,
              name: item.name,
              imageUrl: item.imageUrl,
              basePrice: item.price,
              unitPrice,
              flashDiscountPercent: Number(item.flashDiscountPercent ?? 0),
              quantity: 1,
              modifiers: selectedModifiers,
            },
          ];
      return { ...prev, items };
    });

    setLastAddedId(lineId);
    setTimeout(() => setLastAddedId(null), 400);
  }, []);

  const removeItem = useCallback((lineId) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.lineId !== lineId),
    }));
  }, []);

  const updateQuantity = useCallback((lineId, qty) => {
    if (qty < 1) return;
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.lineId === lineId ? { ...i, quantity: qty } : i
      ),
    }));
  }, []);

  const applyDiscount = useCallback((code) => {
    const upper = code?.trim().toUpperCase();
    const discount = DISCOUNT_CODES[upper];
    if (!discount) {
      return { success: false, message: 'Invalid promo code' };
    }
    setCart((prev) => ({
      ...prev,
      promoCode: upper,
      promoPercent: discount.percent,
    }));
    return { success: true, message: discount.label };
  }, []);

  const clearPromoCode = useCallback(() => {
    setCart((prev) => ({ ...prev, promoCode: '', promoPercent: 0 }));
  }, []);

  const setStudentId = useCallback((studentId) => {
    setCart((prev) => ({ ...prev, studentId }));
  }, []);

  const setStudentDiscountEnabled = useCallback((enabled) => {
    setCart((prev) => ({ ...prev, studentDiscountEnabled: enabled }));
  }, []);

  const setOrderNote = useCallback((note) => {
    setCart((prev) => ({ ...prev, orderNote: note }));
  }, []);

  const clearCart = useCallback(() => {
    setCart(defaultState);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const totals = useMemo(() => {
    const subtotal = cart.items.reduce(
      (sum, i) => sum + i.unitPrice * i.quantity,
      0
    );
    const promoDiscount = subtotal * (cart.promoPercent / 100);
    const studentDiscount =
      cart.studentDiscountEnabled && cart.studentId.trim()
        ? subtotal * STUDENT_DISCOUNT_RATE
        : 0;
    const discountAmount = parseFloat((promoDiscount + studentDiscount).toFixed(2));
    const taxable = Math.max(subtotal - discountAmount, 0);
    const taxAmount = parseFloat((taxable * TAX_RATE).toFixed(2));
    const total = parseFloat((taxable + taxAmount).toFixed(2));

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      promoDiscount: parseFloat(promoDiscount.toFixed(2)),
      studentDiscount: parseFloat(studentDiscount.toFixed(2)),
      discountAmount,
      taxAmount,
      total,
    };
  }, [cart]);

  const cartItemCount = useMemo(
    () => cart.items.reduce((sum, i) => sum + i.quantity, 0),
    [cart.items]
  );

  return {
    items: cart.items,
    promoCode: cart.promoCode,
    studentId: cart.studentId,
    studentDiscountEnabled: cart.studentDiscountEnabled,
    orderNote: cart.orderNote,
    lastAddedId,
    cartItemCount,
    ...totals,
    addItem,
    removeItem,
    updateQuantity,
    applyDiscount,
    clearPromoCode,
    setStudentId,
    setStudentDiscountEnabled,
    setOrderNote,
    clearCart,
  };
}

export { calcUnitPrice };
