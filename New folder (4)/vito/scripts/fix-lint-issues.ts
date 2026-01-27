/**
 * FIX LINT ISSUES
 *
 * Fix all ESLint errors in generated code:
 * 1. Remove console.log statements (no-console)
 * 2. Prefix unused variables with _ (no-unused-vars)
 * 3. Use template literals instead of concatenation (prefer-template)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const BUILD_ID = 'bbb38798-2522-4214-aacc-906fbbc70779';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fixed landing components with lint errors resolved

const FIXED_HERO = `'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '../Button';

export function Hero() {
  const handleGetStarted = () => {
    window.location.href = '/signup';
  };

  const handleWatchDemo = () => {
    // Open demo modal or video
    window.location.href = '/demo';
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-grid-white/[0.02]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
          </span>
          Now with 40 AI Agents
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
        >
          Build Apps 50X Faster
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            With AI-Powered Development
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto"
        >
          OLYMPUS transforms your ideas into production-ready applications.
          40 specialized AI agents working in parallel to build, test, and deploy your vision.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            size="lg"
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8"
          >
            Start Building Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleWatchDemo}
            className="border-slate-600 text-white hover:bg-slate-800"
          >
            <Play className="mr-2 h-5 w-5" />
            Watch Demo
          </Button>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 flex items-center justify-center gap-8 text-slate-400 text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">10,000+</span>
            <span>Developers</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">50,000+</span>
            <span>Apps Built</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">4.9/5</span>
            <span>Rating</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
`;

const FIXED_SOCIAL_PROOF = `'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const companies = [
  { name: 'Vercel', logo: '/logos/vercel.svg' },
  { name: 'Stripe', logo: '/logos/stripe.svg' },
  { name: 'GitHub', logo: '/logos/github.svg' },
  { name: 'Figma', logo: '/logos/figma.svg' },
  { name: 'Linear', logo: '/logos/linear.svg' },
  { name: 'Notion', logo: '/logos/notion.svg' },
];

const stats = [
  { label: 'Active Users', value: 10000, suffix: '+' },
  { label: 'Apps Deployed', value: 50000, suffix: '+' },
  { label: 'Time Saved', value: 95, suffix: '%' },
  { label: 'Success Rate', value: 99.9, suffix: '%' },
];

export function SocialProof() {
  const [counts, setCounts] = useState(stats.map(() => 0));

  useEffect(() => {
    const duration = 2000;
    const frameRate = 60;
    const totalFrames = (duration / 1000) * frameRate;

    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setCounts(stats.map((stat) => Math.floor(stat.value * eased)));

      if (frame >= totalFrames) {
        clearInterval(interval);
        setCounts(stats.map((stat) => stat.value));
      }
    }, 1000 / frameRate);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Companies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-slate-400 mb-8">Trusted by developers at</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {companies.map((company) => (
              <div
                key={company.name}
                className="text-slate-500 hover:text-slate-300 transition-colors text-xl font-semibold"
              >
                {company.name}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                {counts[idx]}
                {stat.suffix}
              </div>
              <div className="text-slate-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;

const FIXED_HOW_IT_WORKS = `'use client';

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Button } from '../Button'

const steps = [
  {
    number: '01',
    title: 'Describe Your Vision',
    description: 'Tell OLYMPUS what you want to build in plain English. No technical jargon required.',
    demo: 'prompt-input',
  },
  {
    number: '02',
    title: 'AI Agents Collaborate',
    description: '40 specialized agents work together to architect, code, and test your application.',
    demo: 'agent-grid',
  },
  {
    number: '03',
    title: 'Review & Customize',
    description: 'Get a production-ready app with full source code. Customize anything you need.',
    demo: 'code-preview',
  },
  {
    number: '04',
    title: 'Deploy & Scale',
    description: 'One-click deployment to your preferred cloud. Built for scale from day one.',
    demo: 'deploy-button',
  },
]

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0)

  const handleStepClick = (index: number) => {
    setActiveStep(index)
  }

  const handleTryNow = () => {
    window.location.href = '/signup';
  }

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
            How It Works
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            From idea to production in four simple steps
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Steps List */}
          <div className="space-y-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleStepClick(index)}
                className={\`p-6 rounded-xl cursor-pointer transition-all \${
                  activeStep === index
                    ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30'
                    : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
                }\`}
              >
                <div className="flex items-start gap-4">
                  <span className={\`text-3xl font-bold \${
                    activeStep === index ? 'text-purple-400' : 'text-slate-600'
                  }\`}>
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-slate-400">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Demo Area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-slate-800 rounded-2xl p-8 min-h-[400px] flex items-center justify-center"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">
                {activeStep === 0 && '💭'}
                {activeStep === 1 && '🤖'}
                {activeStep === 2 && '📝'}
                {activeStep === 3 && '🚀'}
              </div>
              <p className="text-slate-300 text-lg mb-6">
                {steps[activeStep].title}
              </p>
              <Button onClick={handleTryNow}>
                Try It Now
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
`;

const FIXED_FEATURES = `'use client';

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Button } from '../Button'

const features = [
  {
    icon: '⚡',
    title: '50X Faster Development',
    description: 'Build in hours what used to take weeks. AI agents handle the heavy lifting.',
    color: 'from-yellow-500/20 to-orange-500/20',
  },
  {
    icon: '🤖',
    title: '40 Specialized Agents',
    description: 'Each agent is an expert in its domain - from UI design to database optimization.',
    color: 'from-purple-500/20 to-pink-500/20',
  },
  {
    icon: '🎨',
    title: 'Production-Ready UI',
    description: 'Beautiful, accessible, and responsive interfaces out of the box.',
    color: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    icon: '🔒',
    title: 'Enterprise Security',
    description: 'Built-in authentication, authorization, and security best practices.',
    color: 'from-green-500/20 to-emerald-500/20',
  },
  {
    icon: '📊',
    title: 'Analytics Built-in',
    description: 'Track user behavior and app performance from day one.',
    color: 'from-red-500/20 to-pink-500/20',
  },
  {
    icon: '🌐',
    title: 'Global Deployment',
    description: 'Deploy to edge servers worldwide with one click.',
    color: 'from-indigo-500/20 to-purple-500/20',
  },
]

export function Features() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  const handleFeatureHover = (index: number | null) => {
    setHoveredFeature(index)
  }

  const handleLearnMore = () => {
    window.location.href = '/features';
  }

  return (
    <section className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Everything You Need
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            OLYMPUS comes with all the features you need to build world-class applications
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onMouseEnter={() => handleFeatureHover(index)}
              onMouseLeave={() => handleFeatureHover(null)}
              className={\`group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all \${
                hoveredFeature === index ? 'scale-[1.02] shadow-xl' : ''
              }\`}
            >
              <div className={\`w-12 h-12 rounded-xl bg-gradient-to-br \${feature.color} flex items-center justify-center text-2xl mb-4\`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button size="lg" variant="outline" onClick={handleLearnMore}>
            See All Features
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
`;

const FIXED_PRICING = `'use client';

import { motion } from 'framer-motion'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../Button'

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
]

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false)

  const handlePlanClick = (planName: string) => {
    if (planName === 'Enterprise') {
      window.location.href = '/contact';
    } else {
      toast.success(\`Starting \${planName} plan setup...\`);
      window.location.href = '/signup';
    }
  }

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

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1 bg-slate-800 rounded-full">
            <button
              onClick={() => setIsYearly(false)}
              className={\`px-4 py-2 rounded-full transition-all \${
                !isYearly ? 'bg-purple-500 text-white' : 'text-slate-400'
              }\`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={\`px-4 py-2 rounded-full transition-all \${
                isYearly ? 'bg-purple-500 text-white' : 'text-slate-400'
              }\`}
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
              className={\`relative p-8 rounded-2xl \${
                plan.popular
                  ? 'bg-gradient-to-b from-purple-500/20 to-slate-900 border-2 border-purple-500'
                  : 'bg-slate-800 border border-slate-700'
              }\`}
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
                  \${isYearly ? plan.price.yearly : plan.price.monthly}
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
  )
}
`;

const FIXED_TESTIMONIALS = `'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'CTO at StartupX',
    avatar: '/avatars/sarah.jpg',
    content: 'OLYMPUS reduced our development time by 80%. We launched our MVP in 2 weeks instead of 3 months.',
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Founder at DevStudio',
    avatar: '/avatars/marcus.jpg',
    content: 'The AI agents are incredibly smart. They understand context and produce production-quality code.',
    rating: 5,
  },
  {
    name: 'Emily Park',
    role: 'Lead Developer at TechCorp',
    avatar: '/avatars/emily.jpg',
    content: 'Best investment we made this year. Our team productivity has skyrocketed.',
    rating: 5,
  },
  {
    name: 'David Kim',
    role: 'Solo Entrepreneur',
    avatar: '/avatars/david.jpg',
    content: 'As a solo founder, OLYMPUS is like having a team of 10 developers working for me.',
    rating: 5,
  },
]

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0)

  const handleDotClick = (index: number) => {
    setActiveIndex(index)
  }

  return (
    <section className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Loved by Developers
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            See what developers around the world are saying about OLYMPUS
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onMouseEnter={() => handleDotClick(index)}
              className={\`p-6 rounded-2xl transition-all \${
                activeIndex === index
                  ? 'bg-gradient-to-b from-purple-500/20 to-slate-900 border border-purple-500/50'
                  : 'bg-slate-900 border border-slate-800'
              }\`}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-slate-300 mb-6">"{testimonial.content}"</p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-sm text-slate-400">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
`;

// Fixed auth.ts with proper error handling
const FIXED_AUTH = `// src/lib/auth.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface Session {
  user: {
    id: string;
    email: string;
    role?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    return {
      user: {
        id: session.user.id,
        email: session.user.email ?? '',
        role: session.user.role,
      },
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    };
  } catch (_error) {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

export async function requireAuth(): Promise<Session> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}

export async function requireRole(role: string): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== role) {
    throw new Error(\`Role '\${role}' required\`);
  }
  return session;
}
`;

// Fixed cleanup-sessions with proper logging
const FIXED_CLEANUP_SESSIONS = `import { db } from '@/lib/db';

export async function cleanupExpiredSessions() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await db.session.deleteMany({ where: { expiresAt: { lt: cutoff } } });
  // Return result for logging at the job scheduler level
  return { deleted: result.count, cutoff: cutoff.toISOString() };
}
`;

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING LINT ISSUES IN ALL AGENT OUTPUTS');
  console.log('='.repeat(60));

  try {
    // Fix PIXEL landing components
    console.log('[1] Fixing PIXEL landing components...');
    const { data: pixel } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'pixel')
      .single();

    if (!pixel) throw new Error('PIXEL output not found');

    let pixelArtifacts = pixel.artifacts || [];

    // Replace all landing components
    const landingComponents = [
      { path: 'src/components/landing/hero.tsx', content: FIXED_HERO },
      { path: 'src/components/landing/socialProof.tsx', content: FIXED_SOCIAL_PROOF },
      { path: 'src/components/landing/howItWorks.tsx', content: FIXED_HOW_IT_WORKS },
      { path: 'src/components/landing/features.tsx', content: FIXED_FEATURES },
      { path: 'src/components/landing/pricing.tsx', content: FIXED_PRICING },
      { path: 'src/components/landing/testimonials.tsx', content: FIXED_TESTIMONIALS },
    ];

    for (const component of landingComponents) {
      pixelArtifacts = pixelArtifacts.filter((a: any) => a.path !== component.path);
      pixelArtifacts.push({ type: 'code', path: component.path, content: component.content });
    }

    const { error: pixelError } = await supabase
      .from('build_agent_outputs')
      .update({ artifacts: pixelArtifacts, updated_at: new Date().toISOString() })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'pixel');

    if (pixelError) throw new Error(\`Failed to update PIXEL: \${pixelError.message}\`);
    console.log('[1] Fixed: hero, socialProof, howItWorks, features, pricing, testimonials');

    // Fix FORGE auth.ts
    console.log('[2] Fixing FORGE auth.ts...');
    const { data: forge } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'forge')
      .single();

    if (!forge) throw new Error('FORGE output not found');

    let forgeArtifacts = forge.artifacts || [];
    forgeArtifacts = forgeArtifacts.filter((a: any) => a.path !== 'src/lib/auth.ts');
    forgeArtifacts.push({ type: 'code', path: 'src/lib/auth.ts', content: FIXED_AUTH });

    const { error: forgeError } = await supabase
      .from('build_agent_outputs')
      .update({ artifacts: forgeArtifacts, updated_at: new Date().toISOString() })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'forge');

    if (forgeError) throw new Error(\`Failed to update FORGE: \${forgeError.message}\`);
    console.log('[2] Fixed: auth.ts - removed non-null assertions, fixed error handling');

    // Fix CRON cleanup-sessions.ts
    console.log('[3] Fixing CRON cleanup-sessions.ts...');
    const { data: cron } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'cron')
      .single();

    if (!cron) throw new Error('CRON output not found');

    let cronArtifacts = cron.artifacts || [];
    cronArtifacts = cronArtifacts.filter((a: any) => a.path !== 'src/jobs/handlers/cleanup-sessions.ts');
    cronArtifacts.push({ type: 'code', path: 'src/jobs/handlers/cleanup-sessions.ts', content: FIXED_CLEANUP_SESSIONS });

    const { error: cronError } = await supabase
      .from('build_agent_outputs')
      .update({ artifacts: cronArtifacts, updated_at: new Date().toISOString() })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'cron');

    if (cronError) throw new Error(\`Failed to update CRON: \${cronError.message}\`);
    console.log('[3] Fixed: cleanup-sessions.ts - removed console.log');

    console.log('='.repeat(60));
    console.log('SUCCESS! All lint issues fixed.');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();
