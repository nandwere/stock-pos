'use client';

import { useEffect, useState } from 'react';
import {
    Building2, DollarSign, Bell, Users, Shield,
    Printer, Database, Palette, Save, Upload,
    RefreshCw, UserCheck, UserX, Pencil, Loader2,
    CheckCircle,
    Receipt,
    CheckCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMerchantsUsers, useToggleUserStatus, useUsers } from '@/lib/hooks/use-users';
import { User } from '@/types';
import { DEFAULTS, MerchantSettings, useSaveSettings, useSettings } from '@/lib/hooks/use-settings';
import { Plan, PLAN_LABELS } from '@/lib/plans';
import { useHandlePaymentRequest, usePaymentRequests } from '@/lib/hooks/use-payments';

// ── Types ─────────────────────────────────────────────────────────────────────

// ── Tabs config ───────────────────────────────────────────────────────────────

const TABS = [
    { id: 'business', label: 'Business Info', icon: Building2 },
    { id: 'currency', label: 'Currency & Tax', icon: DollarSign },
    { id: 'pos', label: 'POS Settings', icon: Printer },
    { id: 'payment', label: 'Payment Requests', icon: RefreshCw },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'backup', label: 'Backup & Data', icon: Database },
    { id: 'appearance', label: 'Appearance', icon: Palette },
];

// Tabs that manage their own save flow
const NO_SAVE_TABS = ['users', 'appearance'];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('business');
    const [form, setForm] = useState<MerchantSettings>(DEFAULTS);
    const [saved, setSaved] = useState(false);
    

    const { data, isLoading, error } = useSettings();
    const saveMutation = useSaveSettings();

    useEffect(() => {
        if (data) setForm({ ...DEFAULTS, ...data });
    }, [data]);

    function set<K extends keyof MerchantSettings>(key: K, value: string) {
        setForm(f => ({ ...f, [key]: value }));
    }

    async function handleSave() {
        try {
            await saveMutation.mutateAsync(form);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {
            // error shown via saveMutation.error
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    Failed to load settings: {(error as Error).message}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-8xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-1">Manage your system configuration</p>
            </div>

            <div className="flex gap-6">
                {/* Sidebar */}
                <div className="w-64 flex-shrink-0">
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-4 ${activeTab === tab.id
                                        ? 'bg-blue-50 text-blue-700 border-blue-700'
                                        : 'text-gray-700 hover:bg-gray-50 border-transparent'
                                        }`}>
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium text-sm">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content panel */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        {saveMutation.isError && (
                            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {(saveMutation.error as Error).message}
                            </div>
                        )}

                        {activeTab === 'business' && <BusinessInfoTab form={form} set={set} />}
                        {activeTab === 'currency' && <CurrencyTaxTab form={form} set={set} />}
                        {activeTab === 'pos' && <POSTab form={form} set={set} />}
                        {activeTab === 'notifications' && <NotificationsTab form={form} set={set} />}
                        {activeTab === 'users' && <UserManagementTab />}
                        {activeTab === 'security' && <SecurityTab form={form} set={set} />}
                        {activeTab === 'backup' && <BackupTab form={form} set={set} />}
                        {activeTab === 'appearance' && <AppearanceTab />}

                        {!NO_SAVE_TABS.includes(activeTab) && (
                            <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-end gap-3">
                                {saved && (
                                    <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                                        <CheckCircle className="w-4 h-4" /> Saved successfully
                                    </span>
                                )}
                                <button onClick={handleSave} disabled={saveMutation.isPending}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold
                             hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                             flex items-center gap-2 transition-colors text-sm">
                                    {saveMutation.isPending
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                                        : <><Save className="w-4 h-4" /> Save Changes</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Tab: Business Info ────────────────────────────────────────────────────────

function BusinessInfoTab({ form, set }: TabProps) {
    return (
        <Section title="Business Information"
            description="This information appears on receipts and reports">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Business Name" required>
                    <Input value={form.name} onChange={v => set('name', v)} placeholder="Baraka Shop" />
                </Field>
                <Field label="Phone Number">
                    <Input value={form.phone} onChange={v => set('phone', v)} placeholder="+254 700 000000" />
                </Field>
                <Field label="Email Address" required>
                    <Input type="email" value={form.email} onChange={v => set('email', v)} placeholder="info@shop.com" />
                </Field>
                <Field label="Timezone">
                    <Select value={form.timezone} onChange={v => set('timezone', v)}
                        options={TIMEZONES.map(tz => ({ value: tz, label: tz }))} />
                </Field>
                <Field label="Business Address" className="md:col-span-2">
                    <textarea
                        value={form.address}
                        onChange={e => set('address', e.target.value)}
                        rows={3}
                        placeholder="Nairobi, Kenya"
                        className={`${inputCls} resize-none`}
                    />
                </Field>
            </div>

            <div className="border-t pt-6 mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">Business Logo</label>
                <div className="flex items-center gap-4">
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg
                          flex items-center justify-center bg-gray-50 overflow-hidden">
                        {form.logoUrl
                            ? <img src={form.logoUrl} alt="logo" className="w-full h-full object-cover" />
                            : <Upload className="w-8 h-8 text-gray-400" />}
                    </div>
                    <div>
                        <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 text-sm">
                            Upload Logo
                        </button>
                        <p className="text-xs text-gray-500 mt-2">PNG or JPG, max 2MB</p>
                    </div>
                </div>
            </div>
        </Section>
    );
}

// ── Tab: Currency & Tax ───────────────────────────────────────────────────────

function CurrencyTaxTab({ form, set }: TabProps) {
    const example = (100 + (100 * Number(form.tax_rate) / 100)).toFixed(2);
    return (
        <Section title="Currency & Tax Settings" description="Configure pricing and tax calculation">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Currency" required>
                    <Select value={form.currency} onChange={v => set('currency', v)}
                        options={CURRENCIES.map(c => ({ value: c, label: c }))} />
                </Field>
                <Field label="Tax Name">
                    <Input value={form.tax_name} onChange={v => set('tax_name', v)} placeholder="VAT" />
                </Field>
                <Field label="Tax Rate (%)" hint="Set to 0 for no tax">
                    <Input type="number" value={form.tax_rate} onChange={v => set('tax_rate', v)}
                        min="0" max="100" step="0.01" />
                </Field>
                <Field label="Price Display">
                    <Select value={form.price_includes_tax} onChange={v => set('price_includes_tax', v)}
                        options={[
                            { value: 'true', label: 'Prices include tax' },
                            { value: 'false', label: 'Prices exclude tax' },
                        ]} />
                </Field>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-2">
                <p className="text-sm text-blue-900">
                    <strong>Example:</strong> A product priced at {form.currency} 100 with {form.tax_rate}%{' '}
                    {form.tax_name} will cost {form.currency} {example} including tax.
                </p>
            </div>
        </Section>
    );
}

// ── Tab: POS ──────────────────────────────────────────────────────────────────

function POSTab({ form, set }: TabProps) {
    return (
        <Section title="POS Configuration" description="Customize your point of sale behaviour">
            <div className="space-y-3">
                <Toggle label="Auto-generate Receipts"
                    description="Automatically create receipt after each sale"
                    checked={form.auto_generate_receipt === 'true'}
                    onChange={v => set('auto_generate_receipt', String(v))} />
                <Toggle label="Require Customer Name"
                    description="Make customer name mandatory for all sales"
                    checked={form.require_customer_name === 'true'}
                    onChange={v => set('require_customer_name', String(v))} />
                <Toggle label="Allow Negative Stock"
                    description="Permit sales even when stock is zero"
                    checked={form.allow_negative_stock === 'true'}
                    onChange={v => set('allow_negative_stock', String(v))} />
            </div>
            <Field label="Receipt Footer Message" className="mt-6"
                hint="Appears at the bottom of all receipts">
                <textarea value={form.receipt_footer}
                    onChange={e => set('receipt_footer', e.target.value)} rows={3}
                    placeholder="Thank you for your business!"
                    className={`${inputCls} resize-none`} />
            </Field>
        </Section>
    );
}

// ── Tab: Notifications ────────────────────────────────────────────────────────

function NotificationsTab({ form, set }: TabProps) {
    return (
        <Section title="Notification Preferences" description="Manage how you receive alerts and updates">
            <Field label="Low Stock Alert Threshold" hint="Alert when stock falls below this level" className="mb-5">
                <Input type="number" value={form.low_stock_threshold}
                    onChange={v => set('low_stock_threshold', v)} min="0" />
            </Field>
            <div className="space-y-3">
                <Toggle label="Email Notifications" description="Receive low-stock and other alerts via email"
                    checked={form.email_notifications === 'true'}
                    onChange={v => set('email_notifications', String(v))} />
                <Toggle label="SMS Notifications" description="Receive alerts via SMS"
                    checked={form.sms_notifications === 'true'}
                    onChange={v => set('sms_notifications', String(v))} />
                <Toggle label="Daily Sales Report" description="Receive end-of-day summary via email"
                    checked={form.daily_report_email === 'true'}
                    onChange={v => set('daily_report_email', String(v))} />
            </div>
        </Section>
    );
}

// ── Tab: Users ────────────────────────────────────────────────────────────────

function UserManagementTab() {
    const { data: users = [] } = useMerchantsUsers() as { data: User[] };
    const { mutateAsync: toggleStatus } = useToggleUserStatus();
    const [pendingUser, setPendingUser] = useState<User | null>(null);
    const [toggling, setToggling] = useState(false);

    async function handleToggle() {
        if (!pendingUser) return;
        setToggling(true);
        try {
            await toggleStatus({ id: pendingUser.id, isActive: !pendingUser.isActive });
            setPendingUser(null);
        } finally {
            setToggling(false);
        }
    }

    return (
        <Section title="User Management" description="Manage workers and their access"
            action={
                <Link href="/settings/add"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700
                     flex items-center gap-2 text-sm transition-colors">
                    <Users className="w-4 h-4" /> Add User
                </Link>
            }>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            {['Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                                <th key={h}
                                    className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide
                              ${h === 'Actions' ? 'text-right' : 'text-left'}`}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                                    No users found.
                                </td>
                            </tr>
                        ) : users.map((user: User) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                        {user.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-4 text-sm">
                                        <Link href={`/settings/users/${user.id}/edit`}
                                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1">
                                            <Pencil className="w-3.5 h-3.5" /> Edit
                                        </Link>
                                        <button onClick={() => setPendingUser(user)}
                                            className={`flex items-center gap-1 ${user.isActive
                                                ? 'text-red-600 hover:text-red-900'
                                                : 'text-green-600 hover:text-green-900'}`}>
                                            {user.isActive
                                                ? <><UserX className="w-3.5 h-3.5" /> Deactivate</>
                                                : <><UserCheck className="w-3.5 h-3.5" /> Activate</>}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pendingUser && (
                <ConfirmDialog user={pendingUser} loading={toggling}
                    onConfirm={handleToggle}
                    onCancel={() => !toggling && setPendingUser(null)} />
            )}
        </Section>
    );
}

// ── Tab: Security ─────────────────────────────────────────────────────────────

function SecurityTab({ form, set }: TabProps) {
    return (
        <Section title="Security Settings" description="Configure security and authentication options">
            <div className="space-y-3">
                <Toggle label="Require Password Change" description="Force password change every 90 days"
                    checked={form.require_password_change === 'true'}
                    onChange={v => set('require_password_change', String(v))} />
                <Toggle label="Two-Factor Authentication" description="Add extra security layer for logins"
                    checked={form.two_factor_auth === 'true'}
                    onChange={v => set('two_factor_auth', String(v))} />
            </div>

            <Field label="Session Timeout (minutes)" hint="Auto-logout after period of inactivity"
                className="mt-5">
                <Input type="number" value={form.session_timeout}
                    onChange={v => set('session_timeout', v)} min="5" max="1440" />
            </Field>

            <div className="border-t pt-5 mt-5">
                <h3 className="font-medium text-gray-900 mb-3 text-sm">Password Requirements</h3>
                <ul className="space-y-2">
                    {['Minimum 8 characters', 'At least one uppercase letter',
                        'At least one number', 'At least one special character'].map(r => (
                            <li key={r} className="flex items-center gap-2 text-sm text-gray-600">
                                <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                                {r}
                            </li>
                        ))}
                </ul>
            </div>
        </Section>
    );
}

// ── Tab: Backup ───────────────────────────────────────────────────────────────

function BackupTab({ form, set }: TabProps) {
    return (
        <Section title="Backup & Data Management" description="Protect your data with automatic backups">
            <div className="space-y-3">
                <Toggle label="Automatic Backups" description="Enable scheduled database backups"
                    checked={form.auto_backup === 'true'}
                    onChange={v => set('auto_backup', String(v))} />
                <Field label="Backup Frequency">
                    <Select value={form.backup_frequency} onChange={v => set('backup_frequency', v)}
                        disabled={form.auto_backup !== 'true'}
                        options={[
                            { value: 'hourly', label: 'Every Hour' },
                            { value: 'daily', label: 'Daily' },
                            { value: 'weekly', label: 'Weekly' },
                            { value: 'monthly', label: 'Monthly' },
                        ]} />
                </Field>
            </div>

            <div className="border-t pt-5 mt-5">
                <h3 className="font-medium text-gray-900 mb-3 text-sm">Manual Backup</h3>
                <div className="flex gap-3">
                    <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2 text-sm">
                        <Database className="w-4 h-4" /> Backup Now
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2 text-sm">
                        <RefreshCw className="w-4 h-4" /> Restore
                    </button>
                </div>
            </div>

            <div className="border-t pt-5 mt-5">
                <h3 className="font-medium text-gray-900 mb-2 text-sm">Data Export</h3>
                <p className="text-sm text-gray-500 mb-4">Export your data for analysis or migration</p>
                <div className="flex flex-wrap gap-3">
                    {['Products (CSV)', 'Sales (CSV)', 'All Data (JSON)'].map(label => (
                        <button key={label}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                            Export {label}
                        </button>
                    ))}
                </div>
            </div>
        </Section>
    );
}

// ── Tab: Appearance ───────────────────────────────────────────────────────────

function AppearanceTab() {
    const [theme, setTheme] = useState('light');
    return (
        <Section title="Appearance" description="Customize the look and feel of your system">
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                <div className="grid grid-cols-3 gap-4 max-w-xs">
                    {[
                        { value: 'light', label: 'Light', bg: 'from-blue-400 to-blue-600' },
                        { value: 'dark', label: 'Dark', bg: 'from-gray-600 to-gray-900' },
                        { value: 'auto', label: 'Auto', bg: 'from-blue-400 to-gray-800' },
                    ].map(t => (
                        <button key={t.value} onClick={() => setTheme(t.value)}
                            className={`p-3 border-2 rounded-lg text-left transition-colors ${theme === t.value ? 'border-blue-600' : 'border-gray-200 hover:border-gray-300'}`}>
                            <div className={`w-full h-12 bg-gradient-to-br ${t.bg} rounded mb-2`} />
                            <p className="text-xs font-medium text-gray-700">{t.label}</p>
                        </button>
                    ))}
                </div>
            </div>
            <Field label="Font Size">
                <Select value="medium" onChange={() => { }} options={[
                    { value: 'small', label: 'Small' },
                    { value: 'medium', label: 'Medium (Default)' },
                    { value: 'large', label: 'Large' },
                ]} />
            </Field>
        </Section>
    );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ user, onConfirm, onCancel, loading }: {
    user: User; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
    const active = user.isActive;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${active ? 'bg-red-100' : 'bg-green-100'}`}>
                    {active
                        ? <UserX className="w-6 h-6 text-red-600" />
                        : <UserCheck className="w-6 h-6 text-green-600" />}
                </div>
                <div className="text-center">
                    <h3 className="font-semibold text-gray-900">{active ? 'Deactivate' : 'Activate'} User</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Are you sure you want to {active ? 'deactivate' : 'activate'}{' '}
                        <span className="font-medium text-gray-800">{user.name}</span>?
                        {active && ' They will lose access immediately.'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} disabled={loading}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium
                       hover:bg-gray-50 disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={loading}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white
                        flex items-center justify-center gap-2 disabled:opacity-60 ${active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {active ? 'Deactivate' : 'Activate'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

type TabProps = {
    form: MerchantSettings;
    set: <K extends keyof MerchantSettings>(key: K, value: string) => void;
};

// Fix 1: text-gray-900 + bg-white ensures readable text in all inputs
const inputCls = [
    'w-full px-4 py-2 border border-gray-300 rounded-lg',
    'text-sm text-gray-900 bg-white placeholder-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
].join(' ');

function Input({
    onChange, className = '', ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    onChange?: (v: string) => void;
}) {
    return (
        <input
            {...props}
            onChange={e => onChange?.(e.target.value)}
            className={`${inputCls} ${className}`}
        />
    );
}

function Select({
    options, onChange, disabled, className = '', ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
    options: { value: string; label: string }[];
    onChange?: (v: string) => void;
}) {
    return (
        <select
            {...props}
            disabled={disabled}
            onChange={e => onChange?.(e.target.value)}
            className={`${inputCls} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            {options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
    );
}

function Toggle({ label, description, checked, onChange }: {
    label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="pr-4">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
                    className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer
                        peer-focus:ring-2 peer-focus:ring-blue-300
                        peer-checked:bg-blue-600
                        after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                        after:bg-white after:border after:border-gray-300 after:rounded-full
                        after:h-5 after:w-5 after:transition-all
                        peer-checked:after:translate-x-full peer-checked:after:border-white" />
            </label>
        </div>
    );
}

function Field({ label, hint, required, className = '', children }: {
    label: string; hint?: string; required?: boolean; className?: string; children: React.ReactNode;
}) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
                {hint && <span className="text-xs text-gray-400 font-normal ml-1.5">— {hint}</span>}
            </label>
            {children}
        </div>
    );
}

function Section({ title, description, action, children }: {
    title: string; description?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between mb-1">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS', 'ZAR', 'NGN'];

const TIMEZONES = [
    'Africa/Nairobi', 'Africa/Lagos', 'Africa/Cairo', 'Africa/Johannesburg',
    'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles',
    'Asia/Dubai', 'Asia/Singapore',
];