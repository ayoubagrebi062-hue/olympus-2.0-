"""
OLYMPUS CHEF - Dashboard Components
=====================================
Light Theme + Glassmorphism Design
"""

import os

DASHBOARD_DIR = r"C:\Users\SBS\Desktop\New folder (4)\vito\src\components\dashboard"
PAGES_DIR = r"C:\Users\SBS\Desktop\New folder (4)\vito\src\app"

os.makedirs(DASHBOARD_DIR, exist_ok=True)

# ============================================
# SIDEBAR
# ============================================
SIDEBAR = '''\'use client\';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { icon: '📊', label: 'Dashboard', href: '/dashboard' },
  { icon: '📦', label: 'Products', href: '/dashboard/products' },
  { icon: '🛒', label: 'Orders', href: '/dashboard/orders' },
  { icon: '👥', label: 'Customers', href: '/dashboard/customers' },
  { icon: '📈', label: 'Analytics', href: '/dashboard/analytics' },
  { icon: '⚙️', label: 'Settings', href: '/dashboard/settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white/70 backdrop-blur-xl border-r border-white/20 shadow-xl z-40">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            OLYMPUS
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            A
          </div>
          <div className="flex-1">
            <div className="font-medium text-slate-900 text-sm">Ayoub Agrebi</div>
            <div className="text-xs text-slate-500">Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
'''

# ============================================
# STAT CARD
# ============================================
STAT_CARD = '''\'use client\';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: string;
}

export function StatCard({ title, value, change, changeType = 'positive', icon }: StatCardProps) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          {change && (
            <p className={`text-sm mt-2 flex items-center gap-1 ${
              changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            }`}>
              <span>{changeType === 'positive' ? '↑' : '↓'}</span>
              {change}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center text-2xl">
          {icon}
        </div>
      </div>
    </div>
  );
}
'''

# ============================================
# CHART CARD
# ============================================
CHART_CARD = '''\'use client\';

interface ChartCardProps {
  title: string;
  subtitle?: string;
}

export function ChartCard({ title, subtitle }: ChartCardProps) {
  // Simple bar chart visualization
  const data = [40, 65, 45, 80, 55, 70, 90];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxValue = Math.max(...data);

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        <select className="px-3 py-1.5 text-sm bg-slate-100 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500">
          <option>This Week</option>
          <option>This Month</option>
          <option>This Year</option>
        </select>
      </div>

      {/* Chart */}
      <div className="flex items-end justify-between gap-2 h-48">
        {data.map((value, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full bg-gradient-to-t from-indigo-600 to-purple-600 rounded-t-lg transition-all hover:opacity-80"
              style={{ height: `${(value / maxValue) * 100}%` }}
            />
            <span className="text-xs text-slate-500">{days[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
'''

# ============================================
# RECENT ORDERS
# ============================================
RECENT_ORDERS = '''\'use client\';

const orders = [
  { id: '#3210', customer: 'John Doe', product: 'Premium Headphones', amount: '$299.99', status: 'Delivered' },
  { id: '#3209', customer: 'Jane Smith', product: 'Smart Watch Pro', amount: '$449.99', status: 'Shipped' },
  { id: '#3208', customer: 'Bob Wilson', product: 'Wireless Keyboard', amount: '$129.99', status: 'Processing' },
  { id: '#3207', customer: 'Alice Brown', product: 'Designer Backpack', amount: '$189.99', status: 'Delivered' },
  { id: '#3206', customer: 'Charlie Davis', product: 'Running Shoes', amount: '$159.99', status: 'Pending' },
];

const statusColors: Record<string, string> = {
  Delivered: 'bg-green-100 text-green-700',
  Shipped: 'bg-blue-100 text-blue-700',
  Processing: 'bg-amber-100 text-amber-700',
  Pending: 'bg-slate-100 text-slate-700',
};

export function RecentOrders() {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Recent Orders</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Order</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-indigo-600">{order.id}</td>
                <td className="px-6 py-4 text-sm text-slate-900">{order.customer}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{order.product}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{order.amount}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
'''

# ============================================
# DASHBOARD LAYOUT
# ============================================
DASHBOARD_LAYOUT = '''\'use client\';

import { Sidebar } from '@/components/dashboard';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Sidebar />
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
'''

# ============================================
# INDEX
# ============================================
INDEX = '''// OLYMPUS Dashboard Components
export { Sidebar } from './Sidebar';
export { StatCard } from './StatCard';
export { ChartCard } from './ChartCard';
export { RecentOrders } from './RecentOrders';
export { DashboardLayout } from './DashboardLayout';
'''

# ============================================
# DASHBOARD PAGE
# ============================================
DASHBOARD_PAGE = '''\'use client\';

import { DashboardLayout, StatCard, ChartCard, RecentOrders } from '@/components/dashboard';

export default function DashboardPage() {
  const stats = [
    { title: 'Total Revenue', value: '$45,231', change: '+20.1% from last month', changeType: 'positive' as const, icon: '💰' },
    { title: 'Orders', value: '2,345', change: '+12.5% from last month', changeType: 'positive' as const, icon: '📦' },
    { title: 'Customers', value: '1,234', change: '+8.2% from last month', changeType: 'positive' as const, icon: '👥' },
    { title: 'Conversion', value: '3.2%', change: '-0.4% from last month', changeType: 'negative' as const, icon: '📈' },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back! Here is your store overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Revenue Overview" subtitle="Weekly revenue performance" />
        <ChartCard title="Orders" subtitle="Weekly order count" />
      </div>

      {/* Recent Orders */}
      <RecentOrders />
    </DashboardLayout>
  );
}
'''

# ============================================
# SAVE ALL
# ============================================
def save_all():
    print("=" * 50)
    print("OLYMPUS CHEF - Dashboard Components")
    print("=" * 50)

    components = {
        'Sidebar.tsx': SIDEBAR,
        'StatCard.tsx': STAT_CARD,
        'ChartCard.tsx': CHART_CARD,
        'RecentOrders.tsx': RECENT_ORDERS,
        'DashboardLayout.tsx': DASHBOARD_LAYOUT,
        'index.ts': INDEX,
    }

    for filename, code in components.items():
        filepath = os.path.join(DASHBOARD_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"[OK] {DASHBOARD_DIR}\\{filename}")

    # Dashboard page
    dashboard_dir = os.path.join(PAGES_DIR, 'dashboard')
    os.makedirs(dashboard_dir, exist_ok=True)
    filepath = os.path.join(dashboard_dir, 'page.tsx')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(DASHBOARD_PAGE)
    print(f"[OK] {dashboard_dir}\\page.tsx")

    print("\n" + "=" * 50)
    print("Dashboard components generated!")
    print("=" * 50)

if __name__ == '__main__':
    save_all()
