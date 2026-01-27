'use client';

import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import StatCard from '@/components/dashboard/StatCard';
import LineChart from '@/components/dashboard/LineChart';
import BarChart from '@/components/dashboard/BarChart';
import DataTable from '@/components/dashboard/DataTable';

const revenueData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 4500 },
  { name: 'May', value: 6000 },
  { name: 'Jun', value: 5500 },
];

const productsData = [
  { name: 'Product A', value: 400 },
  { name: 'Product B', value: 300 },
  { name: 'Product C', value: 500 },
  { name: 'Product D', value: 200 },
  { name: 'Product E', value: 350 },
];

const tableColumns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
];

const tableData = [
  { id: '1', name: 'John Doe', email: 'john@example.com', amount: '$120', status: 'Completed' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', amount: '$250', status: 'Pending' },
  { id: '3', name: 'Bob Wilson', email: 'bob@example.com', amount: '$180', status: 'Completed' },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', amount: '$320', status: 'Completed' },
  { id: '5', name: 'Charlie Davis', email: 'charlie@example.com', amount: '$95', status: 'Failed' },
  { id: '6', name: 'Diana Miller', email: 'diana@example.com', amount: '$450', status: 'Completed' },
  { id: '7', name: 'Edward Lee', email: 'edward@example.com', amount: '$210', status: 'Pending' },
  { id: '8', name: 'Fiona Clark', email: 'fiona@example.com', amount: '$175', status: 'Completed' },
  { id: '9', name: 'George White', email: 'george@example.com', amount: '$290', status: 'Completed' },
  { id: '10', name: 'Helen Moore', email: 'helen@example.com', amount: '$380', status: 'Pending' },
  { id: '11', name: 'Ivan Taylor', email: 'ivan@example.com', amount: '$520', status: 'Completed' },
  { id: '12', name: 'Julia Anderson', email: 'julia@example.com', amount: '$145', status: 'Failed' },
];

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Revenue" value="$45,231" change={12.5} icon="$" />
            <StatCard title="Total Users" value="2,350" change={8.2} icon="U" />
            <StatCard title="Total Orders" value="1,247" change={-2.4} icon="O" />
            <StatCard title="Conversion Rate" value="3.24%" change={4.1} icon="%" />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Over Time</h2>
              <LineChart data={revenueData} />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Products</h2>
              <BarChart data={productsData} />
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
            </div>
            <DataTable columns={tableColumns} data={tableData} />
          </div>
        </main>
      </div>
    </div>
  );
}
