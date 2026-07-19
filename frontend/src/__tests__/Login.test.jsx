import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the auth services BEFORE importing context
vi.mock('../services/auth', () => ({
  loginRequest: vi.fn(),
  logoutRequest: vi.fn(),
  fetchCurrentUser: vi.fn().mockRejectedValue(new Error('No user')),
  registerRequest: vi.fn(),
}));

vi.mock('../utils/storage', () => ({
  getStoredToken: vi.fn().mockReturnValue(null),
  getStoredUser: vi.fn().mockReturnValue(null),
  setAuthStorage: vi.fn(),
  clearAuthStorage: vi.fn(),
  getRoleRedirectPath: vi.fn().mockReturnValue('/pos'),
}));

vi.mock('../utils/authErrors', () => ({
  parseApiError: vi.fn().mockReturnValue({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }),
}));

import AuthPage from '../pages/AuthPage';
import { AuthProvider } from '../contexts/AuthContext';
import { loginRequest } from '../services/auth';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderWithProviders(component) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          {component}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login form', async () => {
    renderWithProviders(<AuthPage />);
    // AuthPage renders a sign-in heading — wait for async init
    await waitFor(() => {
      const headings = screen.queryAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('has email and password input fields', async () => {
    renderWithProviders(<AuthPage />);
    await waitFor(() => {
      const emailInput = document.querySelector('input[type="email"]') ||
                         document.querySelector('input[name="email"]') ||
                         screen.queryByPlaceholderText(/email/i);
      expect(emailInput).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('has a password input field', async () => {
    renderWithProviders(<AuthPage />);
    await waitFor(() => {
      const passwordInput = document.querySelector('input[type="password"]');
      expect(passwordInput).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('has a submit / sign-in button', async () => {
    renderWithProviders(<AuthPage />);
    await waitFor(() => {
      const btn = document.querySelector('button[type="submit"]') ||
                  screen.queryByRole('button', { name: /sign in|login|continue/i });
      expect(btn).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('does not call loginRequest without user interaction', async () => {
    renderWithProviders(<AuthPage />);
    await new Promise(r => setTimeout(r, 100));
    expect(loginRequest).not.toHaveBeenCalled();
  });
});
