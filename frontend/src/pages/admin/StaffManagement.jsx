import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  X,
  ToggleLeft,
  ToggleRight,
  Clock
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/currency';
import { formatDate, formatDateTime } from '../../utils/timezone';
import { socket } from '../../utils/socket';

const ROLE_COLORS = {
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  cashier: 'bg-blue-50 text-blue-700 border-blue-200',
  kitchen: 'bg-orange-50 text-orange-700 border-orange-200',
  student: 'bg-green-50 text-green-700 border-green-200',
};

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shiftModal, setShiftModal] = useState(null); // { name, staffId }
  const [shifts, setShifts] = useState([]);

  // New staff form
  const [form, setForm] = useState({ name: '', email: '', role: 'cashier', password: '' });
  const [formLoading, setFormLoading] = useState(false);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/staff');
      setStaff(res.data.data.staff || []);
    } catch (err) {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, []);

  useEffect(() => {
    socket.connect();

    const handleStaffCreated = (newStaff) => {
      setStaff(prev => {
        if (prev.some(member => member.id === newStaff?.id)) {
          return prev;
        }
        return [newStaff, ...prev];
      });
    };

    const handleStaffStatusChanged = ({ id, isActive }) => {
      setStaff(prev => prev.map(member => member.id === id ? { ...member, is_active: isActive } : member));
    };

    socket.on('staff:created', handleStaffCreated);
    socket.on('staff:status_changed', handleStaffStatusChanged);

    return () => {
      socket.off('staff:created', handleStaffCreated);
      socket.off('staff:status_changed', handleStaffStatusChanged);
      socket.disconnect();
    };
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('All fields required');
      return;
    }
    setFormLoading(true);
    try {
      const res = await api.post('/admin/staff', form);
      const createdStaff = res.data?.data?.staff;
      if (createdStaff) {
        setStaff(prev => prev.some(member => member.id === createdStaff.id) ? prev : [createdStaff, ...prev]);
      }
      toast.success('Staff member created successfully');
      setIsModalOpen(false);
      setForm({ name: '', email: '', role: 'cashier', password: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create staff');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleStatus = async (member) => {
    const nextStatus = !member.is_active;
    setStaff(prev => prev.map(s => s.id === member.id ? { ...s, is_active: nextStatus } : s));
    try {
      await api.patch(`/admin/staff/${member.id}/status`, { isActive: nextStatus });
      toast.success(`${member.name} ${nextStatus ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error('Failed to update status');
      setStaff(prev => prev.map(s => s.id === member.id ? { ...s, is_active: !nextStatus } : s));
    }
  };

  const viewShifts = async (member) => {
    setShiftModal({ name: member.name, staffId: member.id });
    try {
      const res = await api.get(`/admin/staff/${member.id}/shifts`);
      setShifts(res.data.data.shifts || []);
    } catch (err) {
      toast.error('Failed to load shifts');
      setShifts([]);
    }
  };

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-forest flex items-center gap-2">
            <Users size={32} />
            Staff Management
          </h2>
          <p className="text-sm text-gray-500">Manage users, roles, and shift histories.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm shadow-md transition"
          >
            <Plus size={18} />
            Add User
          </button>
          <button onClick={loadStaff} disabled={loading} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500">
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
            placeholder="Search staff by name, email, role..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-forest"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-forest/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#FDF8F0] border-b border-forest/10 text-xs font-bold uppercase tracking-wider text-forest/75">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm font-bold text-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading staff...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No staff members found.</td></tr>
              ) : (
                filtered.map(member => (
                  <tr key={member.id} className={`hover:bg-gray-50/50 transition ${!member.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-forest/10 rounded-full border border-forest/10 flex items-center justify-center font-black text-forest text-sm">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-forest font-extrabold">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium">{member.email}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded border font-black uppercase ${ROLE_COLORS[member.role] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 font-medium">
                      {formatDate(member.created_at)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => toggleStatus(member)} className="text-forest hover:text-orange-600 transition" title={member.is_active ? 'Deactivate' : 'Activate'}>
                        {member.is_active
                          ? <ToggleRight size={28} className="text-forest" />
                          : <ToggleLeft size={28} className="text-gray-400" />
                        }
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(member.role === 'cashier' || member.role === 'admin') && (
                        <button
                          onClick={() => viewShifts(member)}
                          className="flex items-center gap-1 mx-auto px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:border-forest/20 hover:text-forest hover:bg-forest/5 transition"
                        >
                          <Clock size={13} />
                          Shifts
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-forest/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={handleCreate}>
              <div className="px-6 py-4 bg-forest text-cream flex justify-between items-center">
                <h3 className="text-lg font-black">Add Staff Member</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-white/10 p-1.5 rounded-full hover:bg-white/20"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Full Name *</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sarah Johnson" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Email *</label>
                  <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="sarah@university.edu" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Role *</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest">
                    <option value="cashier">Cashier</option>
                    <option value="kitchen">Kitchen Staff</option>
                    <option value="admin">Admin</option>
                    <option value="student">Student</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Temp Password *</label>
                  <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Temporary password" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest" />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-sm">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-5 py-2 bg-forest hover:bg-forest-light text-cream rounded-xl font-bold text-sm shadow disabled:opacity-50">
                  {formLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift History Modal */}
      {shiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-forest/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-forest text-cream flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black">{shiftModal.name}'s Shifts</h3>
                <p className="text-xs text-cream/60">Shift history & closing summary</p>
              </div>
              <button onClick={() => { setShiftModal(null); setShifts([]); }} className="bg-white/10 p-1.5 rounded-full hover:bg-white/20"><X size={18} /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {shifts.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-6">No shift records found.</p>
              ) : (
                <div className="space-y-3">
                  {shifts.map(shift => (
                    <div key={shift.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold text-gray-600 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-forest font-extrabold">
                          {formatDateTime(shift.opened_at, { dateStyle: 'medium' })}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-black uppercase ${shift.status === 'open' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {shift.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div><span className="text-gray-400 block">Open</span>{formatDateTime(shift.opened_at, { timeStyle: 'short' })}</div>
                        <div><span className="text-gray-400 block">Close</span>{shift.closed_at ? formatDateTime(shift.closed_at, { timeStyle: 'short' }) : '—'}</div>
                        <div><span className="text-gray-400 block">Sales</span><span className="text-orange-600">{formatCurrency(shift.total_sales)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


