import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { fetchCategories, fetchMenuItems } from '../services/menu';
import { useCart } from '../hooks/useCart';
import { useToast } from '../hooks/useToast';
import POSTopBar from '../components/pos/POSTopBar';
import SearchBar from '../components/pos/SearchBar';
import CategoryTabs from '../components/pos/CategoryTabs';
import MenuGrid from '../components/pos/MenuGrid';
import Cart from '../components/pos/Cart';
import ModifierSheet from '../components/pos/ModifierSheet';
import CheckoutModal from '../components/pos/CheckoutModal';
import BarcodeScanner from '../components/BarcodeScanner';
import { Camera } from 'lucide-react';
import { useShift } from '../contexts/ShiftContext';
import { StartShiftOverlay, EndShiftModal } from '../components/pos/ShiftManagement';

export default function POSPage() {
  const { user } = useAuth();
  const toast = useToast();
  const cart = useCart();
  const { activeShift, isLoading: shiftLoading } = useShift();
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [modifierItem, setModifierItem] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [endShiftOpen, setEndShiftOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const handleCloseShiftModal = useCallback(() => setEndShiftOpen(false), []);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menu-items', activeCategory, search],
    queryFn: () =>
      fetchMenuItems({
        category: activeCategory,
        search: search || undefined,
        available: 'false',
      }),
  });

  const handleItemClick = useCallback((item) => {
    if (!item.isAvailable) return;
    const hasModifiers = item.modifiers?.length > 0;
    if (hasModifiers) {
      setModifierItem(item);
    } else {
      cart.addItem(item, []);
      toast.success(`Added ${item.name}`);
    }
  }, [cart, toast]);

  const handleModifierAdd = useCallback((item, modifiers) => {
    cart.addItem(item, modifiers);
    toast.success(`Added ${item.name}`);
  }, [cart, toast]);

  const handlePay = () => {
    if (cart.items.length === 0) return;
    setCheckoutOpen(true);
  };

  const handleCheckoutClose = () => {
    setCheckoutOpen(false);
  };

  if (shiftLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-forest/20 border-t-accent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream">
      <POSTopBar cartCount={cart.cartItemCount} onEndShift={() => setEndShiftOpen(true)} />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Menu area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 space-y-3 border-b border-forest/10 bg-cream px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <SearchBar value={search} onChange={setSearch} />
              </div>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white"
              >
                <Camera size={18} />
                Scan Product
              </button>
            </div>
            <CategoryTabs
              categories={categories}
              activeCategory={activeCategory}
              onChange={setActiveCategory}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <MenuGrid
              items={menuItems}
              onItemClick={handleItemClick}
              lastAddedId={cart.lastAddedId}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Cart sidebar */}
        <div className="h-80 shrink-0 border-t border-forest/20 lg:h-auto lg:w-[340px] lg:border-l lg:border-t-0 xl:w-[380px]">
          <Cart cart={cart} onPay={handlePay} isSubmitting={checkoutOpen} />
        </div>
      </div>

      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md">
            <BarcodeScanner cart={cart} onClose={() => setScannerOpen(false)} />
          </div>
        </div>
      )}

      <ModifierSheet
        item={modifierItem}
        isOpen={!!modifierItem}
        onClose={() => setModifierItem(null)}
        onAdd={handleModifierAdd}
      />

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={handleCheckoutClose}
        cart={cart}
        cashierName={user?.name}
      />

      {user?.role === 'cashier' && !activeShift && <StartShiftOverlay />}
      <EndShiftModal isOpen={endShiftOpen} onClose={handleCloseShiftModal} />
    </div>
  );
}
