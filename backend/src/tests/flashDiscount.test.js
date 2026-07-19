import { setFlashDiscount, getFlashDiscount, clearFlashDiscount } from '../services/flash-discount.service.js';

describe('flash discount service', () => {
  beforeEach(() => {
    clearFlashDiscount('item-1');
    clearFlashDiscount('item-2');
  });

  it('stores and retrieves a percentage discount for a menu item', () => {
    const result = setFlashDiscount('item-1', 15);

    expect(result).toBe(15);
    expect(getFlashDiscount('item-1')).toBe(15);
  });

  it('removes a discount when the percentage is cleared', () => {
    setFlashDiscount('item-2', 20);
    clearFlashDiscount('item-2');

    expect(getFlashDiscount('item-2')).toBeNull();
  });
});
