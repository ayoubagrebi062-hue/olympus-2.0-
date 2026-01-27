'use client';

import { useState } from 'react';
import LineChart from '@/components/dashboard/LineChart';
import BarChart from '@/components/dashboard/BarChart';

const analyticsData = [
  { name: 'Jan', value: 4000, revenue: 2400 },
  { name: 'Feb', value: 3000, revenue: 1398 },
  { name: 'Mar', value: 2000, revenue: 9800 },
  { name: 'Apr', value: 2780, revenue: 3908 },
  { name: 'May', value: 1890, revenue: 4800 },
  { name: 'Jun', value: 2390, revenue: 3800 },
  { name: 'Jul', value: 3490, revenue: 4300 },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('last7days');

  const exportToCsv = () => {
    const csvContent = analyticsData
      .map(row => `${row.name},${row.value},${row.revenue}`)
      .join('\n');
    const blob = new Blob([`Month,Visitors,Revenue\n${csvContent}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics_data.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <div className="flex space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="last7days">Last 7 days</option>
            <option value="last30days">Last 30 days</option>
            <option value="last90days">Last 90 days</option>
          </select>
          <button
            onClick={exportToCsv}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Visitors Over Time</h2>
          <LineChart data={analyticsData} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Month</h2>
          <BarChart data={analyticsData} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Table</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Visitors</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {analyticsData.map((row, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{row.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{row.value.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">${row.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
