'use client';

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon?: string;
}

export default function StatCard({ title, value, change, icon }: StatCardProps) {
  const isPositive = change >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
        {icon && (
          <div className="flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full">
            <span className="text-xl">{icon}</span>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center">
        <span className={`inline-flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? (
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          ) : (
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
          {Math.abs(change)}%
        </span>
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">vs last month</span>
      </div>
    </div>
  );
}
