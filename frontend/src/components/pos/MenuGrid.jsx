import { DietaryBadge } from './CategoryTabs';
import { formatCurrency } from '../../utils/currency';

export default function MenuGrid({ items, onItemClick, lastAddedId, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-96 animate-pulse rounded-xl bg-forest/10" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-forest/15 text-forest/50">
        No items found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const isSoldOut = !item.isAvailable;
        const isAnimating = lastAddedId?.startsWith(item.id);
        const hasFlashDiscount = Number(item.flashDiscountPercent || 0) > 0;
        const effectivePrice = Number(item.flashDiscountPrice ?? item.price ?? 0);

        return (
          <button
            key={item.id}
            type="button"
            disabled={isSoldOut}
            onClick={() => onItemClick(item)}
            className={`group relative flex min-h-[360px] flex-col overflow-hidden rounded-xl border-2 bg-white text-left transition-all duration-200 cursor-pointer
            ${
              isSoldOut
                ? 'cursor-not-allowed border-forest/10 opacity-60'
                : 'border-forest/10 hover:border-accent hover:shadow-xl hover:-translate-y-1 hover:shadow-forest/20 active:scale-95'
            } ${isAnimating ? 'animate-cart-pop' : ''}`}
          >
            <div className="relative h-56 w-full shrink-0 overflow-hidden bg-cream-dark transition-all duration-200">
              {item.imageUrl ? (
                  <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-forest/30 text-sm">
                  No image
                </div>
              )}
              {isSoldOut && (
                <div className="absolute inset-0 flex items-center justify-center bg-forest/60">
                  <span className="rounded-lg bg-error px-4 py-2 text-base font-bold text-white">
                    Sold Out
                  </span>
                </div>
              )}
              <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                {item.isDailySpecial && !isSoldOut && (
                  <span className="rounded-md bg-accent px-3 py-1 text-sm font-bold text-cream">
                    Special
                  </span>
                )}
                {hasFlashDiscount && !isSoldOut && (
                  <span className="rounded-md bg-red-600 px-3 py-1 text-sm font-bold text-white">
                    {item.flashDiscountPercent}% OFF
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-between p-4">
              <div>
                <p className="line-clamp-2 text-base font-bold leading-tight text-forest">
                  {item.name}
                </p>
                {item.dietaryTags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.dietaryTags.map((tag) => (
                      <DietaryBadge key={tag} tag={tag} />
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-1">
                {hasFlashDiscount ? (
                  <>
                    <p className="text-lg font-bold text-accent group-hover:text-accent/80 transition-colors duration-200">
                      {formatCurrency(effectivePrice)}
                    </p>
                    <p className="text-sm text-forest/50 line-through">
                      {formatCurrency(item.price)}
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-bold text-accent group-hover:text-accent/80 transition-colors duration-200">
                    {formatCurrency(item.price)}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}


