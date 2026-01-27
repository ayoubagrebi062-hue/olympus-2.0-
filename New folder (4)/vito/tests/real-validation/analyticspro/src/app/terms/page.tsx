import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-primary-600 hover:text-primary-500">
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Terms of Service</h1>

        <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-300">
          <p className="text-sm text-gray-500">Last updated: January 15, 2024</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing and using AnalyticsPro, you accept and agree to be bound by the terms
              and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Use License</h2>
            <p>
              Permission is granted to temporarily use AnalyticsPro for personal, non-commercial
              transitory viewing only. This is the grant of a license, not a transfer of title.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Disclaimer</h2>
            <p>
              The materials on AnalyticsPro are provided on an &apos;as is&apos; basis. AnalyticsPro makes no
              warranties, expressed or implied, and hereby disclaims and negates all other warranties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Limitations</h2>
            <p>
              In no event shall AnalyticsPro or its suppliers be liable for any damages arising out
              of the use or inability to use the materials on AnalyticsPro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Revisions</h2>
            <p>
              AnalyticsPro may revise these terms of service at any time without notice. By using
              this website you are agreeing to be bound by the then current version of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">6. Contact</h2>
            <p>
              If you have any questions about these Terms, please contact us at legal@analyticspro.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
