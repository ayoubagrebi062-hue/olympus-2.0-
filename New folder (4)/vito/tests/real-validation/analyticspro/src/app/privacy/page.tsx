import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-primary-600 hover:text-primary-500">
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>

        <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-300">
          <p className="text-sm text-gray-500">Last updated: January 15, 2024</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create an account,
              use our services, or contact us for support.
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Account information (name, email, password)</li>
              <li>Usage data and analytics</li>
              <li>Payment information (processed securely by Stripe)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide and maintain our services</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices and support messages</li>
              <li>Improve and develop new features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information.
              All data is encrypted in transit and at rest using industry-standard protocols.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to
              provide you services. You can request deletion of your data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at privacy@analyticspro.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
