// app/(dashboard)/settings/page.tsx
'use client';

import { useState } from 'react';
import {
    Building2,
    DollarSign,
    Bell,
    Users,
    Shield,
    Printer,
    Database,
    Palette,
    Save,
    Upload,
    RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useUsers } from '@/lib/hooks/use-users';
import { User } from '@/types';

interface Settings {
    // Business Info
    businessName: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
    taxId: string;

    // Currency & Tax
    currency: string;
    taxRate: number;
    taxName: string;

    // POS Settings
    receiptFooter: string;
    autoGenerateReceipt: boolean;
    requireCustomerName: boolean;
    allowNegativeStock: boolean;

    // Notifications
    lowStockThreshold: number;
    emailNotifications: boolean;
    smsNotifications: boolean;
    dailyReportEmail: boolean;

    // Security
    requirePasswordChange: boolean;
    sessionTimeout: number;
    twoFactorAuth: boolean;

    // Backup
    autoBackup: boolean;
    backupFrequency: string;
    lastBackup: string | null;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('business');
    const [settings, setSettings] = useState<Settings>({
        businessName: 'My Shop',
        businessAddress: '123 Main Street, Nairobi',
        businessPhone: '+254 700 000000',
        businessEmail: 'info@myshop.com',
        taxId: 'P051234567X',
        currency: 'KES',
        taxRate: 16,
        taxName: 'VAT',
        receiptFooter: 'Thank you for your business!',
        autoGenerateReceipt: true,
        requireCustomerName: false,
        allowNegativeStock: false,
        lowStockThreshold: 10,
        emailNotifications: true,
        smsNotifications: false,
        dailyReportEmail: true,
        requirePasswordChange: false,
        sessionTimeout: 30,
        twoFactorAuth: false,
        autoBackup: true,
        backupFrequency: 'daily',
        lastBackup: '2024-02-01 10:30 AM'
    });

    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        // In real app, save to API
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
        alert('Settings saved successfully!');
    };

    const tabs = [
        { id: 'business', label: 'Business Info', icon: Building2 },
        { id: 'currency', label: 'Currency & Tax', icon: DollarSign },
        { id: 'pos', label: 'POS Settings', icon: Printer },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'backup', label: 'Backup & Data', icon: Database },
        { id: 'appearance', label: 'Appearance', icon: Palette },
    ];

    return (
        <div className="p-6 max-w-8xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-1">Manage your system configuration</p>
            </div>

            {/* Main Layout */}
            <div className="flex gap-6">
                {/* Sidebar */}
                <div className="w-64 flex-shrink-0">
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activeTab === tab.id
                                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                                        : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        {activeTab === 'business' && (
                            <BusinessInfoSettings settings={settings} setSettings={setSettings} />
                        )}
                        {activeTab === 'currency' && (
                            <CurrencyTaxSettings settings={settings} setSettings={setSettings} />
                        )}
                        {activeTab === 'pos' && (
                            <POSSettings settings={settings} setSettings={setSettings} />
                        )}
                        {activeTab === 'notifications' && (
                            <NotificationSettings settings={settings} setSettings={setSettings} />
                        )}
                        {activeTab === 'users' && <UserManagementSettings />}
                        {activeTab === 'security' && (
                            <SecuritySettings settings={settings} setSettings={setSettings} />
                        )}
                        {activeTab === 'backup' && (
                            <BackupSettings settings={settings} setSettings={setSettings} />
                        )}
                        {activeTab === 'appearance' && <AppearanceSettings />}

                        {/* Save Button */}
                        <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Business Info Section
function BusinessInfoSettings({ settings, setSettings }: any) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h2>
                <p className="text-sm text-gray-600 mb-6">
                    This information will appear on receipts and reports
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name *
                    </label>
                    <input
                        type="text"
                        value={settings.businessName}
                        onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                    </label>
                    <input
                        type="tel"
                        value={settings.businessPhone}
                        onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                    </label>
                    <input
                        type="email"
                        value={settings.businessEmail}
                        onChange={(e) => setSettings({ ...settings, businessEmail: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax ID / PIN
                    </label>
                    <input
                        type="text"
                        value={settings.taxId}
                        onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Address *
                    </label>
                    <textarea
                        value={settings.businessAddress}
                        onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Logo
                </label>
                <div className="flex items-center gap-4">
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                        <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                            Upload Logo
                        </button>
                        <p className="text-xs text-gray-500 mt-2">
                            PNG or JPG (max 2MB)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Currency & Tax Section
function CurrencyTaxSettings({ settings, setSettings }: any) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Currency & Tax Settings</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Configure pricing and tax calculation
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency *
                    </label>
                    <select
                        value={settings.currency}
                        onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="KES">KES - Kenyan Shilling</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="UGX">UGX - Ugandan Shilling</option>
                        <option value="TZS">TZS - Tanzanian Shilling</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Name
                    </label>
                    <input
                        type="text"
                        value={settings.taxName}
                        onChange={(e) => setSettings({ ...settings, taxName: e.target.value })}
                        placeholder="e.g., VAT, GST, Sales Tax"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Rate (%)
                    </label>
                    <input
                        type="number"
                        value={settings.taxRate}
                        onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) })}
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Set to 0 for no tax
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price Display
                    </label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Prices include tax</option>
                        <option>Prices exclude tax</option>
                    </select>
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                    <strong>Example:</strong> A product priced at KES 100 with {settings.taxRate}% {settings.taxName} will cost KES {(100 + (100 * settings.taxRate / 100)).toFixed(2)} including tax.
                </p>
            </div>
        </div>
    );
}

// POS Settings Section
function POSSettings({ settings, setSettings }: any) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">POS Configuration</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Customize your point of sale behavior
                </p>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">Auto-generate Receipts</p>
                        <p className="text-sm text-gray-600">Automatically create receipt after each sale</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.autoGenerateReceipt}
                            onChange={(e) => setSettings({ ...settings, autoGenerateReceipt: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">Require Customer Name</p>
                        <p className="text-sm text-gray-600">Make customer name mandatory for all sales</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.requireCustomerName}
                            onChange={(e) => setSettings({ ...settings, requireCustomerName: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">Allow Negative Stock</p>
                        <p className="text-sm text-gray-600">Permit sales even when stock is zero</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.allowNegativeStock}
                            onChange={(e) => setSettings({ ...settings, allowNegativeStock: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Footer Message
                </label>
                <textarea
                    value={settings.receiptFooter}
                    onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                    rows={3}
                    placeholder="Thank you message for receipts..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                    This message will appear at the bottom of all receipts
                </p>
            </div>
        </div>
    );
}

// Notification Settings Section
function NotificationSettings({ settings, setSettings }: any) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Manage how you receive alerts and updates
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Low Stock Alert Threshold
                    </label>
                    <input
                        type="number"
                        value={settings.lowStockThreshold}
                        onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) })}
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Alert when stock falls below this level
                    </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-600">Receive alerts via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.emailNotifications}
                            onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">SMS Notifications</p>
                        <p className="text-sm text-gray-600">Receive alerts via SMS</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.smsNotifications}
                            onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">Daily Sales Report</p>
                        <p className="text-sm text-gray-600">Receive end-of-day summary via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.dailyReportEmail}
                            onChange={(e) => setSettings({ ...settings, dailyReportEmail: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
        </div>
    );
}

// User Management Section

function UserManagementSettings() {
    const { data: users = [] } = useUsers() as { data: User[] };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage workers and their access</p>
                </div>
                
                <Link
                    href="/settings/add"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                    <Users className="w-5 h-5" />
                    Add User
                </Link>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                        {user.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-sm">
                                    <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                                    <button className="text-red-600 hover:text-red-900">Deactivate</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Security Settings Section
function SecuritySettings({ settings, setSettings }: any) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Configure security and authentication options
                </p>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">Require Password Change</p>
                        <p className="text-sm text-gray-600">Force password change every 90 days</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.requirePasswordChange}
                            onChange={(e) => setSettings({ ...settings, requirePasswordChange: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-600">Add extra security layer for logins</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.twoFactorAuth}
                            onChange={(e) => setSettings({ ...settings, twoFactorAuth: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Session Timeout (minutes)
                    </label>
                    <input
                        type="number"
                        value={settings.sessionTimeout}
                        onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                        min="5"
                        max="1440"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Auto logout after period of inactivity
                    </p>
                </div>
            </div>

            <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-4">Password Requirements</h3>
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Minimum 8 characters</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>At least one uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>At least one number</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>At least one special character</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Backup Settings Section
function BackupSettings({ settings, setSettings }: any) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Backup & Data Management</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Protect your data with automatic backups
                </p>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">Automatic Backups</p>
                        <p className="text-sm text-gray-600">Enable scheduled database backups</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.autoBackup}
                            onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Backup Frequency
                    </label>
                    <select
                        value={settings.backupFrequency}
                        onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!settings.autoBackup}
                    >
                        <option value="hourly">Every Hour</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>

                {settings.lastBackup && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-sm text-green-900">
                            <strong>Last Backup:</strong> {settings.lastBackup}
                        </p>
                    </div>
                )}
            </div>

            <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-4">Manual Backup</h3>
                <div className="flex gap-3">
                    <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        Backup Now
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5" />
                        Restore from Backup
                    </button>
                </div>
            </div>

            <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-4">Data Export</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Export your data for analysis or migration
                </p>
                <div className="flex gap-3">
                    <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                        Export Products (CSV)
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                        Export Sales (CSV)
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                        Export All Data (JSON)
                    </button>
                </div>
            </div>
        </div>
    );
}

// Appearance Settings Section
function AppearanceSettings() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Customize the look and feel of your system
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                </label>
                <div className="grid grid-cols-3 gap-4">
                    <button className="p-4 border-2 border-blue-600 rounded-lg bg-white">
                        <div className="w-full h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded mb-2"></div>
                        <p className="text-sm font-medium">Light (Default)</p>
                    </button>
                    <button className="p-4 border-2 border-gray-200 rounded-lg bg-gray-900">
                        <div className="w-full h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded mb-2"></div>
                        <p className="text-sm font-medium text-white">Dark</p>
                    </button>
                    <button className="p-4 border-2 border-gray-200 rounded-lg">
                        <div className="w-full h-16 bg-gradient-to-br from-blue-500 to-gray-900 rounded mb-2"></div>
                        <p className="text-sm font-medium">Auto</p>
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                </label>
                <div className="flex gap-3">
                    {['blue', 'green', 'purple', 'red', 'orange', 'pink'].map(color => (
                        <button
                            key={color}
                            className={`w-12 h-12 rounded-lg bg-${color}-600 hover:ring-4 hover:ring-${color}-200`}
                        />
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Font Size
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Small</option>
                    <option>Medium (Default)</option>
                    <option>Large</option>
                </select>
            </div>
        </div>
    );
}