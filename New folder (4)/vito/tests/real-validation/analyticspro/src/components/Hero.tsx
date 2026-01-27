import Link from 'next/link';

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-primary-50 to-white dark:from-gray-900 dark:to-gray-800 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Analytics That Drive
            <span className="text-primary-600"> Growth</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Powerful analytics dashboard for modern businesses. Track metrics, visualize data,
            and make data-driven decisions with AnalyticsPro.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-3 bg-primary-600 text-white rounded-lg text-lg font-semibold hover:bg-primary-700 transition"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="px-8 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Learn More
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            No credit card required. 14-day free trial.
          </p>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-16">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {['$124K', '2,847', '94.2%', '+12.5%'].map((stat, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {['Revenue', 'Users', 'Uptime', 'Growth'][i]}
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-32 bg-gradient-to-r from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-lg flex items-end justify-around px-4 pb-4">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="w-8 bg-primary-500 rounded-t" style={{ height: `${h}%` }}></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
