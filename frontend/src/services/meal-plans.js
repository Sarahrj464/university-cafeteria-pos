import api from './api';

export const getMealPlan = async (studentId) => {
  const { data } = await api.get(`/meal-plans/${studentId}`);
  return data.data.mealPlan;
};

export const getWalletBalance = async (studentId) => {
  const { data } = await api.get(`/students/${studentId}/wallet`);
  return data.data.balance || 0;
};

export const deductMealPlanCredits = async (studentId, amount) => {
  const { data } = await api.put(`/meal-plans/${studentId}/deduct`, { amount });
  return data.data.mealPlan;
};
