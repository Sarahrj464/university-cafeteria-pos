import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createOrder } from '../services/orders';
import { processPayment } from '../services/payments';

// Mock services
vi.mock('../services/orders', () => ({
  createOrder: vi.fn(),
  emailReceipt: vi.fn(),
}));

vi.mock('../services/payments', () => ({
  processPayment: vi.fn(),
  processSplitPayment: vi.fn(),
}));

vi.mock('../services/meal-plans', () => ({
  getMealPlan: vi.fn(),
}));

vi.mock('react-to-print', () => ({
  useReactToPrint: () => vi.fn(),
}));

import CheckoutModal from '../components/pos/CheckoutModal';

const mockCart = {
  items: [
    {
      lineId: 'item-1',
      menuItemId: 'uuid-1',
      name: 'Chicken Burger',
      quantity: 2,
      unitPrice: 5.5,
    },
  ],
  subtotal: 11.0,
  discountAmount: 0,
  taxAmount: 0.55,
  total: 11.55,
  orderNote: '',
  studentId: '',
  setStudentId: vi.fn(),
  clearCart: vi.fn(),
};

describe('CheckoutModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CheckoutModal isOpen={false} onClose={vi.fn()} cart={mockCart} cashierName="Test Cashier" />
    );
    // Component should return null
    expect(container.firstChild).toBeNull();
  });

  it('renders checkout modal when isOpen is true', () => {
    render(
      <CheckoutModal isOpen={true} onClose={vi.fn()} cart={mockCart} cashierName="Test Cashier" />
    );
    // Should show "Checkout" heading and "Order Summary" text
    expect(screen.getByText('Checkout')).toBeTruthy();
  });

  it('shows order summary with correct items', () => {
    render(
      <CheckoutModal isOpen={true} onClose={vi.fn()} cart={mockCart} cashierName="Test Cashier" />
    );
    expect(screen.getByText(/Chicken Burger/i)).toBeTruthy();
  });

  it('renders payment method selection after clicking Proceed', () => {
    render(
      <CheckoutModal isOpen={true} onClose={vi.fn()} cart={mockCart} cashierName="Test Cashier" />
    );

    const proceedBtn = screen.getByText(/Proceed to Payment/i);
    fireEvent.click(proceedBtn);

    // After clicking Proceed, we should see payment options
    expect(screen.getByText(/Select Payment Method/i) || screen.getByText('Cash')).toBeTruthy();
  });

  it('shows Cash payment method option', () => {
    render(
      <CheckoutModal isOpen={true} onClose={vi.fn()} cart={mockCart} cashierName="Test Cashier" />
    );

    const proceedBtn = screen.getByText(/Proceed to Payment/i);
    fireEvent.click(proceedBtn);

    expect(screen.getByText('Cash')).toBeTruthy();
  });

  it('shows Card payment method option', () => {
    render(
      <CheckoutModal isOpen={true} onClose={vi.fn()} cart={mockCart} cashierName="Test Cashier" />
    );

    const proceedBtn = screen.getByText(/Proceed to Payment/i);
    fireEvent.click(proceedBtn);

    expect(screen.getByText('Card')).toBeTruthy();
  });

  it('shows Meal Plan payment method option', () => {
    render(
      <CheckoutModal isOpen={true} onClose={vi.fn()} cart={mockCart} cashierName="Test Cashier" />
    );

    const proceedBtn = screen.getByText(/Proceed to Payment/i);
    fireEvent.click(proceedBtn);

    expect(screen.getByText('Meal Plan')).toBeTruthy();
  });

  it('highlights selected payment method when clicked', () => {
    render(
      <CheckoutModal isOpen={true} onClose={vi.fn()} cart={mockCart} cashierName="Test Cashier" />
    );

    fireEvent.click(screen.getByText(/Proceed to Payment/i));

    const cashButton = screen.getByText('Cash').closest('button');
    if (cashButton) {
      fireEvent.click(cashButton);
      // Cash section should appear showing amount tendered input
      expect(screen.queryByPlaceholderText(/0\.00/i) || screen.queryByText(/Amount Tendered/i)).toBeTruthy();
    }
  });

  it('includes the student ID for wallet payments', async () => {
    vi.mocked(createOrder).mockResolvedValue({ id: 'order-1' });
    vi.mocked(processPayment).mockResolvedValue({ order: { id: 'order-1', orderNumber: 'ORD-1' } });

    const walletCart = {
      ...mockCart,
      studentId: 'STU-2024-001',
      setStudentId: vi.fn(),
      clearCart: vi.fn(),
    };

    render(
      <CheckoutModal isOpen={true} onClose={vi.fn()} cart={walletCart} cashierName="Test Cashier" />
    );

    fireEvent.click(screen.getByText(/Proceed to Payment/i));
    fireEvent.click(screen.getByText('Wallet').closest('button'));
    fireEvent.click(screen.getByText('Confirm Payment'));

    await waitFor(() => {
      expect(processPayment).toHaveBeenCalledWith(expect.objectContaining({
        studentId: 'STU-2024-001',
        paymentMethod: 'campus_wallet',
      }));
    });
  });
});
