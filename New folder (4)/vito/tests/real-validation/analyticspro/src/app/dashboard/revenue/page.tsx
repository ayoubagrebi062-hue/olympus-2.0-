'use client';

import StatCard from '@/components/dashboard/StatCard';
import LineChart from '@/components/dashboard/LineChart';
import BarChart from '@/components/dashboard/BarChart';

const revenueData = [
  { name: 'Jan', value: 12400 },
  { name: 'Feb', value: 15800 },
  { name: 'Mar', value: 18200 },
  { name: 'Apr', value: 21500 },
  { name: 'May', value: 19800 },
  { name: 'Jun', value: 24600 },
  { name: 'Jul', value: 28900 },
];

const revenueByProduct = [
  { name: 'Analytics Pro', value: 45000 },
  { name: 'Dashboard Plus', value: 32000 },
  { name: 'Report Builder', value: 28000 },
  { name: 'API Access', value: 18000 },
  { name: 'Enterprise', value: 52000 },
];

const transactions = [
  { id: '1', customer: 'Acme Corp', product: 'Enterprise Suite', amount: '$2,400', date: 'Jan 15, 2024' },
  { id: '2', customer: 'TechStart Inc', product: 'Analytics Pro', amount: '$79', date: 'Jan 14, 2024' },
  { id: '3', customer: 'GrowthCo', product: 'Dashboard Plus', amount: '$149', date: 'Jan 14, 2024' },
  { id: '4', customer: 'InnovateLabs', product: 'Enterprise Suite', amount: '$2,400', date: 'Jan 13, 2024' },
  { id: '5', customer: 'DataDrive', product: 'API Access', amount: '$99', date: 'Jan 12, 2024' },
];

export default function RevenuePage() {
  const handleExportReport = () => {
    const csvContent = [
      ['Month', 'Revenue'],
      ...revenueData.map(d => [d.name, d.value]),
      ['', ''],
      ['Product', 'Revenue'],
      ...revenueByProduct.map(d => [d.name, d.value]),
      ['', ''],
      ['Customer', 'Product', 'Amount', 'Date'],
      ...transactions.map(t => [t.customer, t.product, t.amount, t.date]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revenue_report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue</h1>
        <button
          onClick={handleExportReport}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Export Report
        </button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value="$175,200" change={18.2} icon="💰" />
        <StatCard title="Monthly Revenue" value="$28,900" change={12.5} icon="📈" />
        <StatCard title="Avg. Order Value" value="$247" change={5.3} icon="🛒" />
        <StatCard title="Active Subscriptions" value="1,247" change={8.1} icon="🔄" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Over Time</h2>
          <LineChart data={revenueData} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Product</h2>
          <BarChart data={revenueByProduct} />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{tx.customer}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{tx.product}</td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">{tx.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
