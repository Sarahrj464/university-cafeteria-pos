import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('../services/api', () => ({
  default: {
    post,
  },
}));

import { processPayment, processSplitPayment } from '../services/payments';

describe('payments service', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { data: { order: { id: 'order-1' } } } });
  });

  it('forwards studentId for meal plan payments', async () => {
    await processPayment({
      orderId: 'order-1',
      paymentMethod: 'meal_plan',
      amount: 12.5,
      studentId: 'STU-123',
    });

    expect(post).toHaveBeenCalledWith('/payments/process', {
      orderId: 'order-1',
      paymentMethod: 'meal_plan',
      amount: 12.5,
      transactionRef: undefined,
      studentId: 'STU-123',
    });
  });

  it('forwards studentId for meal plan split payments', async () => {
    await processSplitPayment({
      orderId: 'order-1',
      payments: [{ method: 'meal_plan', amount: 12.5 }],
      studentId: 'STU-123',
    });

    expect(post).toHaveBeenCalledWith('/payments/split', {
      orderId: 'order-1',
      payments: [{ method: 'meal_plan', amount: 12.5 }],
      studentId: 'STU-123',
    });
  });
});
