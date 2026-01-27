'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">AnalyticsPro</span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">Features</a>
            <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">Pricing</a>
            <a href="#testimonials" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">Testimonials</a>
            <Link href="/login" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">Login</Link>
            <Link href="/signup" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 dark:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="px-4 py-4 space-y-3">
            <a href="#features" className="block text-gray-600 dark:text-gray-300 hover:text-primary-600">Features</a>
            <a href="#pricing" className="block text-gray-600 dark:text-gray-300 hover:text-primary-600">Pricing</a>
            <a href="#testimonials" className="block text-gray-600 dark:text-gray-300 hover:text-primary-600">Testimonials</a>
            <Link href="/login" className="block text-gray-600 dark:text-gray-300 hover:text-primary-600">Login</Link>
            <Link href="/signup" className="block px-4 py-2 bg-primary-600 text-white rounded-lg text-center hover:bg-primary-700">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
