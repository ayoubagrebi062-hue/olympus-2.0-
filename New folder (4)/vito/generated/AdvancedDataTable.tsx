'use client';

import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { cn } from '../src/lib/utils';
import { CSVLink } from 'react-csv';

interface AdvancedDataTableProps {
  data: any[];
  columns: { key: string; label: string }[];
  onCreate: (item: any) => void;
  onUpdate: (item: any) => void;
  onDelete: (id: string | number) => void;
  fetchData: (page: number, filters: any, search: string) => Promise<any[]>;
}

const AdvancedDataTable = forwardRef<HTMLDivElement, AdvancedDataTableProps>(({
  data,
  columns,
  onCreate,
  onUpdate,
  onDelete,
  fetchData
}, ref) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const [sortedColumn, setSortedColumn] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchData(currentPage, filters, search);
        // Handle data update logic here
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentPage, filters, search, fetchData]);

  const handleSort = (columnKey: string) => {
    const direction = sortedColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortedColumn(columnKey);
    setSortDirection(direction);
    // Implement sorting logic here
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const handleCreate = () => {
    // Implement create logic here
    onCreate({});
  };

  const handleUpdate = (item: any) => {
    // Implement update logic here
    onUpdate(item);
  };

  const handleDelete = (id: string | number) => {
    // Implement delete logic here
    onDelete(id);
  };

  return (
    <div ref={ref} className="bg-[#0a0a0a] text-white p-6 rounded-lg shadow-[0_0_30px_rgba(124,58,237,0.2)]">
      <div className="flex justify-between items-center mb-4 gap-4">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={handleSearch}
          className="p-2 bg-white/[0.03] text-white rounded focus:ring-2 focus:ring-violet-500"
          aria-label="Search"
        />
        <button
          onClick={handleCreate}
          className="bg-violet-600 hover:bg-violet-700 text-white p-2 rounded transition-all duration-200 focus:ring-2 focus:ring-violet-500"
          aria-label="Create new entry"
        >
          Add New Entry
        </button>
        <CSVLink
          data={data}
          filename={"data.csv"}
          className="bg-violet-600 hover:bg-violet-700 text-white p-2 rounded transition-all duration-200 focus:ring-2 focus:ring-violet-500"
          aria-label="Export data"
        >
          Export CSV
        </CSVLink>
      </div>
      <table className="w-full bg-white/[0.03] backdrop-blur-xl rounded-lg">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => handleSort(column.key)}
                className="cursor-pointer p-4 text-left hover:bg-white/10 transition-all duration-200 focus:ring-2 focus:ring-violet-500"
              >
                {column.label}
                {sortedColumn === column.key && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
              </th>
            ))}
            <th className="p-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + 1} className="p-4 text-center">Loading...</td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={columns.length + 1} className="p-4 text-center text-red-500">{error}</td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={item.id} className="hover:bg-white/10 transition-all duration-200">
                {columns.map((column) => (
                  <td key={column.key} className="p-4">{item[column.key]}</td>
                ))}
                <td className="p-4">
                  <button
                    onClick={() => handleUpdate(item)}
                    className="bg-violet-600 hover:bg-violet-700 text-white p-2 rounded transition-all duration-200 focus:ring-2 focus:ring-violet-500"
                    aria-label="Edit entry"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-all duration-200 ml-2 focus:ring-2 focus:ring-red-500"
                    aria-label="Delete entry"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          className="bg-violet-600 hover:bg-violet-700 text-white p-2 rounded transition-all duration-200 focus:ring-2 focus:ring-violet-500"
          aria-label="Previous page"
        >
          Previous
        </button>
        <span className="text-white">Page {currentPage}</span>
        <button
          onClick={() => setCurrentPage((prev) => prev + 1)}
          className="bg-violet-600 hover:bg-violet-700 text-white p-2 rounded transition-all duration-200 focus:ring-2 focus:ring-violet-500"
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
});

AdvancedDataTable.displayName = 'AdvancedDataTable';

export { AdvancedDataTable };
export type { AdvancedDataTableProps };
