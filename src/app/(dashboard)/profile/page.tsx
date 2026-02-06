// app/(dashboard)/profile/page.tsx
import { requireAuth } from '@/lib/auth';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { PasswordChangeForm } from '@/components/profile/PasswordChangeForm';
import { ActivityLog } from '@/components/profile/ActivityLog';
import { User, Shield, Activity, Bell } from 'lucide-react';

export default async function ProfilePage() {
  const user = await requireAuth();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-600 mt-1">{user.email}</p>
            
            <div className="flex items-center gap-4 mt-4">
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {user.role.replace('_', ' ')}
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-xs text-gray-600 mt-1">Sales Today</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-xs text-gray-600 mt-1">This Month</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Personal Information
                </h3>
              </div>
            </div>
            <div className="p-6">
              <ProfileForm user={user} />
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Security
                </h3>
              </div>
            </div>
            <div className="p-6">
              <PasswordChangeForm userId={user.id} />
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Activity
                </h3>
              </div>
            </div>
            <div className="p-6">
              <ActivityLog userId={user.id} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Notifications
                </h3>
              </div>
            </div>
            <div className="p-6">
              <NotificationSettings userId={user.id} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <a
                href="/pos"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Open POS
              </a>
              <a
                href="/inventory"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                View Inventory
              </a>
              <a
                href="/reports"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                View Reports
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notification Settings Component
function NotificationSettings({ userId }: { userId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">Low Stock Alerts</p>
          <p className="text-sm text-gray-500">Get notified when stock is low</p>
        </div>
        <input type="checkbox" className="w-4 h-4" defaultChecked />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">Daily Reports</p>
          <p className="text-sm text-gray-500">Receive daily sales reports</p>
        </div>
        <input type="checkbox" className="w-4 h-4" defaultChecked />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">New Sale</p>
          <p className="text-sm text-gray-500">Notify on each new sale</p>
        </div>
        <input type="checkbox" className="w-4 h-4" />
      </div>
    </div>
  );
}