import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface MerchantSettings {
    // Merchant table fields
    name: string;
    phone: string;
    email: string;
    address: string;
    logoUrl: string;
    currency: string;
    timezone: string;
    // Settings table key-value fields
    tax_rate: string;
    tax_name: string;
    receipt_footer: string;
    auto_generate_receipt: string;
    require_customer_name: string;
    allow_negative_stock: string;
    low_stock_threshold: string;
    email_notifications: string;
    sms_notifications: string;
    daily_report_email: string;
    require_password_change: string;
    session_timeout: string;
    two_factor_auth: string;
    auto_backup: string;
    backup_frequency: string;
    price_includes_tax: string;
}

export const DEFAULTS: MerchantSettings = {
    name: '', phone: '', email: '', address: '', logoUrl: '',
    currency: 'KES', timezone: 'Africa/Nairobi',
    tax_rate: '16', tax_name: 'VAT',
    receipt_footer: 'Thank you for your business!',
    auto_generate_receipt: 'true', require_customer_name: 'false',
    allow_negative_stock: 'false', low_stock_threshold: '10',
    email_notifications: 'true', sms_notifications: 'false',
    daily_report_email: 'true', require_password_change: 'false',
    session_timeout: '30', two_factor_auth: 'false',
    auto_backup: 'true', backup_frequency: 'daily', price_includes_tax: 'true',
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useSettings() {
    return useQuery({
        queryKey: ['settings'],
        queryFn: async (): Promise<MerchantSettings> => {
            const res = await fetch('/api/settings');
            if (!res.ok) throw new Error(`Settings fetch failed: ${res.status}`);
            return res.json();
        },
        staleTime: 60_000,
    });
}

export function useSaveSettings() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: MerchantSettings) => {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to save settings');
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['settings'] });
            qc.invalidateQueries({ queryKey: ['merchant'] });
        },
    });
}
