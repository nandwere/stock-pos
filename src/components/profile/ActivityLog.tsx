// components/profile/ActivityLog.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock, ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLogProps {
  userId: string;
}

interface Activity {
  id: string;
  type: 'sale' | 'stock_count' | 'inventory_update' | 'login';
  description: string;
  timestamp: Date;
  metadata?: any;
}

async function fetchUserActivity(userId: string): Promise<Activity[]> {
  const response = await fetch(`/api/users/${userId}/activity`);
  if (!response.ok) throw new Error('Failed to fetch activity');
  return response.json();
}

export function ActivityLog({ userId }: ActivityLogProps) {
  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['user-activity', userId],
    queryFn: () => fetchUserActivity(userId),
    // Placeholder data for demo
    placeholderData: [
      {
        id: '1',
        type: 'sale',
        description: 'Processed sale #SALE-240201-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      },
      {
        id: '2',
        type: 'stock_count',
        description: 'Completed daily stock count',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      },
      {
        id: '3',
        type: 'inventory_update',
        description: 'Updated product: Coca Cola 500ml',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      },
      {
        id: '4',
        type: 'login',
        description: 'Logged in to the system',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
      },
    ] as Activity[],
  });

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart className="w-5 h-5 text-blue-600" />;
      case 'stock_count':
        return <Package className="w-5 h-5 text-green-600" />;
      case 'inventory_update':
        return <Package className="w-5 h-5 text-orange-600" />;
      case 'login':
        return <Clock className="w-5 h-5 text-gray-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to load activity log
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No recent activity</p>
        </div>
      ) : (
        activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {activity.description}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(activity.timestamp), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}