import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, Star, Search, Filter, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '../../../utils/currency';
import { fetchMenuItems, fetchCategories } from '../../../services/menu';
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getInventory,
  getMenuItemIngredients,
  updateMenuItemIngredients,
} from '../../../services/admin';
import toast from 'react-hot-toast';


const TAGS = ['V', 'VE', 'H', 'GF'];
const DIETARY_LABELS = { 'V': 'Vegetarian', 'VE': 'Vegan', 'H': 'Halal', 'GF': 'Gluten-Free' };

export default function MenuManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', categoryId: '', price: '', tags: [], description: '',
    available: true, image: null, allergens: [], nutritionalInfo: '', modifiers: '',
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['menu-items'],
    queryFn: () => fetchMenuItems(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const createMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries(['menu-items']);
      toast.success('Item created successfully');
      setShowModal(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateMenuItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['menu-items']);
      toast.success('Item updated successfully');
      setShowModal(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries(['menu-items']);
      toast.success('Item deleted successfully');
    }
  });

  const handleOpenModal = (item = null) => {
    if (item) {
      setFormData({
        name: item.name,
        categoryId: item.category_id,
        price: item.price,
        tags: item.dietary_tags || [],
        description: item.description || '',
        available: item.is_available,
        image: null, // Usually don't re-upload unless changing
        allergens: item.allergens || [],
        nutritionalInfo: item.nutritional_info ? JSON.stringify(item.nutritional_info) : '',
        modifiers: item.modifiers ? JSON.stringify(item.modifiers, null, 2) : '',
      });
      setEditingId(item.id);
    } else {
      setFormData({
        name: '', categoryId: '', price: '', tags: [], description: '',
        available: true, image: null, allergens: [], nutritionalInfo: '', modifiers: ''
      });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const handleSaveItem = () => {
    if (!formData.name || !formData.categoryId || !formData.price) {
      toast.error('Please fill all required fields');
      return;
    }
    let parsedNutritionalInfo = {};
    let parsedModifiers = [];
    try {
      if (formData.nutritionalInfo) parsedNutritionalInfo = JSON.parse(formData.nutritionalInfo);
      if (formData.modifiers) parsedModifiers = JSON.parse(formData.modifiers);
    } catch (e) {
      toast.error('Invalid JSON for nutritional info or modifiers');
      return;
    }

    const payload = {
      name: formData.name,
      categoryId: formData.categoryId,
      price: formData.price,
      dietaryTags: formData.tags,
      description: formData.description,
      isAvailable: formData.available,
      allergens: formData.allergens,
      nutritionalInfo: parsedNutritionalInfo,
      modifiers: parsedModifiers
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDeleteItem = (id) => {
    if (confirm('Are you sure you want to delete this item? This action will be logged.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleTag = (tag) => {
    setFormData({
      ...formData,
      tags: formData.tags.includes(tag) ? formData.tags.filter(t => t !== tag) : [...formData.tags, tag]
    });
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === '' || item.category_id === filter;
    // Hide soft deleted items
    return matchesSearch && matchesFilter && item.is_active !== false;
  });

  // --- Recipe / BOM editor state ---
  const [recipeMenuItemId, setRecipeMenuItemId] = useState('');
  const [recipeMap, setRecipeMap] = useState({}); // { [ingredientId]: { ingredientId, quantityRequired } }

  const {
    data: inventoryResponse,
    isLoading: inventoryLoading,
  } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: getInventory,
    select: (d) => d?.inventory || [],
  });

  const ingredients = inventoryResponse;

  const selectedMenuItemIngredientsQuery = useQuery({
    queryKey: ['menu-item-ingredients', recipeMenuItemId],
    queryFn: () => getMenuItemIngredients(recipeMenuItemId),
    enabled: !!recipeMenuItemId,
  });

  useEffect(() => {
    const rows = selectedMenuItemIngredientsQuery.data?.data?.ingredients || [];
    const next = {};
    for (const r of rows) {
      next[r.ingredient_id] = {
        ingredientId: r.ingredient_id,
        quantityRequired: r.quantity_required,
      };
    }
    setRecipeMap(next);
  }, [selectedMenuItemIngredientsQuery.data]);

  const saveRecipeMutation = useMutation({
    mutationFn: ({ menuItemId, ingredientsPayload }) =>
      updateMenuItemIngredients(menuItemId, ingredientsPayload),
    onSuccess: () => {
      toast.success('Recipe saved');
      queryClient.invalidateQueries(['menu-item-ingredients', recipeMenuItemId]);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save recipe');
    },
  });

  const recipeList = useMemo(() => {
    return ingredients.map((ing) => {
      const current = recipeMap[ing.id];
      return {
        ingredient: ing,
        quantityRequired: current?.quantityRequired ?? '',
      };
    });
  }, [ingredients, recipeMap]);

  const handleSaveRecipe = () => {
    if (!recipeMenuItemId) {
      toast.error('Select a menu item first');
      return;
    }

    const payload = Object.values(recipeMap)
      .map((r) => ({ ingredientId: r.ingredientId, quantityRequired: r.quantityRequired }))
      .filter((r) => r.quantityRequired !== '' && Number(r.quantityRequired) > 0);

    saveRecipeMutation.mutate({ menuItemId: recipeMenuItemId, ingredientsPayload: payload });
  };

  return (
    <div className="space-y-4">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-forest">Menu Items</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-orange text-white px-4 py-2 rounded-lg hover:bg-orange/90 font-bold"
        >
          <Plus size={20} />
          Add Item
        </button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-forest/40" size={20} />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full">

          <thead>
            <tr className="border-b-2 border-forest/10 bg-cream">
              <th className="py-3 px-4 text-left text-forest font-bold">Name</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Category</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Price (PKR)</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Tags</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Available</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {itemsLoading ? (
              <tr><td colSpan="6" className="py-4 text-center">Loading...</td></tr>
            ) : filteredItems.map((item) => (
              <tr key={item.id} className="border-b border-forest/5 hover:bg-cream">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {item.is_daily_special && <Star size={16} className="text-orange fill-orange" />}
                    <span className="font-bold text-forest">{item.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-forest/70">{categories.find(c => c.id === item.category_id)?.name || 'Unknown'}</td>
                <td className="py-3 px-4 text-orange font-bold">{formatCurrency(item.price)}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1 flex-wrap">
                    {(item.dietary_tags || []).map(tag => (
                      <span key={tag} className="bg-forest/10 text-forest px-2 py-1 rounded text-xs font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.is_available ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="py-3 px-4 flex gap-2">
                  <button onClick={() => handleOpenModal(item)} className="p-2 hover:bg-forest/10 rounded-lg transition">
                    <Edit size={18} className="text-blue-600" />
                  </button>
                  <button onClick={() => handleDeleteItem(item.id)} className="p-2 hover:bg-forest/10 rounded-lg transition">
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-forest text-white p-6 flex justify-between items-center border-b">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Item Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
              />

              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Price (PKR)"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
              />

              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
                rows={2}
              />

              <div>
                <label className="block text-sm font-bold text-forest mb-2">Dietary Tags</label>
                <div className="space-y-2">
                  {TAGS.map(tag => (
                    <label key={tag} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.tags.includes(tag)}
                        onChange={() => handleToggleTag(tag)}
                        className="w-4 h-4"
                      />
                      <span className="text-forest">{tag} - {DIETARY_LABELS[tag]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-forest mb-2">Image Upload</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
                  className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-forest mb-2">Allergens (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Nuts, Dairy"
                  value={formData.allergens.join(', ')}
                  onChange={(e) => setFormData({ ...formData, allergens: e.target.value.split(',').map(s => s.trim()) })}
                  className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-forest mb-2">Nutritional Info (JSON)</label>
                <input
                  type="text"
                  placeholder='{"calories": 350}'
                  value={formData.nutritionalInfo}
                  onChange={(e) => setFormData({ ...formData, nutritionalInfo: e.target.value })}
                  className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-forest mb-2">Modifiers (JSON)</label>
                <textarea
                  placeholder='[{"name": "Size", "options": ["Small", "Large"]}]'
                  value={formData.modifiers}
                  onChange={(e) => setFormData({ ...formData, modifiers: e.target.value })}
                  className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange font-mono text-sm"
                  rows={2}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-forest font-bold">Available</span>
              </label>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSaveItem}
                  className="flex-1 bg-orange text-white font-bold py-2 rounded-lg hover:bg-orange/90"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                >
                  {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : 'Save Item'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-forest/10 text-forest font-bold py-2 rounded-lg hover:bg-forest/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
