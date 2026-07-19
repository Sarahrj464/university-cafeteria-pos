import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Upload,
  Save,
  X,
  Edit2,
  Plus
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDateTime } from '../../utils/timezone';

function getStatus(current, threshold) {
  const pct = current / threshold;
  if (pct <= 0.5) return 'CRITICAL';
  if (pct <= 1) return 'LOW';
  return 'OK';
}

function StatusBadge({ current, threshold }) {
  const status = getStatus(current, threshold);
  const styles = {
    OK: 'bg-green-50 text-green-700 border-green-200',
    LOW: 'bg-amber-50 text-amber-700 border-amber-200',
    CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  };
  const icons = {
    OK: <CheckCircle size={12} />,
    LOW: <AlertTriangle size={12} />,
    CRITICAL: <AlertTriangle size={12} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded border font-black uppercase ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
}

export default function InventoryManagement() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ currentStock: '', lowStockThreshold: '', unit: '' });
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRow, setNewRow] = useState({ ingredient_name: '', current_stock: '', unit: 'kg', low_stock_threshold: '' });
  const csvInputRef = useRef();

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/inventory');
      setInventory(res.data.data.inventory || []);
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const runAlertCheck = async () => {
    try {
      const res = await api.get('/admin/inventory/alerts');
      const alerts = res.data.data.alerts || [];
      if (alerts.length === 0) {
        toast.success('All inventory levels are healthy!');
      } else {
        toast.error(`⚠ ${alerts.length} item(s) are below threshold — check console for email simulation.`);
      }
    } catch (err) {
      toast.error('Alert check failed');
    }
  };

  useEffect(() => { loadInventory(); }, []);

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditValues({
      currentStock: item.current_stock,
      lowStockThreshold: item.low_stock_threshold,
      unit: item.unit,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ currentStock: '', lowStockThreshold: '', unit: '' });
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/admin/inventory/${id}`, {
        currentStock: parseFloat(editValues.currentStock),
        lowStockThreshold: parseFloat(editValues.lowStockThreshold),
        unit: editValues.unit,
      });
      toast.success('Inventory updated');
      cancelEdit();
      loadInventory();
    } catch (err) {
      toast.error('Failed to save changes');
    }
  };

  const handleAddRow = async () => {
    if (!newRow.ingredient_name || !newRow.current_stock || !newRow.low_stock_threshold) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      await api.post('/admin/inventory/bulk', {
        ingredients: [{
          ingredient_name: newRow.ingredient_name,
          current_stock: parseFloat(newRow.current_stock),
          unit: newRow.unit,
          low_stock_threshold: parseFloat(newRow.low_stock_threshold),
        }]
      });
      toast.success('Ingredient added');
      setShowAddRow(false);
      setNewRow({ ingredient_name: '', current_stock: '', unit: 'kg', low_stock_threshold: '' });
      loadInventory();
    } catch (err) {
      toast.error('Failed to add ingredient');
    }
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const ingredients = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i]?.trim(); });
        return {
          ingredient_name: obj['ingredient_name'] || obj['name'],
          current_stock: parseFloat(obj['current_stock'] || obj['stock']),
          unit: obj['unit'] || 'kg',
          low_stock_threshold: parseFloat(obj['low_stock_threshold'] || obj['threshold']),
        };
      }).filter(i => i.ingredient_name && !isNaN(i.current_stock));

      if (ingredients.length === 0) {
        toast.error('No valid rows found in CSV. Expected: ingredient_name, current_stock, unit, low_stock_threshold');
        return;
      }

      try {
        await api.post('/admin/inventory/bulk', { ingredients });
        toast.success(`${ingredients.length} ingredient(s) imported from CSV`);
        loadInventory();
      } catch (err) {
        toast.error('CSV import failed');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const criticalCount = inventory.filter(i => getStatus(i.current_stock, i.low_stock_threshold) === 'CRITICAL').length;
  const lowCount = inventory.filter(i => getStatus(i.current_stock, i.low_stock_threshold) === 'LOW').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-forest flex items-center gap-2">
            <Layers size={32} />
            Inventory Management
          </h2>
          <p className="text-sm text-gray-500">Track ingredient levels, set thresholds, and get low-stock alerts.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runAlertCheck}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-bold text-sm transition"
          >
            <AlertTriangle size={16} />
            Run Alert Check
          </button>
          <button
            onClick={() => csvInputRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-forest/15 bg-white hover:bg-forest/5 text-forest rounded-xl font-bold text-sm transition"
          >
            <Upload size={16} />
            Import CSV
          </button>
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <button
            onClick={() => setShowAddRow(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm shadow-md transition"
          >
            <Plus size={18} />
            Add Item
          </button>
          <button
            onClick={loadInventory}
            disabled={loading}
            className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-forest/10 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-green-500/10 p-3 rounded-xl text-green-600"><CheckCircle size={22} /></div>
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase block">OK Items</span>
            <span className="text-2xl font-black text-green-600">{inventory.length - criticalCount - lowCount}</span>
          </div>
        </div>
        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-600"><AlertTriangle size={22} /></div>
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase block">Low Stock</span>
            <span className="text-2xl font-black text-amber-600">{lowCount}</span>
          </div>
        </div>
        <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-red-500/10 p-3 rounded-xl text-red-600"><AlertTriangle size={22} /></div>
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase block">Critical</span>
            <span className="text-2xl font-black text-red-600">{criticalCount}</span>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-forest/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#FDF8F0] border-b border-forest/10 text-xs font-bold uppercase tracking-wider text-forest/75">
                <th className="px-6 py-4">Ingredient</th>
                <th className="px-6 py-4">Current Stock</th>
                <th className="px-6 py-4">Unit</th>
                <th className="px-6 py-4">Low Threshold</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm font-bold text-gray-700">
              {/* Add Row */}
              {showAddRow && (
                <tr className="bg-orange-50/50">
                  <td className="px-4 py-3">
                    <input
                      autoFocus
                      type="text"
                      value={newRow.ingredient_name}
                      onChange={e => setNewRow({ ...newRow, ingredient_name: e.target.value })}
                      placeholder="e.g. Tomatoes"
                      className="w-full px-2 py-1.5 border border-orange-300 rounded-lg text-xs font-semibold focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={newRow.current_stock}
                      onChange={e => setNewRow({ ...newRow, current_stock: e.target.value })}
                      placeholder="100"
                      className="w-24 px-2 py-1.5 border border-orange-300 rounded-lg text-xs font-semibold focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={newRow.unit}
                      onChange={e => setNewRow({ ...newRow, unit: e.target.value })}
                      className="px-2 py-1.5 border border-orange-300 rounded-lg text-xs font-semibold"
                    >
                      {['kg', 'g', 'L', 'mL', 'pcs', 'boxes', 'bags'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={newRow.low_stock_threshold}
                      onChange={e => setNewRow({ ...newRow, low_stock_threshold: e.target.value })}
                      placeholder="20"
                      className="w-24 px-2 py-1.5 border border-orange-300 rounded-lg text-xs font-semibold focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-400 italic text-xs">—</td>
                  <td className="px-4 py-3 text-gray-400 italic text-xs">—</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={handleAddRow} className="p-1.5 bg-forest text-white rounded-lg hover:bg-forest-light transition"><Save size={14} /></button>
                      <button onClick={() => setShowAddRow(false)} className="p-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-100 transition"><X size={14} /></button>
                    </div>
                  </td>
                </tr>
              )}

              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading inventory...</td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                    No inventory items found. Run migrations or import a CSV to get started.
                  </td>
                </tr>
              ) : (
                inventory.map(item => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50/50 transition ${
                      getStatus(item.current_stock, item.low_stock_threshold) === 'CRITICAL'
                        ? 'bg-red-50/30'
                        : getStatus(item.current_stock, item.low_stock_threshold) === 'LOW'
                        ? 'bg-amber-50/30'
                        : ''
                    }`}
                  >
                    <td className="px-6 py-4 font-extrabold text-forest">{item.ingredient_name}</td>

                    {editingId === item.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={editValues.currentStock}
                            onChange={e => setEditValues({ ...editValues, currentStock: e.target.value })}
                            className="w-24 px-2 py-1.5 border border-forest rounded-lg text-xs font-semibold focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={editValues.unit}
                            onChange={e => setEditValues({ ...editValues, unit: e.target.value })}
                            className="px-2 py-1.5 border border-forest rounded-lg text-xs font-semibold"
                          >
                            {['kg', 'g', 'L', 'mL', 'pcs', 'boxes', 'bags'].map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={editValues.lowStockThreshold}
                            onChange={e => setEditValues({ ...editValues, lowStockThreshold: e.target.value })}
                            className="w-24 px-2 py-1.5 border border-forest rounded-lg text-xs font-semibold focus:outline-none"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4">{parseFloat(item.current_stock).toFixed(1)}</td>
                        <td className="px-6 py-4 text-gray-500">{item.unit}</td>
                        <td className="px-6 py-4 text-gray-500">{parseFloat(item.low_stock_threshold).toFixed(1)} {item.unit}</td>
                      </>
                    )}

                    <td className="px-6 py-4">
                      <StatusBadge current={parseFloat(item.current_stock)} threshold={parseFloat(item.low_stock_threshold)} />
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 font-medium">
                      {formatDateTime(item.last_updated)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingId === item.id ? (
                        <div className="flex justify-center gap-1">
                          <button onClick={() => saveEdit(item.id)} className="p-1.5 bg-forest text-white rounded-lg hover:bg-forest-light transition"><Save size={14} /></button>
                          <button onClick={cancelEdit} className="p-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-100 transition"><X size={14} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1.5 rounded-lg border border-gray-200 hover:border-forest/20 text-gray-600 hover:text-forest hover:bg-forest/5 transition"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* CSV Format hint */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 font-medium">
          <strong>CSV Format:</strong> ingredient_name, current_stock, unit, low_stock_threshold (first row = headers)
        </div>
      </div>
    </div>
  );
}
