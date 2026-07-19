import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/currency';
import { formatDateTime } from '../../utils/timezone';

const COLORS = ['#1B4332', '#E76F00', '#2D6A4F', '#D97706', '#475569', '#059669'];

const PAYMENT_LABELS = {
  meal_plan: 'Meal Plan',
  campus_wallet: 'Campus Wallet',
  card: 'Card',
  cash: 'Cash',
  qr_upi: 'QR / UPI',
};

const DATE_PRESETS = [
  { label: 'Today', getValue: () => {
    const t = new Date().toISOString().split('T')[0];
    return { from: t, to: t };
  }},
  { label: 'This Week', getValue: () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { from: start.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
  }},
  { label: 'This Month', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
  }},
];

export default function ReportsAnalytics() {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState(() => DATE_PRESETS[1].getValue());
  const [salesData, setSalesData] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [staffData, setStaffData] = useState({ staff: [], shifts: [] });
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [salesRes, topRes, staffRes] = await Promise.all([
        api.get(`/admin/reports/sales?from=${dateRange.from}&to=${dateRange.to}T23:59:59`),
        api.get('/admin/reports/top-items?limit=10'),
        api.get('/admin/reports/staff'),
      ]);
      setSalesData(salesRes.data.data);
      setTopItems(topRes.data.data.items || []);
      setStaffData(staffRes.data.data || { staff: [], shifts: [] });
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [dateRange]);

  const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) { toast.error('No data to export'); return; }
    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${dateRange.from}_to_${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename}.csv downloaded`);
  };

  const tabs = [
    { key: 'sales', label: 'Sales Summary', icon: DollarSign },
    { key: 'items', label: 'Top Items', icon: ShoppingBag },
    { key: 'staff', label: 'Staff Performance', icon: Users },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-forest flex items-center gap-2">
            <BarChart3 size={32} />
            Reports & Analytics
          </h2>
          <p className="text-sm text-gray-500">Revenue breakdowns, top items, and staff performance.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'sales' && salesData && (
            <button
              onClick={() => downloadCSV(salesData.byCategory, 'sales_by_category')}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-forest/15 rounded-xl text-forest hover:bg-forest/5 font-bold text-sm transition"
            >
              <Download size={16} />
              Export CSV
            </button>
          )}
          {activeTab === 'items' && (
            <button
              onClick={() => downloadCSV(topItems, 'top_items')}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-forest/15 rounded-xl text-forest hover:bg-forest/5 font-bold text-sm transition"
            >
              <Download size={16} />
              Export CSV
            </button>
          )}
          {activeTab === 'staff' && (
            <button
              onClick={() => downloadCSV(staffData.staff, 'staff_performance')}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-forest/15 rounded-xl text-forest hover:bg-forest/5 font-bold text-sm transition"
            >
              <Download size={16} />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="bg-white border border-forest/10 rounded-2xl p-4 shadow-sm flex flex-wrap gap-4 items-center">
        <Calendar size={18} className="text-forest" />
        <div className="flex gap-2 flex-wrap">
          {DATE_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => setDateRange(preset.getValue())}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition border ${
                JSON.stringify(dateRange) === JSON.stringify(preset.getValue())
                  ? 'bg-forest text-cream border-forest'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={dateRange.from}
            onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 border border-gray-200 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
              activeTab === tab.key
                ? 'bg-white text-forest shadow-sm border border-forest/10'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-forest font-bold">Loading report data...</div>
      ) : (
        <>
          {/* ---- SALES SUMMARY TAB ---- */}
          {activeTab === 'sales' && salesData && (
            <div className="space-y-8">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white border border-forest/10 p-5 rounded-2xl shadow-sm">
                  <span className="text-xs text-gray-400 font-bold uppercase">Total Revenue</span>
                  <p className="text-3xl font-black text-forest mt-1">{formatCurrency(salesData.summary.totalRevenue)}</p>
                </div>
                <div className="bg-white border border-forest/10 p-5 rounded-2xl shadow-sm">
                  <span className="text-xs text-gray-400 font-bold uppercase">Total Orders</span>
                  <p className="text-3xl font-black text-forest mt-1">{salesData.summary.totalOrders}</p>
                </div>
                <div className="bg-white border border-forest/10 p-5 rounded-2xl shadow-sm">
                  <span className="text-xs text-gray-400 font-bold uppercase">Avg Order Value</span>
                  <p className="text-3xl font-black text-forest mt-1">{formatCurrency(salesData.summary.avgOrderValue)}</p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* By Category Bar */}
                <div className="bg-white border border-forest/10 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-extrabold text-forest text-sm mb-4 uppercase tracking-wider">Revenue by Category</h3>
                  {salesData.byCategory.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-8 text-center">No data for selected range.</p>
                  ) : (
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesData.byCategory}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={v => formatCurrency(v)} />
                          <Bar dataKey="revenue" fill="#1B4332" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Payment Method Pie */}
                <div className="bg-white border border-forest/10 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-extrabold text-forest text-sm mb-4 uppercase tracking-wider">Revenue by Payment Method</h3>
                  {salesData.byPayment.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-8 text-center">No payment data for selected range.</p>
                  ) : (
                    <div className="h-60 flex items-center gap-6">
                      <div className="flex-1 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={salesData.byPayment} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="revenue">
                              {salesData.byPayment.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={v => formatCurrency(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 shrink-0">
                        {salesData.byPayment.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs font-bold text-gray-700">
                            <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                            {PAYMENT_LABELS[p.method] || p.method}: <span className="text-forest">{formatCurrency(p.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hourly Table */}
              {salesData.hourly.length > 0 && (
                <div className="bg-white border border-forest/10 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-extrabold text-forest text-sm mb-4 uppercase tracking-wider">Hourly Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-xs font-bold uppercase tracking-wider text-forest/75 border-b border-gray-100">
                          <th className="py-3 px-4 text-left">Hour</th>
                          <th className="py-3 px-4 text-right">Orders</th>
                          <th className="py-3 px-4 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {salesData.hourly.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-2.5 px-4 font-bold text-forest">{row.hour}:00</td>
                            <td className="py-2.5 px-4 text-right font-semibold text-gray-600">{row.orders}</td>
                            <td className="py-2.5 px-4 text-right font-black text-orange-600">{formatCurrency(row.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- TOP ITEMS TAB ---- */}
          {activeTab === 'items' && (
            <div className="bg-white border border-forest/10 rounded-2xl shadow-sm overflow-hidden">
              {topItems.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <ShoppingBag size={48} className="mx-auto mb-2 stroke-1" />
                  <p className="font-bold">No item sales data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#FDF8F0] text-xs font-bold uppercase tracking-wider text-forest/75 border-b border-forest/10">
                        <th className="px-6 py-4 text-left">#</th>
                        <th className="px-6 py-4 text-left">Item Name</th>
                        <th className="px-6 py-4 text-right">Qty Sold</th>
                        <th className="px-6 py-4 text-right">Revenue Generated</th>
                        <th className="px-6 py-4 text-left">Visual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {topItems.map((item, i) => {
                        const maxQty = topItems[0]?.quantitySold || 1;
                        const pct = (item.quantitySold / maxQty) * 100;
                        return (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4 text-gray-400 font-bold text-sm">#{i + 1}</td>
                            <td className="px-6 py-4 font-extrabold text-forest">{item.name}</td>
                            <td className="px-6 py-4 text-right font-black text-gray-700">{item.quantitySold}</td>
                            <td className="px-6 py-4 text-right font-black text-orange-600">{formatCurrency(item.revenue)}</td>
                            <td className="px-6 py-4 w-40">
                              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-forest rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ---- STAFF PERFORMANCE TAB ---- */}
          {activeTab === 'staff' && (
            <div className="space-y-8">
              {/* Staff Summary Table */}
              <div className="bg-white border border-forest/10 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-[#FDF8F0]">
                  <h3 className="font-extrabold text-forest text-sm uppercase tracking-wider">Cashier Performance</h3>
                </div>
                {staffData.staff.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-10 text-center">No cashier data recorded.</p>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-wider text-forest/75 border-b border-gray-100">
                        <th className="px-6 py-3 text-left">Cashier</th>
                        <th className="px-6 py-3 text-right">Orders Processed</th>
                        <th className="px-6 py-3 text-right">Total Revenue</th>
                        <th className="px-6 py-3 text-right">Avg / Order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {staffData.staff.map((s, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-extrabold text-forest">{s.cashierName}</td>
                          <td className="px-6 py-4 text-right font-black text-gray-700">{s.ordersProcessed}</td>
                          <td className="px-6 py-4 text-right font-black text-orange-600">{formatCurrency(s.totalRevenue)}</td>
                          <td className="px-6 py-4 text-right font-bold text-gray-500">
                            {formatCurrency(s.ordersProcessed > 0 ? s.totalRevenue / s.ordersProcessed : 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Shifts Table */}
              <div className="bg-white border border-forest/10 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-[#FDF8F0]">
                  <h3 className="font-extrabold text-forest text-sm uppercase tracking-wider">Shift History</h3>
                </div>
                {staffData.shifts.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-10 text-center">No shift data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="text-xs font-bold uppercase tracking-wider text-forest/75 border-b border-gray-100">
                          <th className="px-6 py-3 text-left">Cashier</th>
                          <th className="px-6 py-3 text-left">Opened</th>
                          <th className="px-6 py-3 text-left">Closed</th>
                          <th className="px-6 py-3 text-right">Opening Cash</th>
                          <th className="px-6 py-3 text-right">Total Sales</th>
                          <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {staffData.shifts.map((s, i) => (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="px-6 py-3.5 font-bold text-forest">{s.cashierName}</td>
                            <td className="px-6 py-3.5 text-xs text-gray-500 font-medium">
                              {formatDateTime(s.openedAt, { dateStyle: 'medium', timeStyle: 'short' })}
                            </td>
                            <td className="px-6 py-3.5 text-xs text-gray-500 font-medium">
                              {s.closedAt ? formatDateTime(s.closedAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                            </td>
                            <td className="px-6 py-3.5 text-right font-bold text-gray-600">{formatCurrency(s.openingCash)}</td>
                            <td className="px-6 py-3.5 text-right font-black text-orange-600">{formatCurrency(s.totalSales)}</td>
                            <td className="px-6 py-3.5 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-black uppercase ${
                                s.status === 'open' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                              }`}>
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


