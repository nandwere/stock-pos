import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { platformDetails } from '@/lib/billing.server';

/**
 * Frame for public pages (Support, Terms). Always the light palette (auth-light), so these
 * pages stay readable whatever theme is chosen inside the app.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const { name } = platformDetails();
  return (
    <div className="auth-light min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-gray-900">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white"><ShoppingBag className="w-5 h-5" /></span>
            {name}
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3 text-[15px] font-medium">
            <Link href="/support" className="px-3 py-2 text-gray-800 hover:text-blue-700">Support</Link>
            <Link href="/terms" className="px-3 py-2 text-gray-800 hover:text-blue-700">Terms</Link>
            <Link href="/login" className="ml-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Sign in</Link>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-5 py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700">
          <span>© {new Date().getFullYear()} {name}</span>
          <span className="flex gap-5">
            <Link href="/terms" className="hover:text-blue-700 underline underline-offset-4">Terms and Conditions</Link>
            <Link href="/support" className="hover:text-blue-700 underline underline-offset-4">Contact Support</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
