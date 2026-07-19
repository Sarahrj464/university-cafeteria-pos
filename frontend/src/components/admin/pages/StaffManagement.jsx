import React, { useState } from 'react';
import { Plus, Search, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStaffList, createStaff, toggleStaffStatus } from '../../../services/admin';
import toast from 'react-hot-toast';
import { formatDate } from '../../../utils/timezone';

const ROLES = ['cashier', 'kitchen', 'manager', 'admin'];

export default function StaffManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier',
  });

  const { data: staffResponse, isLoading } = useQuery({
    queryKey: ['admin-staff-list'],
    queryFn: getStaffList,
  });
  
  const staff = staffResponse?.staff || [];

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-staff-list']);
      toast.success('Staff created successfully');
      setShowModal(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create staff');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }) => toggleStaffStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-staff-list']);
      toast.success('Staff status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    }
  });

  const handleOpenModal = () => {
    setFormData({ name: '', email: '', password: '', role: 'cashier' });
    setShowModal(true);
  };

  const handleSaveUser = () => {
    if (!formData.name || !formData.email || !formData.role || !formData.password) {
      toast.error('Please fill all fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleToggleStatus = (id, currentStatus) => {
    toggleStatusMutation.mutate({ id, isActive: !currentStatus });
  };

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-forest">Staff Management</h1>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-orange text-white px-4 py-2 rounded-lg hover:bg-orange/90 font-bold"
        >
          <Plus size={20} />
          Add Staff
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
          <p className="text-green-600 font-bold text-2xl">{staff.filter(s => s.is_active).length}</p>
          <p className="text-forest/60 text-sm">Active Staff</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-orange">
          <p className="text-orange font-bold text-2xl">{staff.filter(s => s.role === 'cashier').length}</p>
          <p className="text-forest/60 text-sm">Cashiers</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-forest">
          <p className="text-forest font-bold text-2xl">{staff.filter(s => s.role === 'kitchen').length}</p>
          <p className="text-forest/60 text-sm">Kitchen Staff</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-forest/40" size={20} />
        <input
          type="text"
          placeholder="Search staff by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-forest/10 bg-cream">
              <th className="py-3 px-4 text-left text-forest font-bold">Name</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Email</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Role</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Status</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Joined</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="6" className="py-4 text-center">Loading...</td></tr>
            ) : filteredStaff.map((member) => (
              <tr key={member.id} className="border-b border-forest/5 hover:bg-cream">
                <td className="py-3 px-4 font-bold text-forest">{member.name}</td>
                <td className="py-3 px-4 text-forest/70">{member.email}</td>
                <td className="py-3 px-4">
                  <span className="bg-forest/10 text-forest px-3 py-1 rounded-full text-sm font-bold capitalize">
                    {member.role}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 w-fit ${
                    member.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {member.is_active ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4 flex items-center gap-1 text-forest/60 text-sm">
                  <Clock size={16} />
                  {formatDate(member.created_at)}
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleToggleStatus(member.id, member.is_active)}
                    disabled={toggleStatusMutation.isLoading}
                    className={`px-3 py-1 rounded font-bold text-sm ${
                      member.is_active 
                        ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {member.is_active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-forest text-white p-6 border-b">
              <h2 className="text-xl font-bold">Add New Staff</h2>
            </div>

            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
              />

              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
              />
              
              <input
                type="password"
                placeholder="Temporary Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
              />

              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange capitalize"
              >
                {ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSaveUser}
                  disabled={createMutation.isLoading}
                  className="flex-1 bg-orange text-white font-bold py-2 rounded-lg hover:bg-orange/90 disabled:opacity-50"
                >
                  Create Staff
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
