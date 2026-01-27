'use client';

import DataTable from '@/components/dashboard/DataTable';

const columns = [
  { key: 'name', label: 'Product Name' },
  { key: 'price', label: 'Price' },
  { key: 'sales', label: 'Sales' },
  { key: 'status', label: 'Status' },
];

const products = [
  { id: '1', name: 'Analytics Pro', price: '$79/mo', sales: '1,234', status: 'Active' },
  { id: '2', name: 'Dashboard Plus', price: '$49/mo', sales: '856', status: 'Active' },
  { id: '3', name: 'Report Builder', price: '$29/mo', sales: '2,341', status: 'Active' },
  { id: '4', name: 'Data Export', price: '$19/mo', sales: '567', status: 'Inactive' },
  { id: '5', name: 'API Access', price: '$99/mo', sales: '432', status: 'Active' },
  { id: '6', name: 'White Label', price: '$199/mo', sales: '89', status: 'Active' },
  { id: '7', name: 'Enterprise Suite', price: '$499/mo', sales: '23', status: 'Active' },
  { id: '8', name: 'Starter Pack', price: '$9/mo', sales: '5,678', status: 'Active' },
  { id: '9', name: 'Team Plan', price: '$149/mo', sales: '345', status: 'Active' },
  { id: '10', name: 'Custom Solution', price: 'Custom', sales: '12', status: 'Inactive' },
  { id: '11', name: 'Mobile App', price: '$39/mo', sales: '1,567', status: 'Active' },
  { id: '12', name: 'Integration Pack', price: '$59/mo', sales: '234', status: 'Active' },
];

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <DataTable columns={columns} data={products} />
      </div>
    </div>
  );
}
