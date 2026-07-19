import React, { useState, useEffect } from 'react';
import { Search, Info, AlertCircle, X, Clock } from 'lucide-react';
import { fetchMenuItems, fetchCategories } from '../../services/menu';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/currency';

export default function StudentMenu() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    halal: false,
  });
  const [selectedItem, setSelectedItem] = useState(null); // for nutrition modal
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [cats, items] = await Promise.all([
          fetchCategories(),
          fetchMenuItems({ available: 'true' }), // only active/available items
        ]);
        setCategories(cats || []);
        setMenuItems(items || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load menu items');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleFilterChange = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const matchesTag = (tags, filterKey) => {
    if (!tags || !Array.isArray(tags)) return false;
    const lowerTags = tags.map((t) => t.toLowerCase());

    if (filterKey === 'vegetarian') return lowerTags.includes('vegetarian') || lowerTags.includes('v');
    if (filterKey === 'vegan') return lowerTags.includes('vegan') || lowerTags.includes('ve');
    if (filterKey === 'glutenFree') return lowerTags.includes('gluten-free') || lowerTags.includes('gf');
    if (filterKey === 'halal') return lowerTags.includes('halal') || lowerTags.includes('h');
    return false;
  };

  const filteredItems = menuItems.filter((item) => {
    // 1. Category filter
    if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;

    // 2. Search query filter
    if (
      searchQuery.trim() &&
      !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // 3. Dietary filters (AND filter logic)
    if (filters.vegetarian && !matchesTag(item.dietaryTags, 'vegetarian')) return false;
    if (filters.vegan && !matchesTag(item.dietaryTags, 'vegan')) return false;
    if (filters.glutenFree && !matchesTag(item.dietaryTags, 'glutenFree')) return false;
    if (filters.halal && !matchesTag(item.dietaryTags, 'halal')) return false;

    return true;
  });

  const BADGE_STYLES = {
    'V': 'bg-green-100 text-green-800 border border-green-300',
    'VE': 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    'H': 'bg-orange-100 text-[#E76F00] border border-orange-300',
    'GF': 'bg-blue-100 text-blue-800 border border-blue-300',
  };

  const getDietaryLabel = (tag) => {
    const upper = tag.toUpperCase();
    if (upper === 'V' || upper === 'VEGETARIAN')
      return { label: 'Vegetarian', color: BADGE_STYLES['V'] };
    if (upper === 'VE' || upper === 'VEGAN')
      return { label: 'Vegan', color: BADGE_STYLES['VE'] };
    if (upper === 'GF' || upper === 'GLUTEN-FREE')
      return { label: 'Gluten-Free', color: BADGE_STYLES['GF'] };
    if (upper === 'H' || upper === 'HALAL')
      return { label: 'Halal', color: BADGE_STYLES['H'] };
    return {
      label: tag,
      color: 'bg-gray-100 text-gray-800 border border-gray-200',
    };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-forest">Campus Menu</h2>
          <p className="text-sm text-gray-500">Browse and view details of today's specials and standard items.</p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search food items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest text-sm font-medium"
          />
        </div>
      </div>

      {/* Fixed-height content: ONLY internal panes scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full flex flex-row gap-6 overflow-hidden">
          {/* Filters Sidebar */}
          <div className="w-full md:w-56 shrink-0">
            <div className="h-full overflow-y-auto pr-1 space-y-6">
              {/* Dietary Filters */}
              <div className="bg-[#FDF8F0]/50 border border-forest/10 rounded-2xl p-4">
                <h3 className="font-bold text-sm text-forest mb-3 uppercase tracking-wider">Dietary Needs</h3>
                <div className="space-y-2.5">
                  {[
                    { key: 'vegetarian', label: 'Vegetarian (V)' },
                    { key: 'vegan', label: 'Vegan (VE)' },
                    { key: 'glutenFree', label: 'Gluten-Free (GF)' },
                    { key: 'halal', label: 'Halal (H)' },
                  ].map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center gap-2.5 cursor-pointer text-sm font-bold text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={filters[f.key]}
                        onChange={() => handleFilterChange(f.key)}
                        className="rounded text-orange-600 focus:ring-orange-500 h-5 w-5 border-gray-300"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="bg-[#FDF8F0]/50 border border-forest/10 rounded-2xl p-4">
                <h3 className="font-bold text-sm text-forest mb-3 uppercase tracking-wider">Categories</h3>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                      selectedCategory === 'all' ? 'bg-forest text-cream' : 'text-gray-600 hover:bg-forest/5'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                        selectedCategory === cat.id
                          ? 'bg-forest text-cream'
                          : 'text-gray-600 hover:bg-forest/5'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 h-full overflow-y-auto pr-2">
            {loading ? (
              <div className="h-full flex items-center justify-center py-20 text-forest font-bold">Loading Menu...</div>
            ) : filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400">
                <AlertCircle size={48} className="stroke-1 mb-2" />
                <p className="font-bold">No items match your criteria</p>
                <p className="text-sm">Try modifying your filters or search term.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-2">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                  >
                    {/* Item Image */}
                    <div className="h-40 bg-gray-50 relative">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-forest/5 text-forest/40 font-black">
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {item.isDailySpecial && (
                        <span className="absolute top-3 right-3 bg-orange-500 text-white font-black text-[10px] uppercase tracking-wider px-2 py-1 rounded-full shadow-sm">
                          Daily Special
                        </span>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <h4 className="font-extrabold text-forest text-base leading-snug">{item.name}</h4>
                          <span className="font-black text-orange-600 text-base">{formatCurrency(item.price)}</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{item.description || 'No description available.'}</p>
                      </div>

                      {/* Footer tags / buttons */}
                      <div>
                        {/* Dietary Badges */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.dietaryTags?.map((tag, idx) => {
                            const tagConfig = getDietaryLabel(tag);
                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full
                                text-xs font-bold tracking-wide ${tagConfig.color}`}
                              >
                                {tagConfig.label}
                              </span>
                            );
                          })}
                        </div>

                        {/* Modal Trigger Button */}
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="w-full mt-2 flex items-center justify-center gap-2
             border-2 border-[#1B4332] text-[#1B4332] 
             rounded-xl py-2.5 px-4 text-sm font-bold
             hover:bg-[#1B4332] hover:text-white
             active:scale-95
             transition-all duration-200"
                        >
                          <Info size={15} />
                          View Nutrition & Allergens
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nutrition & Allergens Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full border border-forest/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-forest text-cream flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black tracking-wide">{selectedItem.name}</h3>
                <p className="text-xs text-cream/70">Nutritional Facts & Details</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-cream/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Prep time & Price */}
              <div className="flex justify-between items-center bg-[#FDF8F0] border border-forest/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-forest">
                  <Clock size={18} />
                  <span className="font-bold text-sm">{selectedItem.prepTimeMinutes ?? 5} min prep</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block font-medium">Price</span>
                  <span className="font-black text-orange-600 text-lg">{formatCurrency(selectedItem.price)}</span>
                </div>
              </div>

              {/* Nutrition Grid */}
              <div>
                <h4 className="font-black text-sm text-forest mb-3 uppercase tracking-wider border-b border-gray-100 pb-1">
                  Nutrition Info
                </h4>
                {selectedItem.nutritionalInfo && Object.keys(selectedItem.nutritionalInfo).length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                      <span className="text-[10px] text-gray-500 font-bold block uppercase">Calories</span>
                      <span className="font-black text-base text-forest">{selectedItem.nutritionalInfo.calories ?? '-'}</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                      <span className="text-[10px] text-gray-500 font-bold block uppercase">Protein</span>
                      <span className="font-black text-base text-forest">
                        {(selectedItem.nutritionalInfo.protein_g ?? selectedItem.nutritionalInfo.protein) ?? '-'}g
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                      <span className="text-[10px] text-gray-500 font-bold block uppercase">Carbs</span>
                      <span className="font-black text-base text-forest">
                        {(selectedItem.nutritionalInfo.carbs_g ?? selectedItem.nutritionalInfo.carbohydrates ?? selectedItem.nutritionalInfo.carbs) ?? '-'}g
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                      <span className="text-[10px] text-gray-500 font-bold block uppercase">Fat</span>
                      <span className="font-black text-base text-forest">
                        {(selectedItem.nutritionalInfo.fat_g ?? selectedItem.nutritionalInfo.fat) ?? '-'}g
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No nutritional facts available for this item.</p>
                )}
              </div>

              {/* Allergens & Tags */}
              <div>
                <h4 className="font-black text-sm text-forest mb-2.5 uppercase tracking-wider border-b border-gray-100 pb-1">
                  Allergens & Dietary Tags
                </h4>

                <div className="mb-3">
                  <span className="text-[11px] font-bold text-red-600 block uppercase mb-1 tracking-wider">Allergens:</span>
                  {selectedItem.allergens && selectedItem.allergens.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.allergens.map((allergen, idx) => (
                        <span key={idx} className="bg-red-50 text-red-700 font-bold text-xs px-2.5 py-0.5 rounded-md border border-red-100">
                          {allergen}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-green-700 font-bold bg-green-50 px-2.5 py-0.5 rounded border border-green-100 inline-block">
                      Allergy-safe / None listed
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-bold text-forest block uppercase mb-1 tracking-wider">Dietary Profile:</span>
                  {selectedItem.dietaryTags && selectedItem.dietaryTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.dietaryTags.map((tag, idx) => {
                        const tagConfig = getDietaryLabel(tag);
                        return (
                          <span key={idx} className={`inline-flex items-center px-2.5 py-0.5 rounded-full
                            text-xs font-bold tracking-wide ${tagConfig.color}`}>
                            {tagConfig.label}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 italic">None specified.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

