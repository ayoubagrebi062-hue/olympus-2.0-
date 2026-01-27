const features = [
  {
    icon: '📊',
    title: 'Real-time Analytics',
    description: 'Track your metrics in real-time with live dashboards and instant updates.',
  },
  {
    icon: '📈',
    title: 'Advanced Charts',
    description: 'Beautiful visualizations with line charts, bar charts, and more.',
  },
  {
    icon: '🔒',
    title: 'Secure Data',
    description: 'Enterprise-grade security with encryption and access controls.',
  },
  {
    icon: '🌐',
    title: 'Multi-platform',
    description: 'Access your analytics from any device, anywhere in the world.',
  },
  {
    icon: '🤖',
    title: 'AI Insights',
    description: 'Get automated insights and recommendations powered by AI.',
  },
  {
    icon: '🔗',
    title: 'Integrations',
    description: 'Connect with 100+ tools including Shopify, Stripe, and more.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Powerful features to help you understand your data and grow your business.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 hover:shadow-lg transition"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
