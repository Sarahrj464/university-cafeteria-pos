import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Edit2,
  X,
  Plus,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/timezone';

const PLAN_TYPES = [
  { value: 'unlimited', label: 'Unlimited Meal Plan' },
  { value: '14_meal', label: '14-Meal Plan' },
  { value: '7_meal', label: '7-Meal Plan' },
  { value: 'block_50', label: 'Block 50 Plan' },
  { value: 'dining_dollars', label: 'PKR Balance Plan' },
];

function PlanBadge({ type }) {
  const colors = {
    unlimited: 'bg-purple-50 text-purple-700 border-purple-200',
    '14_meal': 'bg-blue-50 text-blue-700 border-blue-200',
    '7_meal': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    block_50: 'bg-amber-50 text-amber-700 border-amber-200',
    dining_dollars: 'bg-green-50 text-green-700 border-green-200',
  };
  const label = PLAN_TYPES.find(p => p.value === type)?.label || type;
  return <span className={`text-[10px] px-2 py-0.5 rounded border font-black uppercase ${colors[type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>{label}</span>;
}

export default function MealPlanManagement() {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editModal, setEditModal] = useState(null); // student object
  const [creditModal, setCreditModal] = useState(null); // { id, name }
  const [resetConfirm, setResetConfirm] = useState(false);

  // Edit plan form
  const [editForm, setEditForm] = useState({ planType: '', totalCredits: '', expiresAt: '' });
  // Credit override form
  const [creditForm, setCreditForm] = useState({ amount: '', reason: '' });

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/students?search=${encodeURIComponent(searchQuery)}`);
      setStudents(res.data.data.students || []);
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadStudents, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => { loadStudents(); }, []);

  const handleEditPlan = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/students/${editModal.id}/meal-plan`, {
        planType: editForm.planType,
        totalCredits: parseFloat(editForm.totalCredits),
        expiresAt: editForm.expiresAt,
      });
      toast.success(`Meal plan updated for ${editModal.name}`);
      setEditModal(null);
      loadStudents();
    } catch (err) {
      toast.error('Failed to update meal plan');
    }
  };

  const handleCreditOverride = async (e) => {
    e.preventDefault();
    if (!creditForm.amount || !creditForm.reason) { toast.error('Amount and reason required'); return; }
    try {
      await api.post(`/admin/students/${creditModal.id}/meal-plan/override`, {
        amount: parseFloat(creditForm.amount),
        reason: creditForm.reason,
      });
      toast.success(`Credits updated for ${creditModal.name}`);
      setCreditModal(null);
      setCreditForm({ amount: '', reason: '' });
      loadStudents();
    } catch (err) {
      toast.error('Failed to override credits');
    }
  };

  const handleBulkReset = async () => {
    try {
      await api.post('/admin/meal-plans/reset');
      toast.success('Bulk semester reset complete — all used credits cleared');
      setResetConfirm(false);
      loadStudents();
    } catch (err) {
      toast.error('Bulk reset failed');
    }
  };

  const openEdit = (student) => {
    setEditModal(student);
    setEditForm({
      planType: student.plan_type || '14_meal',
      totalCredits: student.total_credits || '',
      expiresAt: student.expires_at ? student.expires_at.split('T')[0] : '',
    });
  };

  const getUsedPct = (s) => {
    const total = parseFloat(s.total_credits || 0);
    const used = parseFloat(s.used_credits || 0);
    if (total <= 0) return 0;
    return Math.min(Math.round((used / total) * 100), 100);
  };

  const getRemainingText = (student) => {
    const remaining = parseFloat(student.remaining_credits ?? 0);
    if (student.plan_type === 'unlimited') {
      return 'Unlimited';
    }
    if (student.plan_type?.endsWith('_meal')) {
      return `${Number.isInteger(remaining) ? remaining : remaining.toFixed(0)} Meals Remaining`;
    }
    if (student.plan_type === 'dining_dollars') {
      return formatCurrency(remaining);
    }
    if (student.plan_type) {
      return formatCurrency(remaining);
    }
    return '-';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-forest flex items-center gap-2">
            <CreditCard size={32} />
            Meal Plan Management
          </h2>
          <p className="text-sm text-gray-500">Search students, view and edit meal plans, add credits, and reset semester.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setResetConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-sm transition"
          >
            <RotateCcw size={16} />
            Semester Reset
          </button>
          <button onClick={loadStudents} disabled={loading} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-forest/10 p-4 rounded-2xl shadow-sm">
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, ID, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-forest"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-20 text-forest font-bold">Searching students...</div>
        ) : students.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <CreditCard size={48} className="mx-auto mb-2 stroke-1" />
            <p className="font-bold">No students found</p>
            <p className="text-sm">Try searching by name, student ID, or email.</p>
          </div>
        ) : (
          students.map(student => {
            const expanded = expandedId === student.id;
            const usedPct = getUsedPct(student);
            const hasPlan = !!student.plan_type;

            return (
              <div key={student.id} className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
                <div
                  className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer hover:bg-gray-50/50"
                  onClick={() => setExpandedId(prev => prev === student.id ? null : student.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-forest/10 rounded-full border border-forest/10 flex items-center justify-center font-black text-forest">
                      {student.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-extrabold text-forest">{student.name}</p>
                      <p className="text-xs text-gray-400 font-medium">{student.student_id || student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {hasPlan ? (
                      <>
                        <div className="text-right hidden sm:block">
                          <span className="text-xs text-gray-400 font-bold block">Remaining</span>
                          <span className="font-black text-orange-600">{getRemainingText(student)}</span>
                        </div>
                        <PlanBadge type={student.plan_type} />
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No plan</span>
                    )}
                    {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-gray-100 bg-[#FDF8F0]/30 px-6 py-5 space-y-5">
                    {hasPlan ? (
                      <>
                        {/* Usage Bar */}
                        <div>
                          <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
                            <span>Credits Used: {formatCurrency(student.used_credits)} / {formatCurrency(student.total_credits)}</span>
                            <span>{usedPct}%</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${usedPct >= 90 ? 'bg-red-500' : usedPct >= 70 ? 'bg-amber-500' : 'bg-forest'}`}
                              style={{ width: `${usedPct}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 font-bold">
                          <span className="text-gray-400">Expires:</span>{' '}
                          {student.expires_at ? formatDate(student.expires_at) : 'N/A'}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 italic">This student has no active meal plan. Use Edit to create one.</p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(student); }}
                        className="flex items-center gap-1.5 px-4 py-2 border border-forest/15 bg-white hover:bg-forest/5 text-forest font-bold text-xs rounded-xl transition"
                      >
                        <Edit2 size={13} />
                        {hasPlan ? 'Edit Plan' : 'Create Plan'}
                      </button>
                      {hasPlan && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setCreditModal({ id: student.id, name: student.name }); }}
                          className="flex items-center gap-1.5 px-4 py-2 border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs rounded-xl transition"
                        >
                          <Plus size={13} />
                          Add Credits
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Plan Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-forest/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <form onSubmit={handleEditPlan}>
              <div className="px-6 py-4 bg-forest text-cream flex justify-between items-center">
                <h3 className="text-lg font-black">Edit Meal Plan — {editModal.name}</h3>
                <button type="button" onClick={() => setEditModal(null)} className="bg-white/10 p-1.5 rounded-full"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Plan Type</label>
                  <select value={editForm.planType} onChange={e => setEditForm({ ...editForm, planType: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest">
                    {PLAN_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Total Credits (PKR)</label>
                  <input type="number" step="0.01" value={editForm.totalCredits} onChange={e => setEditForm({ ...editForm, totalCredits: e.target.value })} placeholder="500.00" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Expiry Date</label>
                  <input type="date" value={editForm.expiresAt} onChange={e => setEditForm({ ...editForm, expiresAt: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest" />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setEditModal(null)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-forest hover:bg-forest-light text-cream rounded-xl font-bold text-sm shadow">Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Credits Modal */}
      {creditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-orange-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <form onSubmit={handleCreditOverride}>
              <div className="px-6 py-4 bg-orange-600 text-white flex justify-between items-center">
                <h3 className="text-lg font-black">Add Credits — {creditModal.name}</h3>
                <button type="button" onClick={() => setCreditModal(null)} className="bg-white/20 p-1.5 rounded-full"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Credit Amount (PKR) *</label>
                  <input type="number" step="0.01" required value={creditForm.amount} onChange={e => setCreditForm({ ...creditForm, amount: e.target.value })} placeholder="e.g. 50.00" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Reason *</label>
                  <input type="text" required value={creditForm.reason} onChange={e => setCreditForm({ ...creditForm, reason: e.target.value })} placeholder="e.g. Scholarship top-up, Refund credit" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400" />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setCreditModal(null)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm shadow">Add Credits</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Semester Reset Confirm Modal */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-red-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-red-600 text-white flex justify-between items-center">
              <h3 className="text-lg font-black">⚠ Semester Reset</h3>
              <button onClick={() => setResetConfirm(false)} className="bg-white/20 p-1.5 rounded-full"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-700 text-sm">This will reset used credits to PKR 0 for ALL students.</p>
                  <p className="text-xs text-red-500 mt-1">It also extends all plan expiry dates by 120 days. This action is logged in audit trails.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-2">
              <button onClick={() => setResetConfirm(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm">Cancel</button>
              <button onClick={handleBulkReset} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm shadow">Confirm Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



