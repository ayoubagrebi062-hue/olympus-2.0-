'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../Button';

const plans = [
  {
    name: 'Starter',
    price: { monthly: 0, yearly: 0 },
    description: 'Perfect for trying out OLYMPUS',
    features: [
      '5 projects per month',
      '10,000 AI credits',
      'Community support',
      'Basic templates',
    ],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: { monthly: 49, yearly: 470 },
    description: 'For professional developers',
    features: [
      'Unlimited projects',
      '100,000 AI credits',
      'Priority support',
      'All templates',
      'Custom branding',
      'Team collaboration',
    ],
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: { monthly: 199, yearly: 1990 },
    description: 'For teams and organizations',
    features: [
      'Everything in Pro',
      'Unlimited AI credits',
      '24/7 dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'On-premise option',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  const handlePlanClick = (planName: string) => {
    if (planName === 'Enterprise') {
      window.location.href = '/contact';
    } else {
      toast.success(`Starting ${planName} plan setup...`);
      window.location.href = '/signup';
    }
  };

  return (
    <section className="py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>

          <div className="inline-flex items-center gap-4 p-1 bg-slate-800 rounded-full">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 rounded-full transition-all ${
                !isYearly ? 'bg-purple-500 text-white' : 'text-slate-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 rounded-full transition-all ${
                isYearly ? 'bg-purple-500 text-white' : 'text-slate-400'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-green-400">Save 20%</span>
            </button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-8 rounded-2xl ${
                plan.popular
                  ? 'bg-gradient-to-b from-purple-500/20 to-slate-900 border-2 border-purple-500'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-500 text-white text-sm font-medium rounded-full">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-slate-400 mb-6">{plan.description}</p>

              <div className="mb-6">
                <span className="text-5xl font-bold text-white">
                  ${isYearly ? plan.price.yearly : plan.price.monthly}
                </span>
                <span className="text-slate-400">
                  /{isYearly ? 'year' : 'month'}
                </span>
              </div>

              <Button
                className="w-full mb-6"
                variant={plan.popular ? 'default' : 'outline'}
                onClick={() => handlePlanClick(plan.name)}
              >
                {plan.cta}
              </Button>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-slate-300">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
