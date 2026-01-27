'use client';

import { useState } from 'react';
import Link from 'next/link';

type SubmitState = 'idle' | 'loading' | 'success' | 'not_configured' | 'error';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState('');
  const [configMessage, setConfigMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setState('loading');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.status === 503 && data.configured === false) {
        // Email service not configured
        setConfigMessage(data.message);
        setState('not_configured');
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setState('success');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  };

  // Success state - email was sent
  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="text-6xl">📧</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Check your email</h2>
          <p className="text-gray-600 dark:text-gray-300">
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The link will expire in 1 hour. Check your spam folder if you don&apos;t see it.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setState('idle');
                setEmail('');
              }}
              className="text-primary-600 hover:text-primary-500 text-sm"
            >
              Send to a different email
            </button>
            <Link
              href="/login"
              className="block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not configured state - show setup instructions
  if (state === 'not_configured') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="text-6xl">⚙️</div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <span className="text-yellow-800 dark:text-yellow-200 text-sm font-medium">Configuration Required</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Email Service Not Configured</h2>
          <p className="text-gray-600 dark:text-gray-300">
            {configMessage}
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-left">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Setup:</p>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
              <li>Sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">resend.com</a> (free)</li>
              <li>Get your API key from the dashboard</li>
              <li>Add to <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.env.local</code>:</li>
            </ol>
            <pre className="mt-2 bg-gray-200 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto">
              RESEND_API_KEY=re_xxxxxxxxxx
            </pre>
          </div>
          <Link
            href="/login"
            className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // Default form state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600">AnalyticsPro</h1>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Forgot your password?</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={state === 'loading'}
            className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === 'loading' ? 'Sending...' : 'Send Reset Link'}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm text-primary-600 hover:text-primary-500">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
