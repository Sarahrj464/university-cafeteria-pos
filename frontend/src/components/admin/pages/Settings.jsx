import React, { useEffect, useMemo, useState } from 'react';
import { Save, Bell, Lock, Globe, Database, X, RotateCcw } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../ui/Modal';
import api from '../../../services/api';
import { getAdminSettings, updateAdminSettings, createBackup, listBackups, restoreBackup } from '../../../services/admin';
import { useSettings } from '../../../contexts/SettingsContext';

const RESTORE_CONFIRM_TEXT = 'RESTORE';

export default function Settings() {
  const toast = useToast();

  // --- Existing settings state ---
  const [settings, setSettings] = useState({
    cafeteriaName: 'QuickByte Café',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    operatingHours: '7:00 AM - 9:00 PM',
    orderNotifications: true,
    stockAlerts: true,
    dailyReports: true,
    backupFrequency: 'Daily',
  });

  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { refreshSettings } = useSettings();

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await getAdminSettings();
        setSettings((prev) => ({
          ...prev,
          cafeteriaName: response?.cafeteria_name ?? response?.cafeteriaName ?? prev.cafeteriaName,
          currency: response?.currency ?? prev.currency,
          timezone: response?.timezone ?? prev.timezone,
          operatingHours: response?.operating_hours ?? response?.operatingHours ?? prev.operatingHours,
          orderNotifications: response?.order_notifications !== undefined
            ? String(response.order_notifications).toLowerCase() === 'true'
            : prev.orderNotifications,
          stockAlerts: response?.stock_alerts !== undefined
            ? String(response.stock_alerts).toLowerCase() === 'true'
            : prev.stockAlerts,
          dailyReports: response?.daily_reports !== undefined
            ? String(response.daily_reports).toLowerCase() === 'true'
            : prev.dailyReports,
          backupFrequency: response?.backup_frequency ?? response?.backupFrequency ?? prev.backupFrequency,
        }));
      } catch (error) {
        console.error('Failed to load admin settings', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // --- Password modal (existing) ---
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAdminSettings(settings);
      await refreshSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success('Settings saved successfully');
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to save settings right now.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualBackup = async () => {
    try {
      const response = await createBackup();
      const { fileName, timestamp } = response || {};
      toast.success(`Backup created successfully: ${fileName || 'backup'} at ${timestamp || 'now'}`);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to create backup right now.';
      toast.error(message);
    }
  };

  const resetPasswordModal = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
  };

  const handleOpenPasswordModal = () => {
    resetPasswordModal();
    setIsPasswordModalOpen(true);
  };

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
    resetPasswordModal();
  };

  const handlePasswordFieldChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    if (passwordError) setPasswordError('');
  };

  const handleChangeAdminPassword = async (e) => {
    e.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    try {
      // FIX: `api` was never imported in the original file — this call
      // would have thrown "ReferenceError: api is not defined" as soon
      // as someone tried to submit this form.
      await api.put('/admin/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success('Admin password updated successfully');
      handleClosePasswordModal();
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to change password right now.';
      setPasswordError(message);
    }
  };

  // --- Restore modal (NEW) ---
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [backups, setBackups] = useState([]); // [{id, filename, timestamp}]
  const [selectedBackupId, setSelectedBackupId] = useState('');
  const [restoreConfirmInput, setRestoreConfirmInput] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);

  useEffect(() => {
    if (!isRestoreModalOpen) return;

    let cancelled = false;

    const loadBackups = async () => {
      setIsLoadingBackups(true);
      setBackups([]);
      setSelectedBackupId('');
      setRestoreConfirmInput('');

      try {
        const resp = await listBackups();
        const list = resp?.data?.backups || resp?.backups || [];
        if (cancelled) return;

        setBackups(list);
        setSelectedBackupId(list[0]?.id || '');
      } catch (e) {
        if (cancelled) return;
        console.error('[Settings] Failed to load backups', e);
        toast.error(e?.response?.data?.message || 'Unable to load backups');
      } finally {
        if (!cancelled) setIsLoadingBackups(false);
      }
    };

    loadBackups();

    return () => {
      cancelled = true;
    };
  }, [isRestoreModalOpen]);

  const canProceedRestore = useMemo(() => {
    if (!selectedBackupId) return false;
    return restoreConfirmInput.trim().toUpperCase() === RESTORE_CONFIRM_TEXT;
  }, [selectedBackupId, restoreConfirmInput]);

  const handleCloseRestoreModal = () => {
    if (isRestoring) return;
    setIsRestoreModalOpen(false);
    setBackups([]);
    setSelectedBackupId('');
    setRestoreConfirmInput('');
  };

  const handleConfirmRestore = async () => {
    if (!canProceedRestore) return;

    setIsRestoring(true);
    try {
      await restoreBackup(selectedBackupId);
      toast.success('Restore completed successfully. Please refresh the app.');
      handleCloseRestoreModal();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Restore failed');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    // NOTE: added pb-24 so the sticky Save bar never overlaps the last
    // card's content, and removed the old max-w-2xl wrapper's implicit
    // reliance on a taller-than-viewport parent — this page can now be
    // safely dropped into any layout without its Save button getting
    // clipped by a parent `overflow-hidden` container.
    <div className="space-y-6 max-w-2xl pb-24">
      <h1 className="text-2xl font-bold text-forest">Settings</h1>

      {saved && (
        <div className="bg-green-100 border border-green-500 text-green-700 px-4 py-3 rounded-lg font-bold">
          ✓ Settings saved successfully
        </div>
      )}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg font-medium">
          Loading saved settings...
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-forest mb-4 flex items-center gap-2">
          <Globe size={20} />
          General Settings
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-forest mb-2">Cafeteria Name</label>
            <input
              type="text"
              value={settings.cafeteriaName}
              onChange={(e) => handleChange('cafeteriaName', e.target.value)}
              className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-forest mb-2">Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
              >
                <option value="PKR">PKR (Pakistani Rupees)</option>
                <option value="USD">USD (US Dollars)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-forest mb-2">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
              >
                <option value="Asia/Karachi">Asia/Karachi (Pakistan)</option>
                <option value="UTC">UTC</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-forest mb-2">Operating Hours</label>
            <input
              type="text"
              value={settings.operatingHours}
              onChange={(e) => handleChange('operatingHours', e.target.value)}
              className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-forest mb-4 flex items-center gap-2">
          <Bell size={20} />
          Notification Settings
        </h2>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.orderNotifications}
              onChange={(e) => handleChange('orderNotifications', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-forest font-bold">Enable Order Notifications</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.stockAlerts}
              onChange={(e) => handleChange('stockAlerts', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-forest font-bold">Enable Stock Alerts</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.dailyReports}
              onChange={(e) => handleChange('dailyReports', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-forest font-bold">Send Daily Reports</span>
          </label>
        </div>
      </div>

      {/* Data Settings */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-forest mb-4 flex items-center gap-2">
          <Database size={20} />
          Data Management
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-forest mb-2">Backup Frequency</label>
            <select
              value={settings.backupFrequency}
              onChange={(e) => handleChange('backupFrequency', e.target.value)}
              className="w-full px-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
            >
              <option value="Hourly">Hourly</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          <div className="flex gap-2">
            {/* Manual Backup — changed from blue to teal/emerald so it
                reads as a distinct, safe "create" action, separate from
                the amber "Restore" (caution) and red "password" (danger)
                buttons below. */}
            <button
              onClick={handleManualBackup}
              className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Manual Backup
            </button>

            <button
              className="flex-1 bg-amber-600 text-white font-bold py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              type="button"
              onClick={() => setIsRestoreModalOpen(true)}
              disabled={isRestoring}
            >
              Restore
            </button>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-forest mb-4 flex items-center gap-2">
          <Lock size={20} />
          Security
        </h2>

        <button
          onClick={handleOpenPasswordModal}
          className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Change Admin Password
        </button>
      </div>

      <Modal
        isOpen={isPasswordModalOpen}
        onClose={handleClosePasswordModal}
        title="Change Admin Password"
        size="md"
      >
        {passwordError && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {passwordError}
          </div>
        )}

        <form onSubmit={handleChangeAdminPassword} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-forest">Current Password</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => handlePasswordFieldChange('currentPassword', e.target.value)}
              className="w-full rounded-lg border border-forest/20 px-4 py-2 focus:border-orange focus:outline-none"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-forest">New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => handlePasswordFieldChange('newPassword', e.target.value)}
              className="w-full rounded-lg border border-forest/20 px-4 py-2 focus:border-orange focus:outline-none"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-forest">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => handlePasswordFieldChange('confirmPassword', e.target.value)}
              className="w-full rounded-lg border border-forest/20 px-4 py-2 focus:border-orange focus:outline-none"
              autoComplete="new-password"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClosePasswordModal}
              className="rounded-lg border border-forest/20 px-4 py-2 font-bold text-forest hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
            >
              Update Password
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isRestoreModalOpen}
        onClose={handleCloseRestoreModal}
        title="Restore Database (Destructive)"
        size="lg"
      >
        <div className="flex flex-col max-h-[90vh] overflow-hidden space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 font-bold flex-shrink-0">
            WARNING: Restore overwrites current data for selected tables. Use only with a non-critical backup first.
          </div>

          {/* Scroll region (only backups list should scroll) */}
          <div className="flex flex-col min-h-0 flex-grow">
            <div className="flex-shrink-0">
              <h3 className="text-sm font-extrabold text-forest uppercase tracking-wider mb-2">Available Backups</h3>
            </div>

            <div className="min-h-0">
              {isLoadingBackups ? (
                <div className="text-sm text-gray-600">Loading backups…</div>
              ) : backups.length === 0 ? (
                <div className="text-sm text-gray-600">No backups found in the server.</div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-forest/10 rounded-xl">
                  {backups
                    .slice()
                    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
                    .map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBackupId(b.id)}
                        className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors ${
                          selectedBackupId === b.id
                            ? 'bg-forest/10'
                            : 'bg-cream hover:bg-forest/5'
                        }`}
                      >
                        <div className="text-sm font-bold text-forest">{b.filename}</div>
                        <div className="text-xs text-gray-500">
                          {b.timestamp ? new Date(b.timestamp).toLocaleString() : '—'}
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 flex-shrink-0">
            <h3 className="text-sm font-extrabold text-forest uppercase tracking-wider">Type</h3>
            <div className="text-sm text-gray-700">
              To enable restore, type <span className="font-extrabold">{RESTORE_CONFIRM_TEXT}</span> exactly.
            </div>
            <input
              type="text"
              value={restoreConfirmInput}
              onChange={(e) => setRestoreConfirmInput(e.target.value)}
              disabled={isRestoring}
              className="w-full px-4 py-3 border border-forest/20 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleCloseRestoreModal}
              disabled={isRestoring}
              className="rounded-lg border border-forest/20 px-4 py-2 font-bold text-forest hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmRestore}
              disabled={!canProceedRestore || isRestoring || isLoadingBackups}
              className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRestoring ? 'Restoring…' : `Confirm Restore`}
            </button>
          </div>
        </div>
      </Modal>

      {/* FIX: Save button is now sticky at the bottom of the viewport
          instead of just sitting at the natural end of page flow. This
          guarantees it's always visible/clickable even if a parent
          layout wrapper has overflow-hidden + a fixed height that would
          otherwise clip the bottom of this page's content. */}
      <div className="fixed bottom-0 left-0 right-0 md:sticky md:bottom-4 z-40 bg-cream/95 backdrop-blur-sm border-t border-forest/10 md:border-0 p-4 md:p-0 md:bg-transparent">
        <div className="max-w-2xl mx-auto md:mx-0">
          <button
            onClick={handleSave}
            className="w-full bg-orange text-white font-bold py-3 rounded-lg hover:bg-orange/90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-colors"
            disabled={isSaving || isLoading}
            type="button"
          >
            <Save size={20} />
            {isSaving ? 'Saving Settings…' : 'Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}