import api from './api';

export const processPayment = async ({ orderId, paymentMethod, amount, transactionRef, studentId }) => {
  const { data } = await api.post('/payments/process', {
    orderId,
    paymentMethod,
    amount,
    transactionRef,
    studentId,
  });
  return data.data;
};

export const processSplitPayment = async ({ orderId, payments, studentId }) => {
  const { data } = await api.post('/payments/split', { orderId, payments, studentId });
  return data.data;
};
