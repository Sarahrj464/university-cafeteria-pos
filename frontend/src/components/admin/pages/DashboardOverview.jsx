import React, { useState, useEffect } from "react";
import { TrendingUp, AlertCircle, ShoppingCart, Users, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import StatCard from "../../admin/StatCard";
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
  AreaChart,   
  Area,
} from "recharts";
import { formatCurrency } from "../../../utils/currency";
import { getShadeScale } from "../../../utils/chartColors";
import { formatDateTime } from "../../../utils/timezone";
import {
  getSalesReport,
  getInventoryAlerts,
  getTopItemsReport,
  toggleAvailability,
  setFlashDiscount,
  getFlashDiscounts,
} from "../../../services/admin";
import { fetchKitchenOrders } from "../../../services/orders";
import { fetchMenuItems } from "../../../services/menu";
import { socket } from "../../../utils/socket";
import toast from "react-hot-toast";

const MetricCard = ({
  title,
  value,
  trend,
  trendDirection,
  icon: Icon,
  alert,
}) => (
  <div
    className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${
      alert ? "border-alert-orange" : "border-forest"
    } transition-all duration-200 hover:-translate-y-[2px] hover:shadow-xl`}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-forest/60 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-forest mt-2">{value}</p>
        {trend && (
          <p className="text-sm mt-2 flex items-center gap-1 text-forest">
            <TrendingUp
              size={16}
              className={trendDirection === "down" ? "rotate-180" : ""}
            />
            <span className={alert ? "text-alert-orange" : "text-forest"}>
              {trend}
            </span>
          </p>
        )}
      </div>
      <div
        className={`p-3 rounded-lg ${
          alert ? "bg-alert-orange/10" : "bg-orange/10"
        }`}
      >
        <Icon
          size={24}
          className={alert ? "text-alert-orange" : "text-accent"}
        />
      </div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-forest/10 bg-white px-4 py-3 shadow-lg">
        {label && (
          <p className="mb-1 text-xs font-medium text-forest/50">{label}</p>
        )}
        <p className="text-base font-bold text-accent">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardOverview() {
  const [liveOrders, setLiveOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [isUnavailableModalOpen, setIsUnavailableModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [selectedUnavailableItemId, setSelectedUnavailableItemId] =
    useState("");
  const [selectedDiscountItemId, setSelectedDiscountItemId] = useState("");
  const [discountPercent, setDiscountPercent] = useState(10);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todayFrom = startOfDay.toISOString();
  const todayTo = endOfDay.toISOString();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date();
  weekEnd.setHours(23, 59, 59, 999);

  const {
    data: salesData,
    isLoading: salesLoading,
    isError: salesError,
  } = useQuery({
    queryKey: ["admin-sales", "week"],
    queryFn: () =>
      getSalesReport(weekStart.toISOString(), weekEnd.toISOString()),
    refetchInterval: 60000,
  });

  const {
    data: todaySalesData,
    isLoading: todaySalesLoading,
    isError: todaySalesError,
  } = useQuery({
    queryKey: ["admin-sales", "today"],
    queryFn: () => getSalesReport(todayFrom, todayTo),
    enabled: Boolean(todayFrom && todayTo),
    refetchInterval: 60000,
  });

  const {
    data: topItemsData,
    isLoading: topItemsLoading,
    isError: topItemsError,
  } = useQuery({
    queryKey: ["admin-top-items"],
    queryFn: () => getTopItemsReport(6),
  });

  const {
    data: alertsData,
    isLoading: alertsLoading,
    isError: alertsError,
  } = useQuery({
    queryKey: ["admin-inventory-alerts"],
    queryFn: getInventoryAlerts,
  });

  useEffect(() => {
    void fetchMenuItems({ available: undefined })
      .then(setMenuItems)
      .catch(console.error);
  }, []);

  useEffect(() => {
    console.log("[DashboardOverview] topItemsData:", topItemsData);
    console.log("[DashboardOverview] topItems:", topItemsData?.items || []);
  }, [topItemsData]);

  useEffect(() => {
    fetchKitchenOrders()
      .then((orders) => {
        const active = orders.filter(
          (o) =>
            o.status !== "completed" &&
            o.status !== "cancelled" &&
            o.status !== "served",
        );
        setLiveOrders(active.slice(0, 10));
      })
      .catch(console.error);

    socket.connect();

    const handleStatusChange = (data) => {
      setLiveOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === data.orderId);
        if (idx >= 0) {
          const newOrders = [...prev];
          newOrders[idx] = { ...newOrders[idx], status: data.status };
          return newOrders;
        }
        return prev;
      });
    };

    socket.on("order:status", handleStatusChange);
    socket.on("new_order", () => {
      fetchKitchenOrders().then((orders) => {
        const active = orders.filter(
          (o) =>
            o.status !== "completed" &&
            o.status !== "cancelled" &&
            o.status !== "served",
        );
        setLiveOrders(active.slice(0, 10));
      });
    });

    return () => {
      socket.off("order:status", handleStatusChange);
      socket.off("new_order");
      socket.disconnect();
    };
  }, []);

  const isMetricsLoading =
    salesLoading || todaySalesLoading || topItemsLoading || alertsLoading;
  const hasMetricsError =
    salesError || todaySalesError || topItemsError || alertsError;

  if (hasMetricsError) {
    return (
      <div className="p-8 text-center text-orange-800">
        Unable to load dashboard metrics. Please refresh or try again later.
      </div>
    );
  }

  const todayRevenue = todaySalesData?.summary?.totalRevenue || 0;
  const todayOrders = todaySalesData?.summary?.totalOrders || 0;
  const activeOrders = liveOrders.filter((o) =>
    ["pending", "preparing"].includes(o.status),
  ).length;
  const lowStockItems = alertsData?.data?.alerts?.length || 0;

  const hourlySales =
    todaySalesData?.hourly?.map((h) => ({
      hour: `${h.hour}:00`,
      revenue: h.revenue,
      orders: h.orders,
    })) || [];
  const paymentMethods =
    todaySalesData?.byPayment?.map((p) => {
      let fill = "#1B4332"; // cash — dark forest
      if (p.method === "campus_wallet") fill = "#E76F00"; // brand orange
      if (p.method === "split") fill = "#2D6A4F"; // medium forest
      if (p.method === "qr_upi") fill = "#F2994A"; // light orange
      if (p.method === "meal_plan") fill = "#40916C"; // forest-teal
      return { name: p.method, value: p.revenue, fill };
    }) || [];

  const weeklyRevenue =
    salesData?.daily?.map((d) => ({ day: d.date, revenue: d.revenue })) || [];
  const topItems = topItemsData?.data?.items || [];
  const metricsStatusMessage = isMetricsLoading
    ? "Loading dashboard data…"
    : null;

  const handleMarkUnavailable = async () => {
    if (!selectedUnavailableItemId) return;
    setIsSubmitting(true);
    try {
      await toggleAvailability(selectedUnavailableItemId, false);
      toast.success("Item marked unavailable");
      setIsUnavailableModalOpen(false);
      setSelectedUnavailableItemId("");
      const refreshedItems = await fetchMenuItems({ available: undefined });
      setMenuItems(refreshedItems);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to update availability",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyFlashDiscount = async () => {
    if (!selectedDiscountItemId) return;
    setIsSubmitting(true);
    try {
      await setFlashDiscount(selectedDiscountItemId, Number(discountPercent));
      toast.success("Flash discount saved");
      setIsDiscountModalOpen(false);
      setSelectedDiscountItemId("");
      setDiscountPercent(10);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to save flash discount",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBroadcastToKds = async () => {
    if (!broadcastMessage.trim()) return;
    setIsSubmitting(true);
    try {
      const message = broadcastMessage.trim();
      const payload = { message, sentAt: new Date().toISOString() };
      if (!socket.connected) {
        socket.connect();
      }
      console.log("[DashboardOverview] emitting kitchen:broadcast", payload);
      socket.emit("kitchen:broadcast", payload);
      toast.success("Broadcast sent to kitchen");
      setIsBroadcastModalOpen(false);
      setBroadcastMessage("");
    } catch (err) {
      toast.error(err?.message || "Failed to send broadcast");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {isMetricsLoading && (
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 text-forest shadow-sm">
          Loading dashboard metrics… data will appear shortly.
        </div>
      )}
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today Revenue"
          value={formatCurrency(todayRevenue)}
          icon={TrendingUp}
          color="forest"
          trendText="Live"
          trendType="positive"
        />
        <StatCard
          label="Orders Today"
          value={todayOrders}
          icon={ShoppingCart}
          color="accent"
          trendText="Live"
          trendType="positive"
        />
        <StatCard
          label="Active Orders"
          value={activeOrders}
          icon={Users}
          color="forest"
          trendText="In progress"
          trendType="neutral"
        />
        <StatCard
          label="Low Stock Items"
          value={lowStockItems}
          icon={AlertCircle}
          color={lowStockItems > 0 ? "error" : "success"}
          trendText={lowStockItems > 0 ? "Requires attention" : "All good"}
          trendType={lowStockItems > 0 ? "negative" : "positive"}
          urgent={lowStockItems > 0}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="bg-white rounded-xl shadow-lg p-6 h-auto lg:h-[320px] flex flex-col">
          <h2 className="text-lg font-bold text-forest mb-4">
            Hourly Sales Today
          </h2>

          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="hour" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip content={<CustomTooltip />} />
                {(() => {
                  const orangeShades = [
                    "#E76F00",
                    "#F4A261",
                    "#C45A00",
                    "#F2994A",
                    "#D97706",
                  ];
                  return (
                    <Bar
                      dataKey="revenue"
                      radius={[8, 8, 0, 0]}
                      activeBar={false}
                    >
                      {hourlySales.map((_, index) => (
                        <Cell
                          key={`hour-cell-${index}`}
                          fill={orangeShades[index % orangeShades.length]}
                        />
                      ))}
                    </Bar>
                  );
                })()}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 h-auto lg:h-[320px] flex flex-col">
          <h2 className="text-lg font-bold text-forest mb-4">
            Payment Methods (Today)
          </h2>

          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 min-h-0">
            {/* LEFT: Pie chart */}
            <div className="w-full sm:w-[210px] flex-shrink-0">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* RIGHT: Legend — narrower width so name & amount stay close, vertically centered */}
            <div className="w-[170px] flex-shrink-0 space-y-2 self-center">
              {paymentMethods.map((method) => (
                <div
                  key={method.name}
                  className="flex justify-between items-center text-[11px] gap-3"
                >
                  <span className="flex items-center gap-1 text-forest/70 truncate">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: method.fill }}
                    />
                    {method.name}
                  </span>

                  <span className="font-bold text-forest whitespace-nowrap">
                    {formatCurrency(method.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-forest mb-4">
            Weekly Revenue Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
  <AreaChart data={weeklyRevenue}>
    <defs>
      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#E76F00" stopOpacity={0.3} />
        <stop offset="95%" stopColor="#E76F00" stopOpacity={0} />
      </linearGradient>
    </defs>
    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
    <XAxis dataKey="day" stroke="#6B7280" />
    <YAxis stroke="#6B7280" />
    <Tooltip content={<CustomTooltip />} />
    <Area
      type="monotone"
      dataKey="revenue"
      stroke="#E76F00"
      strokeWidth={3}
      fill="url(#revenueGradient)"
      dot={{ fill: "#E76F00", r: 5 }}
    />
  </AreaChart>
</ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-forest mb-4">
            Top Menu Items (Overall)
          </h2>
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                layout="vertical"
                data={topItems}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" stroke="#6B7280" />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#6B7280"
                  width={90}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip formatter={(value) => [`${value} sold`, "Quantity"]} />
                <Bar
                  dataKey="quantitySold"
                  radius={[0, 8, 8, 0]}
                  maxBarSize={32}
                >
                  {(() => {
                    const shades = getShadeScale("forest", topItems.length);
                    return topItems.map((_, index) => (
                      <Cell
                        key={`top-item-cell-${index}`}
                        fill={shades[index]}
                      />
                    ));
                  })()}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-forest mb-4">
          Active Orders (Live Feed)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-forest/10">
                <th className="text-left py-3 px-4 text-forest font-bold">
                  Order #
                </th>
                <th className="text-left py-3 px-4 text-forest font-bold">
                  Total
                </th>
                <th className="text-left py-3 px-4 text-forest font-bold">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-forest font-bold">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {liveOrders.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-4 text-center text-forest/50">
                    No active orders right now.
                  </td>
                </tr>
              )}
              {liveOrders.map((order) => {
                return (
                  <tr
                    key={order.id}
                    className="border-b border-forest/5 hover:bg-cream"
                  >
                    <td className="py-3 px-4 font-bold text-forest">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-4 font-bold text-accent">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold ${
                          order.status === "ready"
                            ? "bg-forest/10 text-forest"
                            : "bg-accent/10 text-accent"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-forest/60 text-sm">
                      {formatDateTime(order.createdAt, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-6 border-t border-forest/10 pt-4">
          <h3 className="text-md font-bold text-forest mb-3">Quick Actions</h3>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setIsUnavailableModalOpen(true)}
              className="bg-forest/10 text-forest font-bold py-2 px-4 rounded-lg hover:bg-forest/20 transition"
            >
              Mark Item Unavailable
            </button>
            <button
              onClick={() => setIsDiscountModalOpen(true)}
              className="bg-accent/10 text-accent font-bold py-2 px-4 rounded-lg hover:bg-accent/20 transition"
            >
              Apply Flash Discount
            </button>
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="bg-forest text-white font-bold py-2 px-4 rounded-lg hover:bg-forest/90 transition"
            >
              Broadcast to KDS
            </button>
          </div>
        </div>
      </div>

      {isUnavailableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-forest">
                Mark Item Unavailable
              </h3>
              <button
                onClick={() => setIsUnavailableModalOpen(false)}
                className="rounded-full p-1 hover:bg-forest/10"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-semibold text-forest">
                Select menu item
              </label>
              <select
                value={selectedUnavailableItemId}
                onChange={(e) => setSelectedUnavailableItemId(e.target.value)}
                className="w-full rounded-lg border border-forest/10 px-3 py-2"
              >
                <option value="">Choose item</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsUnavailableModalOpen(false)}
                className="rounded-lg border border-forest/10 px-4 py-2 text-sm font-semibold text-forest"
              >
                Cancel
              </button>
              <button
                disabled={!selectedUnavailableItemId || isSubmitting}
                onClick={handleMarkUnavailable}
                className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSubmitting ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-forest">
                Apply Flash Discount
              </h3>
              <button
                onClick={() => setIsDiscountModalOpen(false)}
                className="rounded-full p-1 hover:bg-forest/10"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-semibold text-forest">
                Select menu item
              </label>
              <select
                value={selectedDiscountItemId}
                onChange={(e) => setSelectedDiscountItemId(e.target.value)}
                className="w-full rounded-lg border border-forest/10 px-3 py-2"
              >
                <option value="">Choose item</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <label className="block text-sm font-semibold text-forest">
                Discount %
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full rounded-lg border border-forest/10 px-3 py-2"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsDiscountModalOpen(false)}
                className="rounded-lg border border-forest/10 px-4 py-2 text-sm font-semibold text-forest"
              >
                Cancel
              </button>
              <button
                disabled={!selectedDiscountItemId || isSubmitting}
                onClick={handleApplyFlashDiscount}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-forest">
                Broadcast to KDS
              </h3>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="rounded-full p-1 hover:bg-forest/10"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-semibold text-forest">
                Message
              </label>
              <input
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Short message for kitchen"
                className="w-full rounded-lg border border-forest/10 px-3 py-2"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="rounded-lg border border-forest/10 px-4 py-2 text-sm font-semibold text-forest"
              >
                Cancel
              </button>
              <button
                disabled={!broadcastMessage.trim() || isSubmitting}
                onClick={handleBroadcastToKds}
                className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
