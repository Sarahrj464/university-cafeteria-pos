import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Plus,
  Search,
  Star,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  FolderOpen,
  Check
} from 'lucide-react';
import { fetchMenuItems, fetchCategories } from '../../services/menu';
import api from '../../services/api';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/currency';

export default function MenuManagement() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null means adding new

  // Form states - Item
  const [itemName, setItemName] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemPrepTime, setItemPrepTime] = useState('5');
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [selectedDietaryTags, setSelectedDietaryTags] = useState([]);
  const [nutritionalInfo, setNutritionalInfo] = useState({
    calories: '',
    protein: '',
    carbohydrates: '',
    fat: '',
  });
  const [itemModifiersJson, setItemModifiersJson] = useState('[]');

  // Form states - Category
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('utensils');
  const [categoryOrder, setCategoryOrder] = useState('1');
  const [editingCategory, setEditingCategory] = useState(null);

  const loadData = async () => {
    try {
      const [items, cats] = await Promise.all([
        fetchMenuItems({ available: 'false' }), // admin should manage all active items, regardless of availability
        fetchCategories(),
      ]);
      setMenuItems(items || []);
      setCategories(cats || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load menu data');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Preset lists
  const ALLERGENS_LIST = ['Nuts', 'Gluten', 'Dairy', 'Soy', 'Shellfish', 'Eggs', 'Fish'];
  const DIETARY_TAGS_LIST = [
    { key: 'V', label: 'Vegetarian' },
    { key: 'VE', label: 'Vegan' },
    { key: 'GF', label: 'Gluten-Free' },
    { key: 'H', label: 'Halal' },
  ];

  const resetItemForm = () => {
    setItemName('');
    setItemCategoryId(categories[0]?.id || '');
    setItemPrice('');
    setItemImageUrl('');
    setItemPrepTime('5');
    setSelectedAllergens([]);
    setSelectedDietaryTags([]);
    setNutritionalInfo({ calories: '', protein: '', carbohydrates: '', fat: '' });
    setItemModifiersJson('[]');
    setEditingItem(null);
  };

  const handleOpenAddModal = () => {
    resetItemForm();
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategoryId(item.categoryId);
    setItemPrice(item.price.toString());
    const nutrition = item.nutritionalInfo || {};
    setItemImageUrl(item.imageUrl || '');
    setItemPrepTime((item.prepTimeMinutes || 5).toString());
    setSelectedAllergens(item.allergens || []);
    setSelectedDietaryTags(item.dietaryTags || []);
    setNutritionalInfo({
      calories: nutrition.calories || '',
      protein: nutrition.protein_g ?? (nutrition.protein || ''),
      carbohydrates: nutrition.carbs_g ?? (nutrition.carbohydrates || ''),
      fat: nutrition.fat_g ?? (nutrition.fat || ''),
    });
    setItemModifiersJson(JSON.stringify(item.modifiers || [], null, 2));
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemName || !itemCategoryId || !itemPrice) {
      toast.error('Please fill in required fields');
      return;
    }

    let parsedModifiers = [];
    try {
      parsedModifiers = JSON.parse(itemModifiersJson);
    } catch {
      toast.error('Modifiers field must contain a valid JSON array');
      return;
    }

    const payload = {
      name: itemName,
      categoryId: itemCategoryId,
      price: parseFloat(itemPrice),
      imageUrl: itemImageUrl,
      prepTimeMinutes: parseInt(itemPrepTime, 10) || 5,
      allergens: selectedAllergens,
      dietaryTags: selectedDietaryTags,
      nutritionalInfo: {
        calories: parseInt(nutritionalInfo.calories, 10) || 0,
        protein_g: parseInt(nutritionalInfo.protein, 10) || 0,
        carbs_g: parseInt(nutritionalInfo.carbohydrates, 10) || 0,
        fat_g: parseInt(nutritionalInfo.fat, 10) || 0,
      },
      modifiers: parsedModifiers,
    };

    try {
      if (editingItem) {
        await api.put(`/admin/menu-items/${editingItem.id}`, payload);
        toast.success('Menu item updated successfully!');
      } else {
        await api.post('/admin/menu-items', payload);
        toast.success('Menu item created successfully!');
      }
      setIsItemModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save menu item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.delete(`/admin/menu-items/${id}`);
      toast.success('Menu item deleted successfully');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete menu item');
    }
  };

  const handleToggleAvailability = async (item) => {
    const nextVal = !item.isAvailable;
    // Optimistic Update
    setMenuItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, isAvailable: nextVal } : i))
    );
    try {
      await api.patch(`/admin/menu-items/${item.id}/availability`, { isAvailable: nextVal });
      toast.success(`${item.name} availability updated`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to toggle availability');
      // Rollback
      setMenuItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, isAvailable: !nextVal } : i))
      );
    }
  };

  const handleToggleDailySpecial = async (item) => {
    const nextVal = !item.isDailySpecial;
    // Optimistic Update
    setMenuItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, isDailySpecial: nextVal } : i))
    );
    try {
      await api.patch(`/admin/menu-items/${item.id}/daily-special`, { isDailySpecial: nextVal });
      toast.success(`${item.name} daily special status changed`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to toggle daily special');
      // Rollback
      setMenuItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, isDailySpecial: !nextVal } : i))
      );
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryName) return;

    const payload = {
      name: categoryName,
      icon: categoryIcon,
      displayOrder: parseInt(categoryOrder, 10) || 0,
    };

    try {
      if (editingCategory) {
        await api.put(`/admin/categories/${editingCategory.id}`, payload);
        toast.success('Category updated successfully');
      } else {
        await api.post('/admin/categories', payload);
        toast.success('Category created successfully');
      }
      setCategoryName('');
      setCategoryOrder('1');
      setEditingCategory(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save category');
    }
  };

  const handleToggleAllergen = (allergen) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen) ? prev.filter(a => a !== allergen) : [...prev, allergen]
    );
  };

  const handleToggleDietary = (tag) => {
    setSelectedDietaryTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Filter Items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategoryFilter === 'all' || item.categoryId === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-forest flex items-center gap-2">
            <Utensils size={32} />
            Menu Management
          </h2>
          <p className="text-sm text-gray-500">Configure specials, prices, availability, and allergen lists.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-forest/15 rounded-xl text-forest hover:bg-forest/5 font-bold text-sm transition"
          >
            <FolderOpen size={16} />
            Categories
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm shadow-md transition"
          >
            <Plus size={18} />
            Add Item
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-forest/10 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/20 text-sm font-medium"
          />
        </div>

        {/* Categories select */}
        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Menu Items Table */}
      <div className="bg-white border border-forest/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#FDF8F0] border-b border-forest/10 text-xs font-bold uppercase tracking-wider text-forest/75">
                <th className="px-6 py-4">Image</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Dietary Tags</th>
                <th className="px-6 py-4 text-center">Daily Special</th>
                <th className="px-6 py-4 text-center">Available</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm font-bold text-gray-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic">
                    No menu items found.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center text-forest/40">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Utensils size={18} />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-forest block font-extrabold">{item.name}</span>
                      <span className="text-[10px] text-gray-400 font-medium block">
                        Prep: {item.prepTimeMinutes ?? 5} min
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500 font-semibold">{item.categoryName}</td>
                    <td className="px-6 py-3 text-orange-600 font-black">{formatCurrency(item.price)}</td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {item.dietaryTags?.map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-forest/5 text-forest text-[10px] px-2 py-0.5 rounded font-black uppercase"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleToggleDailySpecial(item)}
                        className={`p-1.5 rounded-full hover:bg-gray-100 transition ${
                          item.isDailySpecial ? 'text-amber-500' : 'text-gray-300'
                        }`}
                      >
                        <Star size={18} fill={item.isDailySpecial ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <label className="relative inline-flex items-center cursor-pointer justify-center">
                        <input
                          type="checkbox"
                          checked={item.isAvailable}
                          onChange={() => handleToggleAvailability(item)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-forest"></div>
                      </label>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg border border-gray-200 hover:border-forest/20 text-gray-600 hover:text-forest hover:bg-forest/5 transition"
                          title="Edit item"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg border border-gray-200 hover:border-red-200 text-gray-600 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-forest/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <form onSubmit={handleSaveItem}>
              {/* Modal Header */}
              <div className="px-6 py-4 bg-forest text-cream flex justify-between items-center">
                <h3 className="text-lg font-black tracking-wide">
                  {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="text-cream/80 hover:text-white bg-white/10 p-1.5 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Item Name *</label>
                    <input
                      type="text"
                      required
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Bacon Cheeseburger"
                      className="w-full px-3 py-2 border border-gray-250 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Category *</label>
                    <select
                      required
                      value={itemCategoryId}
                      onChange={(e) => setItemCategoryId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-255 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Price (PKR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      placeholder="e.g. 7.99"
                      className="w-full px-3 py-2 border border-gray-250 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest"
                    />
                  </div>

                  {/* Image URL */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Image URL</label>
                    <input
                      type="url"
                      value={itemImageUrl}
                      onChange={(e) => setItemImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-2 border border-gray-250 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest"
                    />
                  </div>

                  {/* Prep time */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Prep Time (Minutes)</label>
                    <input
                      type="number"
                      value={itemPrepTime}
                      onChange={(e) => setItemPrepTime(e.target.value)}
                      placeholder="5"
                      className="w-full px-3 py-2 border border-gray-250 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest"
                    />
                  </div>
                </div>

                {/* Dietary Tags Checkboxes */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Dietary Profile</label>
                  <div className="flex flex-wrap gap-4 bg-gray-50 border border-gray-100 p-3 rounded-2xl">
                    {DIETARY_TAGS_LIST.map(tag => (
                      <label key={tag.key} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                        <input
                          type="checkbox"
                          checked={selectedDietaryTags.includes(tag.key)}
                          onChange={() => handleToggleDietary(tag.key)}
                          className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4 border-gray-300"
                        />
                        {tag.label} ({tag.key})
                      </label>
                    ))}
                  </div>
                </div>

                {/* Allergens Checkboxes */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Allergens (Check all that apply)</label>
                  <div className="flex flex-wrap gap-4 bg-gray-50 border border-gray-100 p-3 rounded-2xl">
                    {ALLERGENS_LIST.map(allergen => (
                      <label key={allergen} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                        <input
                          type="checkbox"
                          checked={selectedAllergens.includes(allergen)}
                          onChange={() => handleToggleAllergen(allergen)}
                          className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4 border-gray-300"
                        />
                        {allergen}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Nutrition Facts */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Nutritional Info</label>
                  <div className="grid grid-cols-4 gap-2 bg-gray-50 border border-gray-100 p-3 rounded-2xl">
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block uppercase mb-1">Calories</span>
                      <input
                        type="number"
                        placeholder="kcal"
                        value={nutritionalInfo.calories}
                        onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, calories: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-250 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block uppercase mb-1">Protein (g)</span>
                      <input
                        type="number"
                        placeholder="g"
                        value={nutritionalInfo.protein}
                        onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, protein: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-250 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block uppercase mb-1">Carbs (g)</span>
                      <input
                        type="number"
                        placeholder="g"
                        value={nutritionalInfo.carbohydrates}
                        onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, carbohydrates: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-250 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block uppercase mb-1">Fat (g)</span>
                      <input
                        type="number"
                        placeholder="g"
                        value={nutritionalInfo.fat}
                        onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, fat: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-250 rounded-lg text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Modifiers JSON */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase flex justify-between">
                    <span>Modifiers config (JSON Array)</span>
                    <span className="text-[10px] text-gray-400 font-normal">Requires valid JSON configuration</span>
                  </label>
                  <textarea
                    rows={4}
                    value={itemModifiersJson}
                    onChange={(e) => setItemModifiersJson(e.target.value)}
                    className="w-full font-mono text-xs px-3 py-2 border border-gray-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-forest hover:bg-forest-light text-cream rounded-xl font-bold text-sm shadow transition"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full border border-forest/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-forest text-cream flex justify-between items-center">
              <h3 className="text-lg font-black tracking-wide">Manage Categories</h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-cream/80 hover:text-white bg-white/10 p-1.5 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Category form */}
              <form onSubmit={handleSaveCategory} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl space-y-4">
                <h4 className="font-extrabold text-forest text-sm uppercase tracking-wide">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="e.g. Desserts"
                      className="w-full px-3 py-1.5 border border-gray-250 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Icon</label>
                      <input
                        type="text"
                        value={categoryIcon}
                        onChange={(e) => setCategoryIcon(e.target.value)}
                        placeholder="utensils"
                        className="w-full px-3 py-1.5 border border-gray-250 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Order</label>
                      <input
                        type="number"
                        value={categoryOrder}
                        onChange={(e) => setCategoryOrder(e.target.value)}
                        placeholder="1"
                        className="w-full px-3 py-1.5 border border-gray-250 rounded-lg text-xs font-semibold"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    {editingCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(null);
                          setCategoryName('');
                          setCategoryOrder('1');
                        }}
                        className="px-3 py-1.5 border border-gray-200 text-xs font-bold rounded-lg text-gray-500"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-forest text-cream font-bold text-xs rounded-lg flex items-center gap-1 shadow"
                    >
                      <Check size={12} />
                      {editingCategory ? 'Update' : 'Save'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Categories list */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-forest text-sm uppercase tracking-wide border-b pb-1">Existing Categories</h4>
                <div className="max-h-48 overflow-y-auto space-y-2 divide-y divide-gray-50">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex justify-between items-center py-2 text-sm font-bold text-gray-700">
                      <span>{cat.name} (order: {cat.displayOrder})</span>
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryName(cat.name);
                          setCategoryIcon(cat.icon || 'utensils');
                          setCategoryOrder(String(cat.displayOrder ?? 1));
                        }}
                        className="text-xs text-forest hover:text-forest-light font-black"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


