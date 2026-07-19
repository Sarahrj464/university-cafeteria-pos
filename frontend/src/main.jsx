import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ShiftProvider } from './contexts/ShiftContext';
import { SettingsProvider } from './contexts/SettingsContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ShiftProvider>
            <App />
            <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              success: {
                style: { background: '#388E3C', color: '#FDF8F0' },
              },
              error: {
                style: { background: '#D32F2F', color: '#FDF8F0' },
              },
              style: {
                fontSize: '15px',
                minHeight: '56px',
                borderRadius: '12px',
              },
            }}
          />
          </ShiftProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
