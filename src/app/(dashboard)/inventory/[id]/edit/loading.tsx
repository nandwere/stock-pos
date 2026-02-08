// app/inventory/[id]/edit/loading.tsx
import { Loader2, Package } from 'lucide-react';

export default function Loading() {
  return (
    <div className="p-6">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div>
              <div className="h-7 w-48 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div className="w-32 h-10 bg-gray-200 rounded-lg"></div>
        </div>
        
        {/* Form skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Product info card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 w-full bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Pricing card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 w-full bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Sidebar skeleton */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="h-8 w-full bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Centered spinner overlay */}
      <div className="fixed inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading product data...</p>
        </div>
      </div>
    </div>
  );
}