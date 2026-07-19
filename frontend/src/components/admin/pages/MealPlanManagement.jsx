import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, CreditCard } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '../../../utils/currency';
import { searchStudents, updateStudentMealPlan, overrideMealPlanCredits, bulkResetMealPlans } from '../../../services/admin';
import toast from 'react-hot-toast';

const PLAN_TYPES = [
  { name: 'Daily', duration: 1, amount: 500 },
  { name: 'Weekly', duration: 7, amount: 3000 },
  { name: 'Monthly', duration: 30, amount: 10000 },
  { name: 'Semester', duration: 40000, amount: 40000 },
];

export default function MealPlanManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null); // 'edit' or 'addCredits'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData] = useState({
    plan: 'Monthly',
    credits: 0,
  });

  const { data: studentsResponse, isLoading } = useQuery({
    queryKey: ['admin-students', search],
    queryFn: () => searchStudents(search),
  });

  const students = studentsResponse?.students || [];

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }) => updateStudentMealPlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-students']);
      toast.success('Meal plan updated');
      setShowModal(false);
    },
    onError: () => toast.error('Failed to update meal plan')
  });

  const overrideCreditsMutation = useMutation({
    mutationFn: ({ id, amount, reason }) => overrideMealPlanCredits(id, { amount, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-students']);
      toast.success('Credits added');
      setShowModal(false);
    },
    onError: () => toast.error('Failed to add credits')
  });

  const bulkResetMutation = useMutation({
    mutationFn: bulkResetMealPlans,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-students']);
      toast.success('Bulk reset successful');
    },
    onError: () => toast.error('Failed to reset plans')
  });

  const handleOpenModal = (type, student = null) => {
    setModalType(type);
    setSelectedStudent(student);
    if (type === 'edit' && student) {
      setFormData({ plan: student.plan_type || 'Monthly', credits: student.total_credits ? parseFloat(student.total_credits) : 0 });
    } else if (type === 'addCredits') {
      setFormData({ credits: 0 });
    }
    setShowModal(true);
  };

  const handleSaveChanges = () => {
    if (modalType === 'edit') {
      const planConfig = PLAN_TYPES.find(p => p.name === formData.plan);
      const expiresAt = new Date();
      if (planConfig.name === 'Semester') {
        expiresAt.setMonth(expiresAt.getMonth() + 6);
      } else {
        expiresAt.setDate(expiresAt.getDate() + planConfig.duration);
      }
      
      updatePlanMutation.mutate({
        id: selectedStudent.id,
        data: {
          planType: formData.plan,
          totalCredits: formData.credits,
          expiresAt: expiresAt.toISOString(),
        }
      });
    } else if (modalType === 'addCredits') {
      if (formData.credits <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      overrideCreditsMutation.mutate({
        id: selectedStudent.id,
        amount: formData.credits,
        reason: 'Manual Admin Top-up'
      });
    }
  };

  const handleBulkReset = () => {
    if (confirm('Reset all meal plans for the new semester? This action cannot be undone.')) {
      bulkResetMutation.mutate();
    }
  };

  const getStatusColor = (student) => {
    if (!student.plan_type) return 'bg-forest/10 text-forest';
    const expires = new Date(student.expires_at);
    const now = new Date();
    if (expires < now) return 'bg-red-100 text-red-700'; // Expired
    const daysLeft = (expires - now) / (1000 * 60 * 60 * 24);
    if (daysLeft < 7) return 'bg-amber-100 text-amber-700'; // Expiring Soon
    return 'bg-green-100 text-green-700'; // Active
  };

  const getStatusText = (student) => {
    if (!student.plan_type) return 'No Plan';
    const expires = new Date(student.expires_at);
    const now = new Date();
    if (expires < now) return 'Expired';
    const daysLeft = (expires - now) / (1000 * 60 * 60 * 24);
    if (daysLeft < 7) return 'Expiring Soon';
    return 'Active';
  };

  const totalCredits = students.reduce((acc, s) => acc + (s.total_credits ? parseFloat(s.total_credits) - parseFloat(s.used_credits || 0) : 0), 0);
  const activeCount = students.filter(s => getStatusText(s) === 'Active').length;
  const expiringCount = students.filter(s => getStatusText(s) === 'Expiring Soon').length;
  const expiredCount = students.filter(s => getStatusText(s) === 'Expired').length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-forest">Meal Plan Management</h1>
        <button
          onClick={handleBulkReset}
          disabled={bulkResetMutation.isLoading}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold disabled:opacity-50"
        >
          Bulk Reset (Semester)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
          <p className="text-green-600 font-bold text-2xl">{activeCount}</p>
          <p className="text-forest/60 text-sm">Active Plans</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-amber-500">
          <p className="text-amber-600 font-bold text-2xl">{expiringCount}</p>
          <p className="text-forest/60 text-sm">Expiring Soon</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-500">
          <p className="text-red-600 font-bold text-2xl">{expiredCount}</p>
          <p className="text-forest/60 text-sm">Expired Plans</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-orange">
          <p className="text-orange font-bold text-2xl">{formatCurrency(totalCredits)}</p>
          <p className="text-forest/60 text-sm">Total Unused Credits</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 text-forest/40" size={20} />
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-forest/10 bg-cream">
              <th className="py-3 px-4 text-left text-forest font-bold">Name</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Email</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Plan Type</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Remaining (PKR)</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Expiry Date</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Status</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" className="py-4 text-center">Loading...</td></tr>
            ) : students.map((student) => {
              const remaining = student.total_credits ? parseFloat(student.total_credits) - parseFloat(student.used_credits || 0) : 0;
              return (
                <tr key={student.id} className="border-b border-forest/5 hover:bg-cream">
                  <td className="py-3 px-4 font-bold text-forest">{student.name}</td>
                  <td className="py-3 px-4 text-forest/70">{student.email}</td>
                  <td className="py-3 px-4 text-forest/70">{student.plan_type || 'None'}</td>
                  <td className="py-3 px-4 text-orange font-bold">{formatCurrency(remaining)}</td>
                  <td className="py-3 px-4 text-forest/70">{student.expires_at ? formatDate(student.expires_at) : '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(student)}`}>
                      {getStatusText(student)}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex gap-2">
                    <button
                      onClick={() => handleOpenModal('edit', student)}
                      className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 font-bold text-sm"
                    >
                      Edit Plan
                    </button>
                    <button
                      onClick={() => handleOpenModal('addCredits', student)}
                      disabled={!student.plan_type}
                      className="px-3 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200 font-bold text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      <CreditCard size={14} />
                      Top Up
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-forest text-white p-6 border-b">
              <h2 className="text-xl font-bold">
                {modalType === 'edit' ? 'Edit Meal Plan' : 'Add Credits'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-forest font-bold">Student: {selectedStudent?.name}</p>

              {modalType === 'edit' ? (
                <>
                  <select
                    value={formData.plan}
                    onChange={(e) => {
                      const plan = e.target.value;
                      const planConfig = PLAN_TYPES.find(p => p.name === plan);
                      setFormData({ ...formData, plan, credits: planConfig.amount });
                    }}
                    className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
                  >
                    {PLAN_TYPES.map(plan => (
                      <option key={plan.name} value={plan.name}>
                        {plan.name} ({formatCurrency(plan.amount)})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="Total Credits (PKR)"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
                  />
                </>
              ) : (
                <div>
                  <label className="block text-sm text-forest/70 mb-2">Amount to Add (PKR)</label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
                  />
                  {formData.credits > 0 && (
                    <p className="mt-3 text-forest font-bold">
                      New Total Base Credits: {formatCurrency((parseFloat(selectedStudent?.total_credits) || 0) + formData.credits)}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSaveChanges}
                  disabled={updatePlanMutation.isLoading || overrideCreditsMutation.isLoading}
                  className="flex-1 bg-orange text-white font-bold py-2 rounded-lg hover:bg-orange/90 disabled:opacity-50"
                >
                  Save Changes
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
