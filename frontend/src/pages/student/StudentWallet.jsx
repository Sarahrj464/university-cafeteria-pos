import React, { useState, useEffect } from 'react';
import { Wallet, Calendar, ArrowDownRight, CreditCard, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import toast from 'react-hot-toast';

import { formatDate } from '../../utils/timezone';
import { formatCurrency } from '../../utils/currency';

export default function StudentWallet() {
  const { user } = useAuth();
  const [mealPlan, setMealPlan] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [mpResponse, txResponse] = await Promise.all([
        api.get(`/students/${user.id}/meal-plan`),
        api.get(`/students/${user.id}/transactions`),
      ]);
      setMealPlan(mpResponse.data.data.mealPlan || null);
      setTransactions(txResponse.data.data.transactions || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load wallet information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const getPlanLabel = (type) => {
    const labels = {
      unlimited: 'Unlimited Meal Plan',
      '14_meal': '14-Meal Plan',
      '7_meal': '7-Meal Plan',
      block_50: 'Block 50 Plan',
      dining_dollars: 'PKR Balance Plan',
    };
    return labels[type] || type || 'Standard Meal Plan';
  };

  const getPercentageUsed = () => {
    if (!mealPlan) return 0;
    const total = parseFloat(mealPlan.total_credits || 0);
    const used = parseFloat(mealPlan.used_credits || 0);
    if (total <= 0) return 0;
    return Math.min(Math.round((used / total) * 100), 100);
  };

  const percentageUsed = getPercentageUsed();

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-forest">My Meal Plan Wallet</h2>
          <p className="text-sm text-gray-500">View remaining balance, usage breakdown, and transactions.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 border border-forest/15 rounded-xl hover:bg-forest/5 text-forest transition"
          title="Refresh wallet"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20 text-forest font-bold">
          Loading wallet info...
        </div>
      ) : !mealPlan ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-gray-400">
          <Wallet size={64} className="stroke-1 mb-3 text-gray-300" />
          <p className="font-bold">No active meal plan found</p>
          <p className="text-sm">Please register for a meal plan with cafeteria administration.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Card Layout */}
          <div className="max-w-2xl bg-gradient-to-br from-forest to-forest-light text-cream rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            {/* Visual background accents */}
            <div className="absolute right-[-40px] bottom-[-40px] w-64 h-64 bg-cream/5 rounded-full pointer-events-none" />
            <div className="absolute left-[-20px] top-[-20px] w-32 h-32 bg-orange-500/10 rounded-full pointer-events-none" />

            <div className="relative flex flex-col justify-between h-full space-y-6">
              {/* Plan Type */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-cream/60 font-bold block mb-1">
                    ACTIVE MEAL PLAN
                  </span>
                  <h3 className="text-xl md:text-2xl font-black tracking-wide">
                    {getPlanLabel(mealPlan.plan_type)}
                  </h3>
                </div>
                <CreditCard size={32} className="text-orange-500" />
              </div>

              {/* Balance & Progress */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-cream/60 font-bold block">
                      REMAINING CREDITS
                    </span>
                    <span className="text-3xl md:text-4xl font-black text-white">
                      {formatCurrency(mealPlan.remaining_credits)}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-cream/80 bg-white/10 px-3 py-1 rounded-full">
                    {percentageUsed}% used
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-cream/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${percentageUsed}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-cream/60 font-bold mt-1.5">
                  <span>Used: {formatCurrency(mealPlan.used_credits)}</span>
                  <span>Total plan value: {formatCurrency(mealPlan.total_credits)}</span>
                </div>
              </div>

              {/* Expiry Details */}
              <div className="flex items-center gap-2 border-t border-cream/10 pt-4 text-sm font-bold text-cream/70">
                <Calendar size={16} className="text-orange-500" />
                <span>Semester: {mealPlan.semester}</span>
                <span className="mx-2 text-cream/30">|</span>
                <span>Expires: {formatDate(mealPlan.expires_at)}</span>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <h3 className="text-lg font-black text-forest mb-4 border-b border-gray-100 pb-2">
              Recent Transactions
            </h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500 italic py-4">No recent transactions recorded on this plan.</p>
            ) : (
              <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#FDF8F0] border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-forest/70">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Order Ref</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition text-sm font-bold text-gray-700">
                        <td className="px-6 py-4 text-gray-500 font-medium">
                          {formatDate(tx.processedAt)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-forest">#{tx.orderNumber}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded border uppercase ${
                              tx.status === 'completed'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-red-600 font-black">
                          -{formatCurrency(tx.amount)}
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
    </div>
  );
}



