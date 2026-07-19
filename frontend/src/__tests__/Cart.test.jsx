import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart, DISCOUNT_CODES, calcUnitPrice } from '../hooks/useCart';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const mockItem = (id = 'item-1', price = 10.0) => ({
  id,
  name: `Test Item ${id}`,
  price,
  imageUrl: null,
});

describe('useCart Hook', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('starts with an empty cart', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.cartItemCount).toBe(0);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it('adds an item to the cart', () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.addItem(mockItem('burger', 5.0), []);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('Test Item burger');
    expect(result.current.cartItemCount).toBe(1);
  });

  it('increments quantity when adding the same item twice', () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.addItem(mockItem('pizza', 8.0), []);
      result.current.addItem(mockItem('pizza', 8.0), []);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.cartItemCount).toBe(2);
  });

  it('removes an item from the cart', () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.addItem(mockItem('salad', 3.0), []);
    });
    const lineId = result.current.items[0].lineId;
    act(() => {
      result.current.removeItem(lineId);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it('calculates totals correctly with tax', () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.addItem(mockItem('wrap', 10.0), []);
    });
    expect(result.current.subtotal).toBe(10.0);
    expect(result.current.taxAmount).toBe(0.5);   // 5% tax
    expect(result.current.total).toBe(10.5);
  });

  it('applies a valid promo discount code', () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.addItem(mockItem('fries', 10.0), []);
    });
    let applyResult;
    act(() => {
      applyResult = result.current.applyDiscount('STAFF10');
    });
    expect(applyResult.success).toBe(true);
    expect(result.current.promoCode).toBe('STAFF10');
    expect(result.current.discountAmount).toBe(1.0); // 10% of 10
  });

  it('rejects an invalid promo code', () => {
    const { result } = renderHook(() => useCart());
    let applyResult;
    act(() => {
      applyResult = result.current.applyDiscount('BADCODE');
    });
    expect(applyResult.success).toBe(false);
    expect(applyResult.message).toBe('Invalid promo code');
  });

  it('clears the cart', () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.addItem(mockItem('drink', 2.0), []);
    });
    act(() => {
      result.current.clearCart();
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.subtotal).toBe(0);
  });

  it('calculates price adjustments from modifiers', () => {
    const basePrice = 10.0;
    const modifiers = [{ groupId: 'size', optionId: 'large', priceAdjustment: 2.0 }];
    const unitPrice = calcUnitPrice(basePrice, modifiers);
    expect(unitPrice).toBe(12.0);
  });

  it('updates quantity for an existing item', () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.addItem(mockItem('burger', 5.0), []);
    });
    const lineId = result.current.items[0].lineId;
    act(() => {
      result.current.updateQuantity(lineId, 3);
    });
    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.cartItemCount).toBe(3);
  });
});
