import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import Button from "../ui/Button";
import { useToast } from "../../hooks/useToast";
import { formatCurrency } from "../../utils/currency";

export default function Cart({ cart, onPay, isSubmitting }) {
  const toast = useToast();
  const [promoInput, setPromoInput] = useState("");

  const handleApplyPromo = () => {
    if (!promoInput.trim()) {
      toast.error("Please enter a promo code");
      return;
    }
    const result = cart.applyDiscount(promoInput);
    if (result.success) {
      toast.success(`${result.message} applied!`);
    } else {
      toast.error("Invalid promo code");
      setPromoInput("");
    }
  };

  return (
    <aside className="flex h-full flex-col bg-forest text-cream">
      <div className="flex items-center gap-2 border-b border-cream/10 px-4 py-3">
        <ShoppingCart size={22} className="text-accent" />
        <h2 className="text-lg font-bold">Order Cart</h2>

        {cart.cartItemCount > 0 && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold">
            {cart.cartItemCount}
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            if (window.confirm("Clear all items?")) {
              cart.clearCart();
            }
          }}
          disabled={cart.items.length === 0 || isSubmitting}
          className="ml-auto shrink-0 rounded-lg bg-forest-light/20 px-3 py-1.5 text-sm font-semibold text-cream disabled:opacity-40"
        >
          Clear All 🗑️
        </button>
      </div>


      <div className="flex-1 overflow-y-auto px-4 py-3">

        {cart.items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-cream/50">
            <ShoppingCart size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Tap menu items to add</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {cart.items.map((item) => (
              <li
                key={item.lineId}
                className={`rounded-xl bg-forest-light/50 p-3 transition-transform ${
                  cart.lastAddedId === item.lineId ? "animate-cart-slide" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{item.name}</p>
                    {item.modifiers?.length > 0 && (
                      <p className="mt-0.5 text-xs text-cream/60">
                        {item.modifiers.map((m) => m.optionName).join(", ")}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => cart.removeItem(item.lineId)}
                    className="shrink-0 rounded-lg p-1.5 text-cream/60 hover:bg-error/20 hover:text-error"
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        cart.updateQuantity(item.lineId, item.quantity - 1)
                      }
                      disabled={item.quantity <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest text-cream disabled:opacity-40"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-6 text-center font-bold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        cart.updateQuantity(item.lineId, item.quantity + 1)
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-cream"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <span className="font-bold">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-cream/10 px-4 py-4">
        {/* Promo Code Row */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-cream/70 uppercase tracking-wide">
            Promo Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyPromo();
              }}
              placeholder="e.g. STAFF10"
              className="flex-1 min-h-[42px] rounded-lg border border-cream/20 
                 bg-forest-light px-3 text-sm text-cream 
                 placeholder:text-cream/30 focus:border-accent 
                 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              className="min-w-[72px] min-h-[42px] rounded-lg bg-accent 
                 px-4 text-sm font-bold text-white 
                 hover:bg-accent/90 transition-colors"
            >
              Apply
            </button>
          </div>
          {cart.promoCode && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-green-300 font-semibold">
                ✓ {cart.promoCode} applied — {cart.promoPercent}% off
              </p>
              <button
                type="button"
                onClick={() => {
                  cart.clearPromoCode();
                  setPromoInput("");
                }}
                className="shrink-0 rounded-lg bg-error/15 px-2 py-1 text-xs font-bold text-error hover:bg-error/25"
              >
                Remove promo
              </button>
            </div>
          )}
        </div>



        {/* Student discount */}

        <div className="rounded-lg bg-forest-light/50 p-3">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cart.studentDiscountEnabled}
                onChange={(e) => cart.setStudentDiscountEnabled(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <span className="font-semibold">Student Discount</span>
            </span>
            <span className="shrink-0 rounded-md bg-forest px-2 py-1 text-[12px] font-bold text-accent">
              [10% OFF]
            </span>
          </label>
          {cart.studentDiscountEnabled && (
            <input
              type="text"
              value={cart.studentId}
              onChange={(e) => cart.setStudentId(e.target.value)}
              placeholder="Student ID (e.g. STU-2024-001)"
              className="mt-2 w-full min-h-[40px] rounded-lg border border-cream/20 bg-forest px-3 text-sm text-cream placeholder:text-cream/40 focus:border-accent focus:outline-none"
            />
          )}
        </div>


        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-cream/80">
            <span>Subtotal</span>
            <span>{formatCurrency(cart.subtotal)}</span>
          </div>
          {cart.discountAmount > 0 && (
            <div className="flex justify-between text-success-light">
              <span>Discount</span>
              <span>-{formatCurrency(cart.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-cream/80">
            <span>Tax (5%)</span>
            <span>{formatCurrency(cart.taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-cream/10 pt-2 text-lg font-bold">
            <span className="text-cream/90 text-base">TOTAL</span>
            <span className="text-accent text-xl">{formatCurrency(cart.total)}</span>
          </div>
        </div>

        <div className="flex">
          <Button
            variant="accent"
            size="md"
            className="flex-1"
            disabled={cart.items.length === 0 || isSubmitting}
            onClick={onPay}
          >
            {isSubmitting ? "Processing..." : `Pay → ${formatCurrency(cart.total)}`}
          </Button>
        </div>

      </div>
    </aside>
  );
}
