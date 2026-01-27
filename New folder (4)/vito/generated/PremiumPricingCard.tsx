// Full component code here...
'use client';

import React, { useState, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { cn } from '../src/lib/utils';

interface PremiumPricingCardProps {
  onPaymentSuccess: () => void;
  onPaymentError: (error: Error) => void;
}

const stripePromise = loadStripe('your-publishable-key-here');

const PremiumPricingCard = React.forwardRef<HTMLDivElement, PremiumPricingCardProps>(({ onPaymentSuccess, onPaymentError }, ref) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async (tier: string) => {
    setLoading(true);
    setError(null);
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe.js failed to load');

      // Simulate a payment process
      const { error } = await stripe.redirectToCheckout({
        lineItems: [{ price: 'price_id_for_' + tier, quantity: 1 }],
        mode: 'subscription',
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });

      if (error) throw error;

      onPaymentSuccess();
    } catch (err) {
      setError('An error occurred during payment. Please try again.');
      onPaymentError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={ref} className="bg-[#0a0a0a] text-white font-sans p-6 rounded-lg shadow-[0_0_50px_rgba(124,58,237,0.3)]">
      <h2 className="text-5xl mb-4">Choose Your Plan</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Free', 'Pro', 'Enterprise'].map((tier) => (
          <div
            key={tier}
            className={cn(
              'bg-white/[0.03] backdrop-blur-xl p-6 rounded-lg transition-all duration-200',
              'hover:bg-white/10 hover:-translate-y-0.5 focus:ring-2 focus:ring-violet-500'
            )}
            role="button"
            tabIndex={0}
            onClick={() => handlePayment(tier)}
            onKeyPress={(e) => e.key === 'Enter' && handlePayment(tier)}
            aria-label={`Select ${tier} plan`}
          >
            <h3 className="text-4xl mb-2">{tier}</h3>
            <ul className="text-sm mb-4">
              <li>Feature 1</li>
              <li>Feature 2</li>
              <li>Feature 3</li>
            </ul>
            <button
              className="bg-[#7c3aed] hover:bg-violet-500 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Choose Your Plan Now'}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
});

export { PremiumPricingCard, PremiumPricingCardProps };
