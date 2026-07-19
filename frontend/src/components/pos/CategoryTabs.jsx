const DIETARY_LABELS = {
  V: 'Vegetarian',
  VE: 'Vegan',
  H: 'Halal',
  GF: 'Gluten-Free',
};

export default function CategoryTabs({ categories, activeCategory, onChange }) {
  const tabs = [{ id: 'all', name: 'All' }, ...categories];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {tabs.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onChange(cat.id)}
          className={`shrink-0 min-h-[48px] rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${
          activeCategory === cat.id
              ? 'bg-[#E76F00] text-white font-bold px-4 py-2 \
           rounded-full text-sm shadow-md \
           shadow-orange-200 scale-105 transition-all'
              : 'bg-white text-[#1B4332] font-semibold px-4 py-2 \
           rounded-full text-sm border border-[#1B4332]/20 \
           hover:border-[#E76F00] hover:text-[#E76F00] \
           transition-all duration-200'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

export function DietaryBadge({ tag }) {
  const BADGE_STYLES = {
    V: 'bg-green-100 text-green-800 border border-green-300',
    VE: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    H: 'bg-orange-100 text-[#E76F00] border border-orange-300',
    GF: 'bg-blue-100 text-blue-800 border border-blue-300',
  };

  const badgeClass = BADGE_STYLES[tag] || 'bg-gray-100 text-gray-800 border border-gray-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full \
 text-xs font-bold tracking-wide ${badgeClass}`}
      title={DIETARY_LABELS[tag] || tag}
    >
      {tag}
    </span>
  );
}
