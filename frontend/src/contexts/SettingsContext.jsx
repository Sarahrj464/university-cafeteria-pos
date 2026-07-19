import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAdminSettings as fetchAdminSettings } from '../services/admin';
import { setCurrencyCode, setCurrencyLocale } from '../utils/currency';
import { setLocale as setDateLocale, setTimeZone } from '../utils/timezone';

export const DEFAULT_SETTINGS = {
  cafeteriaName: 'QuickByte Café',
  currency: 'PKR',
  timezone: 'Asia/Karachi',
  operatingHours: '7:00 AM - 9:00 PM',
  orderNotifications: true,
  stockAlerts: true,
  dailyReports: true,
  backupFrequency: 'Daily',
};

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  refreshSettings: async () => {},
});

const settingsKeyMap = {
  cafeteriaName: 'cafeteria_name',
  currency: 'currency',
  timezone: 'timezone',
  operatingHours: 'operating_hours',
  orderNotifications: 'order_notifications',
  stockAlerts: 'stock_alerts',
  dailyReports: 'daily_reports',
  backupFrequency: 'backup_frequency',
};
const acceptedKeys = new Set(Object.values(settingsKeyMap));

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function parseServerSettings(rawSettings = {}) {
  return {
    cafeteriaName:
      rawSettings.cafeteria_name ?? rawSettings.cafeteriaName ?? DEFAULT_SETTINGS.cafeteriaName,
    currency: rawSettings.currency ?? DEFAULT_SETTINGS.currency,
    timezone: rawSettings.timezone ?? DEFAULT_SETTINGS.timezone,
    operatingHours:
      rawSettings.operating_hours ?? rawSettings.operatingHours ?? DEFAULT_SETTINGS.operatingHours,
    orderNotifications: parseBoolean(
      rawSettings.order_notifications ?? rawSettings.orderNotifications ?? DEFAULT_SETTINGS.orderNotifications
    ),
    stockAlerts: parseBoolean(
      rawSettings.stock_alerts ?? rawSettings.stockAlerts ?? DEFAULT_SETTINGS.stockAlerts
    ),
    dailyReports: parseBoolean(
      rawSettings.daily_reports ?? rawSettings.dailyReports ?? DEFAULT_SETTINGS.dailyReports
    ),
    backupFrequency:
      rawSettings.backup_frequency ?? rawSettings.backupFrequency ?? DEFAULT_SETTINGS.backupFrequency,
  };
}

function getLocaleForCurrency(currencyCode) {
  switch (currencyCode) {
    case 'USD':
      return 'en-US';
    case 'EUR':
      return 'en-IE';
    default:
      return 'en-PK';
  }
}

function applyRuntimeSettings(settings) {
  setCurrencyCode(settings.currency);
  setCurrencyLocale(getLocaleForCurrency(settings.currency));
  setTimeZone(settings.timezone);
  setDateLocale(getLocaleForCurrency(settings.currency));
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const refreshSettings = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return settings;
    }

    setIsLoading(true);
    try {
      const response = await fetchAdminSettings();
      const loadedSettings = parseServerSettings(response);
      setSettings(loadedSettings);
      applyRuntimeSettings(loadedSettings);
      return loadedSettings;
    } catch (error) {
      console.error('[SettingsProvider] failed to load admin settings', error);
      applyRuntimeSettings(settings);
      return settings;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, settings]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const value = useMemo(
    () => ({ settings, isLoading, refreshSettings }),
    [settings, isLoading, refreshSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
