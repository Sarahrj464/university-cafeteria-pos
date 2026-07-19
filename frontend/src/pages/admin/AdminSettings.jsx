import React, { useState } from 'react';
import { Settings, ChefHat, Server, Save, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { APP_NAME } from '../../config/appConfig';

export default function AdminSettings() {
  const [taxRate, setTaxRate] = useState('8');
  const [serviceFee, setServiceFee] = useState('0');
  const [cafeteriaName, setCafeteriaName] = useState(APP_NAME);
  const [currencySymbol, setCurrencySymbol] = useState('PKR');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    // In production, this would call a backend settings API
    toast.success('Settings saved (local only — backend settings endpoint coming soon)');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-forest flex items-center gap-2">
          <Settings size={32} />
          System Settings
        </h2>
        <p className="text-sm text-gray-500">Configure cafeteria name, tax rate, and system preferences.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
        {/* General Settings */}
        <div className="bg-white border border-forest/10 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <ChefHat size={20} className="text-forest" />
            <h3 className="font-extrabold text-forest text-base uppercase tracking-wider">General</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Cafeteria Name</label>
              <input
                type="text"
                value={cafetinaName}
                onChange={e => setCafeteriaName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="30"
                  value={taxRate}
                  onChange={e => setTaxRate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Service Fee (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={serviceFee}
                  onChange={e => setServiceFee(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Currency Code</label>
              <input
                type="text"
                maxLength={3}
                value={currencySymbol}
                onChange={e => setCurrencySymbol(e.target.value)}
                className="w-32 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white border border-forest/10 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Server size={20} className="text-forest" />
            <h3 className="font-extrabold text-forest text-base uppercase tracking-wider">System Info</h3>
          </div>
          <div className="space-y-3 text-xs font-bold text-gray-600">
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-400">Phase</span>
              <span className="text-forest">Phase 5 — Admin Dashboard</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-400">Backend</span>
              <span className="text-forest">Node.js + Express + PostgreSQL</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-400">Frontend</span>
              <span className="text-forest">React 18 + Vite + Tailwind CSS</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-400">Real-time</span>
              <span className="text-forest">Socket.io v4</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Auth</span>
              <span className="text-forest">JWT + Refresh Token RBAC</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-3 bg-forest hover:bg-forest-light text-cream font-bold rounded-xl shadow-md transition active:scale-95"
        >
          <Save size={18} />
          Save Settings
        </button>
      </form>
    </div>
  );
}

