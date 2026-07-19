import React, { useState, useMemo } from 'react';
import { Download, Calendar, BarChart as BarChartIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../../../utils/currency';
import { getSalesReport, getStaffReport, getTopItemsReport } from '../../../services/admin';

export default function ReportsAnalytics() {
  const [dateRange, setDateRange] = useState('week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const dateParams = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (dateRange === 'week') {
      start.setDate(start.getDate() - 6);
    } else if (dateRange === 'month') {
      start.setDate(start.getDate() - 29);
    } else if (dateRange === 'custom') {
      if (customFrom) {
        const cFrom = new Date(customFrom);
        cFrom.setHours(0, 0, 0, 0);
        return { from: cFrom.toISOString(), to: customTo ? new Date(customTo).toISOString() : end.toISOString() };
      }
    }
    return { from: start.toISOString(), to: end.toISOString() };
  }, [dateRange, customFrom, customTo]);

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['admin-sales-report', dateParams.from, dateParams.to],
    queryFn: () => getSalesReport(dateParams.from, dateParams.to),
  });

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['admin-staff-report'],
    queryFn: getStaffReport,
  });

  const { data: topItemsData, isLoading: topItemsLoading } = useQuery({
    queryKey: ['admin-top-items-report'],
    queryFn: () => getTopItemsReport(10), // Limit 10
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg border border-forest/20 shadow-lg">
          <p className="text-forest font-bold">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const handleExportCSV = () => {
    alert('CSV export functionality would be implemented here');
  };

  const handleExportPDF = () => {
    alert('PDF export functionality would be implemented here');
  };

  if (salesLoading || staffLoading || topItemsLoading) {
    return <div className="p-8 text-center text-forest">Loading reports...</div>;
  }

  const totalRevenue = salesData?.summary?.totalRevenue || 0;
  const totalOrders = salesData?.summary?.totalOrders || 0;
  const avgOrderValue = salesData?.summary?.avgOrderValue || 0;

  const COLORS = ['#1B4332', '#E76F00', '#2D6A4F', '#D97706', '#8B5CF6', '#3B82F6', '#EC4899'];
  const revenueByCategory = salesData?.byCategory?.map((cat, idx) => ({
    name: cat.category,
    revenue: cat.revenue,
    color: COLORS[idx % COLORS.length],
  })) || [];

  const dailySales = salesData?.daily?.map(d => ({
    date: d.date,
    revenue: d.revenue,
    orders: d.orders,
  })) || [];

  const topItems = topItemsData?.items || [];
  const staffPerformance = staffData?.staff || [];

  return (
    <div className="space-y-6">
      {/* Header with Date Range */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-forest">Reports & Analytics</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold"
          >
            <Download size={20} />
            CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold"
          >
            <Download size={20} />
            PDF
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-xl shadow p-4 flex gap-2 flex-wrap">
        {['today', 'week', 'month', 'custom'].map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`px-4 py-2 rounded-lg font-bold transition capitalize ${
              dateRange === range
                ? 'bg-orange text-white'
                : 'bg-forest/10 text-forest hover:bg-forest/20'
            }`}
          >
            {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'Custom'}
          </button>
        ))}
      </div>

      {/* Custom Date Range (if selected) */}
      {dateRange === 'custom' && (
        <div className="bg-white rounded-xl shadow p-4 flex gap-4">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
          />
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
          />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange">
          <p className="text-forest/60 text-sm font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-forest mt-2">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-forest">
          <p className="text-forest/60 text-sm font-medium">Total Orders (excluding cancelled)</p>
          <p className="text-2xl font-bold text-forest mt-2">{totalOrders.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-600">
          <p className="text-forest/60 text-sm font-medium">Avg Order Value</p>
          <p className="text-2xl font-bold text-forest mt-2">{formatCurrency(avgOrderValue)}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Category */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-forest mb-4">Revenue by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueByCategory}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="revenue"
              >
                {revenueByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {revenueByCategory.map((item) => (
              <div key={item.name} className="flex justify-between text-sm">
                <span className="text-forest/70">{item.name}</span>
                <span className="font-bold text-forest">{formatCurrency(item.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Sales Trend */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-forest mb-4">Sales Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#E76F00"
                strokeWidth={3}
                dot={{ fill: '#E76F00', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-forest mb-4">Top Items by Revenue (Overall)</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            layout="vertical"
            data={topItems}
            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" stroke="#6B7280" />
            <YAxis dataKey="name" type="category" stroke="#6B7280" width={150} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" fill="#1B4332" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Staff Performance Table */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-forest mb-4">Staff Performance (Overall)</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-forest/10">
                <th className="text-left py-3 px-4 text-forest font-bold">Staff Member</th>
                <th className="text-left py-3 px-4 text-forest font-bold">Total Sales (PKR)</th>
                <th className="text-left py-3 px-4 text-forest font-bold">Orders Processed</th>
              </tr>
            </thead>
            <tbody>
              {staffPerformance.map((staff, index) => (
                <tr key={index} className="border-b border-forest/5 hover:bg-cream">
                  <td className="py-3 px-4 font-bold text-forest">{staff.cashierName}</td>
                  <td className="py-3 px-4 text-orange font-bold">{formatCurrency(staff.totalRevenue)}</td>
                  <td className="py-3 px-4 text-forest/70">{staff.ordersProcessed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
