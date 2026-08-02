// app/store/[slug]/not-found.tsx
//
// Scoped to this route segment — Next.js renders this instead of the
// generic default 404 whenever notFound() is called inside
// app/store/[slug]/page.tsx (unknown slug, inactive merchant, or
// storefront not yet enabled). It does NOT affect 404s anywhere else in
// your app; add a root app/not-found.tsx separately if you want to
// customize those too.

import Link from 'next/link';

export default function StoreNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 text-3xl">
          🛒
        </div>
        <h1 className="text-xl font-bold mb-2">This store isn't available</h1>
        <p className="text-gray-500 mb-6">
          The store you're looking for doesn't exist, has been deactivated, or hasn't turned on
          online ordering yet.
        </p>
        <Link
          href=""
          className="inline-block bg-emerald-600 text-white rounded-lg px-5 py-2.5 font-semibold hover:bg-emerald-700"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}