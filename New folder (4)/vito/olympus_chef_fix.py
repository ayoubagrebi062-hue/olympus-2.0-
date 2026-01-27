"""
OLYMPUS CHEF FIX - Repairs All Broken Links & Missing Components
==================================================================
This script fixes:
1. Footer links (were all #, now real routes)
2. Missing marketing components (Testimonials, HowItWorks, CTASection)
3. Home page (add all missing sections)
4. Blog dynamic route (/blog/[slug])
5. Docs dynamic route (/docs/[slug])
6. Legal pages (privacy, terms, etc.)
"""

import os

BASE_DIR = r"C:\Users\SBS\Desktop\New folder (4)\vito\src"
MARKETING_DIR = os.path.join(BASE_DIR, "components", "marketing")
APP_DIR = os.path.join(BASE_DIR, "app")

# ============================================
# FIX 1: FOOTER WITH REAL LINKS
# ============================================
FOOTER_FIXED = '''\'use client\';

import Link from 'next/link';

export function Footer() {
  const links = {
    Product: [
      { name: 'Features', href: '/features' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'Templates', href: '/templates' },
      { name: 'Changelog', href: '/changelog' },
    ],
    Resources: [
      { name: 'Documentation', href: '/docs' },
      { name: 'Tutorials', href: '/tutorials' },
      { name: 'Blog', href: '/blog' },
      { name: 'Community', href: '/community' },
    ],
    Company: [
      { name: 'About', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Contact', href: '/contact' },
      { name: 'Partners', href: '/partners' },
    ],
    Legal: [
      { name: 'Privacy', href: '/privacy' },
      { name: 'Terms', href: '/terms' },
      { name: 'Security', href: '/security' },
      { name: 'Cookies', href: '/cookies' },
    ],
  };

  return (
    <footer className="bg-white/70 backdrop-blur-xl border-t border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                OLYMPUS
              </span>
            </Link>
            <p className="text-slate-500 text-sm mb-4">
              Build anything. 50X faster.
            </p>
            {/* Social */}
            <div className="flex gap-3">
              <a href="https://twitter.com/olympus" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-indigo-100 flex items-center justify-center transition-colors group">
                <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://github.com/olympus" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-indigo-100 flex items-center justify-center transition-colors group">
                <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              </a>
              <a href="https://discord.gg/olympus" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-indigo-100 flex items-center justify-center transition-colors group">
                <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-semibold text-slate-900 mb-4">{category}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-slate-500 hover:text-indigo-600 transition-colors text-sm">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            2026 OLYMPUS. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-slate-500 hover:text-indigo-600 text-sm transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-slate-500 hover:text-indigo-600 text-sm transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
'''

# ============================================
# FIX 2: TESTIMONIALS COMPONENT (NEW)
# ============================================
TESTIMONIALS = '''\'use client\';

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Founder, TechStart',
    image: 'SC',
    content: 'OLYMPUS cut our development time by 80%. We launched our MVP in a weekend instead of months.',
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'CTO, ScaleUp Inc',
    image: 'MJ',
    content: 'The AI understands exactly what I want. I describe features in plain English and watch them come to life.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'Product Designer',
    image: 'ER',
    content: 'Finally, a tool that lets designers build real apps. No more waiting on developers for simple changes.',
    rating: 5,
  },
  {
    name: 'David Park',
    role: 'Indie Maker',
    image: 'DP',
    content: 'I built and launched 3 SaaS products in one month. Each one is generating revenue. Game changer.',
    rating: 5,
  },
  {
    name: 'Lisa Thompson',
    role: 'Agency Owner',
    image: 'LT',
    content: 'Our agency delivers 5x more projects now. Clients are amazed at how fast we ship.',
    rating: 5,
  },
  {
    name: 'James Wilson',
    role: 'Startup Founder',
    image: 'JW',
    content: 'Raised our seed round with a fully functional product built in 2 weeks. Investors were impressed.',
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="py-24 bg-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full text-indigo-600 text-sm font-medium mb-4">
            Testimonials
          </span>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Loved by{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              10,000+ builders
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            See what developers, designers, and founders are saying about OLYMPUS.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="p-6 bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, j) => (
                  <svg key={j} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Content */}
              <p className="text-slate-600 mb-6 leading-relaxed">"{t.content}"</p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {t.image}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{t.name}</div>
                  <div className="text-sm text-slate-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
'''

# ============================================
# FIX 3: HOW IT WORKS COMPONENT (NEW)
# ============================================
HOW_IT_WORKS = '''\'use client\';

const steps = [
  {
    number: '01',
    title: 'Describe Your Vision',
    description: 'Tell OLYMPUS what you want to build in plain English. Our AI understands context, intent, and best practices.',
    icon: '💬',
  },
  {
    number: '02',
    title: 'Watch It Build',
    description: 'See your app come to life in real-time. Every component, every line of code, generated before your eyes.',
    icon: '⚡',
  },
  {
    number: '03',
    title: 'Customize & Refine',
    description: 'Use our visual editor to tweak layouts, colors, and content. Or dive into the code for full control.',
    icon: '🎨',
  },
  {
    number: '04',
    title: 'Deploy Instantly',
    description: 'One click to go live. Your app is deployed globally with SSL, CDN, and automatic scaling.',
    icon: '🚀',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full text-indigo-600 text-sm font-medium mb-4">
            How It Works
          </span>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            From idea to production in{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              4 simple steps
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            No coding bootcamp required. If you can describe it, you can build it.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {/* Connector Line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-indigo-200 to-purple-200 -translate-x-1/2" />
              )}

              <div className="relative p-6 bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-xl transition-all group">
                {/* Number Badge */}
                <div className="absolute -top-4 -left-4 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
'''

# ============================================
# FIX 4: CTA SECTION COMPONENT (NEW)
# ============================================
CTA_SECTION = '''\'use client\';

import Link from 'next/link';

export function CTASection() {
  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-12 md:p-16 shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-10 right-10 w-20 h-20 bg-white/10 rounded-full blur-xl" />
          <div className="absolute bottom-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />

          {/* Content */}
          <div className="relative text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to build something amazing?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join 10,000+ builders who are shipping products 50X faster with OLYMPUS.
              Start free, no credit card required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="px-8 py-4 bg-white text-indigo-600 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Start Building Free
              </Link>
              <Link
                href="/demo"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all"
              >
                Watch Demo
              </Link>
            </div>

            <p className="mt-6 text-white/60 text-sm">
              No credit card required. Free tier includes 5 projects.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
'''

# ============================================
# FIX 5: PRICING PREVIEW COMPONENT (NEW)
# ============================================
PRICING_PREVIEW = '''\'use client\';

import Link from 'next/link';

const plans = [
  { name: 'Free', price: '$0', desc: 'For trying out', features: ['5 projects', '1GB storage', 'Community support'] },
  { name: 'Pro', price: '$29', desc: 'For serious builders', features: ['Unlimited projects', '50GB storage', 'Priority support', 'Custom domains'], popular: true },
  { name: 'Team', price: '$99', desc: 'For teams', features: ['Everything in Pro', 'Team collaboration', 'SSO / SAML', 'Dedicated support'] },
];

export function PricingPreview() {
  return (
    <section className="py-24 bg-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full text-indigo-600 text-sm font-medium mb-4">
            Pricing
          </span>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Simple,{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              transparent
            </span>{' '}
            pricing
          </h2>
          <p className="text-xl text-slate-600">
            Start free, upgrade when you are ready.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 bg-white/60 backdrop-blur-xl border rounded-2xl shadow-lg hover:shadow-xl transition-all ${
                plan.popular ? 'border-indigo-500 scale-105' : 'border-white/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
              <p className="text-slate-500 text-sm mb-4">{plan.desc}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-slate-600 text-sm">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/pricing" className="text-indigo-600 hover:text-indigo-700 font-medium">
            View full pricing details →
          </Link>
        </div>
      </div>
    </section>
  );
}
'''

# ============================================
# FIX 6: UPDATED INDEX (ADD NEW EXPORTS)
# ============================================
MARKETING_INDEX = '''// OLYMPUS Marketing Components
export { Header } from './Header';
export { HeroSection } from './HeroSection';
export { SocialProof } from './SocialProof';
export { FeaturesOverview } from './FeaturesOverview';
export { Testimonials } from './Testimonials';
export { HowItWorks } from './HowItWorks';
export { CTASection } from './CTASection';
export { PricingPreview } from './PricingPreview';
export { Footer } from './Footer';
'''

# ============================================
# FIX 7: UPDATED HOME PAGE (ALL SECTIONS)
# ============================================
HOME_PAGE = '''\'use client\';

import {
  Header,
  HeroSection,
  SocialProof,
  FeaturesOverview,
  HowItWorks,
  Testimonials,
  PricingPreview,
  CTASection,
  Footer,
} from '@/components/marketing';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main>
        <HeroSection />
        <SocialProof />
        <HowItWorks />
        <FeaturesOverview />
        <Testimonials />
        <PricingPreview />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
'''

# ============================================
# FIX 8: BLOG DYNAMIC ROUTE
# ============================================
BLOG_SLUG_PAGE = '''\'use client\';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components/marketing';

const posts: Record<string, { title: string; content: string; date: string; category: string; author: string }> = {
  '1': {
    title: 'Introducing OLYMPUS 2.0',
    content: `We are excited to announce OLYMPUS 2.0, the biggest update since we launched. This release brings AI-powered code generation to a whole new level.

## What is New

### AI Code Generation
Our new AI understands context better than ever. Describe what you want in plain English, and watch as production-ready code appears before your eyes.

### Visual Builder 2.0
The visual builder has been completely redesigned. Drag and drop components, see changes in real-time, and switch to code view whenever you need more control.

### One-Click Deploy
Deploy to production with a single click. We handle SSL, CDN, and scaling automatically.

## What is Next

We are just getting started. Stay tuned for more updates coming soon.`,
    date: 'Jan 20, 2026',
    category: 'Product',
    author: 'OLYMPUS Team',
  },
  '2': {
    title: 'How to Build an E-commerce Store in 10 Minutes',
    content: `Learn how to create a fully functional e-commerce store using OLYMPUS in just 10 minutes.

## Step 1: Create Your Project
Start by creating a new project in OLYMPUS. Select the E-commerce template to get started with pre-built components.

## Step 2: Customize Your Store
Use the visual builder to customize your store layout, colors, and branding. Add your products and configure payment settings.

## Step 3: Connect Payments
OLYMPUS integrates with Stripe out of the box. Connect your Stripe account and start accepting payments immediately.

## Step 4: Deploy
Click the deploy button and your store is live. Share the link with your customers and start selling.

That is it! You now have a fully functional e-commerce store.`,
    date: 'Jan 18, 2026',
    category: 'Tutorial',
    author: 'Sarah Chen',
  },
  '3': {
    title: 'The Future of No-Code Development',
    content: `AI is changing everything about how we build software. Here is what we see coming.

## The Current State

No-code tools have democratized software development. But they have limitations - complex logic, custom integrations, and scalability challenges.

## Enter AI

AI-powered development tools like OLYMPUS bridge the gap. You get the speed of no-code with the flexibility of traditional development.

## What is Next

We believe the future is hybrid - AI that understands your intent, generates code, but gives you full control when you need it.

The best developers will be those who can leverage AI effectively.`,
    date: 'Jan 15, 2026',
    category: 'Industry',
    author: 'Marcus Johnson',
  },
  '4': {
    title: 'Case Study: How Startup X Saved 6 Months',
    content: `Real results from a real startup using OLYMPUS to build their MVP.

## The Challenge

Startup X had a great idea but limited runway. They needed to launch fast to validate their concept before running out of money.

## The Solution

Using OLYMPUS, their small team built a complete SaaS platform in 3 weeks instead of the estimated 6 months.

## The Results

- 85% reduction in development time
- $150,000 saved in development costs
- Launched MVP 5 months ahead of schedule
- Successfully raised seed funding

## Key Takeaways

Speed matters in startups. Tools like OLYMPUS let you move fast without sacrificing quality.`,
    date: 'Jan 12, 2026',
    category: 'Case Study',
    author: 'Emily Rodriguez',
  },
};

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const post = posts[slug];

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <Header />
        <main className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 text-center py-24">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Post Not Found</h1>
            <p className="text-slate-600 mb-8">The blog post you are looking for does not exist.</p>
            <Link href="/blog" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Back to Blog
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="pt-24 pb-16">
        <article className="max-w-4xl mx-auto px-4">
          {/* Back Link */}
          <Link href="/blog" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Blog
          </Link>

          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                {post.category}
              </span>
              <span className="text-slate-500">{post.date}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">{post.title}</h1>
            <p className="text-slate-600">By {post.author}</p>
          </header>

          {/* Content */}
          <div className="prose prose-lg prose-slate max-w-none">
            {post.content.split('\\n\\n').map((paragraph, i) => {
              if (paragraph.startsWith('## ')) {
                return <h2 key={i} className="text-2xl font-bold text-slate-900 mt-8 mb-4">{paragraph.replace('## ', '')}</h2>;
              }
              if (paragraph.startsWith('### ')) {
                return <h3 key={i} className="text-xl font-semibold text-slate-900 mt-6 mb-3">{paragraph.replace('### ', '')}</h3>;
              }
              if (paragraph.startsWith('- ')) {
                return (
                  <ul key={i} className="list-disc list-inside space-y-2 my-4">
                    {paragraph.split('\\n').map((item, j) => (
                      <li key={j} className="text-slate-600">{item.replace('- ', '')}</li>
                    ))}
                  </ul>
                );
              }
              return <p key={i} className="text-slate-600 mb-4">{paragraph}</p>;
            })}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
'''

# ============================================
# FIX 9: DOCS DYNAMIC ROUTE
# ============================================
DOCS_SLUG_PAGE = '''\'use client\';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components/marketing';

const docs: Record<string, { title: string; content: string; icon: string }> = {
  'getting-started': {
    title: 'Getting Started',
    icon: '🚀',
    content: `Welcome to OLYMPUS! This guide will help you get up and running in 5 minutes.

## Create Your Account

1. Visit olympus.dev and click "Start Free"
2. Sign up with your email or GitHub account
3. Verify your email address

## Create Your First Project

1. Click "New Project" from your dashboard
2. Choose a template or start from scratch
3. Give your project a name

## Using the AI Builder

1. Open the AI panel (press Cmd+K)
2. Describe what you want to build
3. Watch as OLYMPUS generates your code

## Using the Visual Builder

1. Switch to Visual mode
2. Drag components from the sidebar
3. Click to select and edit properties

## Deploy Your App

1. Click the "Deploy" button
2. Choose your deployment settings
3. Your app is now live!

That is it! You have created and deployed your first OLYMPUS app.`,
  },
  'ai-generation': {
    title: 'AI Generation',
    icon: '⚡',
    content: `Learn how to use OLYMPUS AI to generate code from natural language.

## Basic Usage

Press Cmd+K (or Ctrl+K on Windows) to open the AI panel. Type what you want to build in plain English.

### Examples

- "Create a contact form with name, email, and message fields"
- "Add a navigation bar with logo and links"
- "Build a pricing table with 3 tiers"

## Tips for Better Results

### Be Specific
Instead of "make a form", say "create a contact form with validation that sends to my email".

### Provide Context
Tell the AI about your app: "This is a SaaS dashboard, add a sidebar with user profile".

### Iterate
Start simple, then ask for refinements: "Make the button blue" or "Add hover effects".

## Advanced Features

### Multi-step Generation
Break complex features into steps for better results.

### Code Review
Ask the AI to review and improve existing code.

### Documentation
Generate comments and documentation automatically.`,
  },
  'visual-builder': {
    title: 'Visual Builder',
    icon: '🎨',
    content: `Master the drag-and-drop visual builder.

## Interface Overview

- **Left Sidebar**: Component library
- **Center Canvas**: Your page preview
- **Right Panel**: Properties and styles

## Adding Components

1. Browse the component library
2. Drag a component onto the canvas
3. Drop it where you want it

## Editing Components

1. Click to select a component
2. Edit properties in the right panel
3. Changes appear in real-time

## Layout Tools

### Containers
Use Flex and Grid containers for layouts.

### Spacing
Adjust padding and margin with visual controls.

### Responsive
Toggle device views to design for all screens.

## Keyboard Shortcuts

- **Cmd+C**: Copy selected
- **Cmd+V**: Paste
- **Cmd+Z**: Undo
- **Cmd+Shift+Z**: Redo
- **Delete**: Remove selected`,
  },
  'components': {
    title: 'Components',
    icon: '📦',
    content: `Explore our library of 100+ pre-built components.

## Categories

### Layout
- Container, Grid, Flex, Stack, Divider

### Navigation
- Navbar, Sidebar, Tabs, Breadcrumb, Pagination

### Forms
- Input, Textarea, Select, Checkbox, Radio, Switch

### Data Display
- Table, Card, List, Badge, Avatar, Tooltip

### Feedback
- Alert, Toast, Modal, Drawer, Progress

### E-commerce
- ProductCard, Cart, Checkout, PriceTag

## Using Components

### From Visual Builder
Drag and drop from the sidebar.

### From AI
Ask the AI to add specific components.

### From Code
Import from @/components library.

## Customizing Components

All components accept props for customization:
- Colors and themes
- Sizes and spacing
- Variants and states`,
  },
  'database': {
    title: 'Database',
    icon: '🗄️',
    content: `Connect and manage your data with OLYMPUS.

## Supported Databases

- **PostgreSQL**: Full support
- **MySQL**: Full support
- **MongoDB**: Full support
- **Supabase**: Native integration
- **Firebase**: Native integration

## Connecting Your Database

1. Go to Project Settings > Database
2. Enter your connection string
3. Click "Test Connection"
4. Save your settings

## Working with Data

### Models
Define your data models in the Models tab.

### Queries
Use the Query Builder or write raw SQL.

### Migrations
OLYMPUS handles migrations automatically.

## Best Practices

- Use environment variables for credentials
- Set up proper indexes
- Enable connection pooling
- Regular backups`,
  },
  'deployment': {
    title: 'Deployment',
    icon: '🚢',
    content: `Deploy your OLYMPUS app to production.

## One-Click Deploy

1. Click "Deploy" in the top bar
2. Choose your settings
3. Done! Your app is live

## Deployment Options

### OLYMPUS Cloud (Recommended)
- Zero configuration
- Global CDN
- Automatic SSL
- DDoS protection

### Vercel
- Native integration
- Preview deployments
- Edge functions

### Custom
- Export your code
- Deploy anywhere

## Environment Variables

1. Go to Settings > Environment
2. Add your variables
3. Redeploy to apply

## Custom Domains

1. Go to Settings > Domains
2. Add your domain
3. Update DNS records
4. SSL is automatic

## Monitoring

- View deployment logs
- Monitor performance
- Set up alerts`,
  },
};

export default function DocsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const doc = docs[slug];

  if (!doc) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <Header />
        <main className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 text-center py-24">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Page Not Found</h1>
            <p className="text-slate-600 mb-8">The documentation page you are looking for does not exist.</p>
            <Link href="/docs" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Back to Documentation
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const docKeys = Object.keys(docs);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-8">
            {/* Sidebar */}
            <aside className="hidden lg:block w-64 shrink-0">
              <nav className="sticky top-24 space-y-1">
                {docKeys.map((key) => (
                  <Link
                    key={key}
                    href={`/docs/${key}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      key === slug
                        ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 font-medium'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{docs[key].icon}</span>
                    <span>{docs[key].title}</span>
                  </Link>
                ))}
              </nav>
            </aside>

            {/* Content */}
            <article className="flex-1 max-w-3xl">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
                <Link href="/docs" className="hover:text-indigo-600">Docs</Link>
                <span>/</span>
                <span className="text-slate-900">{doc.title}</span>
              </div>

              {/* Header */}
              <header className="mb-8">
                <div className="text-4xl mb-4">{doc.icon}</div>
                <h1 className="text-4xl font-bold text-slate-900">{doc.title}</h1>
              </header>

              {/* Content */}
              <div className="prose prose-lg prose-slate max-w-none">
                {doc.content.split('\\n\\n').map((paragraph, i) => {
                  if (paragraph.startsWith('## ')) {
                    return <h2 key={i} className="text-2xl font-bold text-slate-900 mt-8 mb-4">{paragraph.replace('## ', '')}</h2>;
                  }
                  if (paragraph.startsWith('### ')) {
                    return <h3 key={i} className="text-xl font-semibold text-slate-900 mt-6 mb-3">{paragraph.replace('### ', '')}</h3>;
                  }
                  if (paragraph.startsWith('- ')) {
                    return (
                      <ul key={i} className="list-disc list-inside space-y-2 my-4">
                        {paragraph.split('\\n').map((item, j) => (
                          <li key={j} className="text-slate-600">{item.replace('- ', '')}</li>
                        ))}
                      </ul>
                    );
                  }
                  if (paragraph.match(/^\d+\./)) {
                    return (
                      <ol key={i} className="list-decimal list-inside space-y-2 my-4">
                        {paragraph.split('\\n').map((item, j) => (
                          <li key={j} className="text-slate-600">{item.replace(/^\d+\.\s*/, '')}</li>
                        ))}
                      </ol>
                    );
                  }
                  return <p key={i} className="text-slate-600 mb-4">{paragraph}</p>;
                })}
              </div>
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
'''

# ============================================
# FIX 10: LEGAL PAGES (PRIVACY, TERMS, ETC)
# ============================================
def create_legal_page(title, content):
    return f'''\'use client\';

import {{ Header, Footer }} from '@/components/marketing';

export default function {title.replace(' ', '')}Page() {{
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-slate-900 mb-8">{title}</h1>
          <div className="prose prose-lg prose-slate max-w-none bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-lg">
            <p className="text-slate-500 mb-8">Last updated: January 20, 2026</p>
            {content}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}}
'''

PRIVACY_CONTENT = '''<h2>1. Information We Collect</h2>
            <p>We collect information you provide directly, such as account details, project data, and communications with us.</p>

            <h2>2. How We Use Your Information</h2>
            <p>We use your information to provide and improve our services, communicate with you, and ensure security.</p>

            <h2>3. Information Sharing</h2>
            <p>We do not sell your personal information. We may share data with service providers who assist in our operations.</p>

            <h2>4. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data.</p>

            <h2>5. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal information at any time.</p>

            <h2>6. Contact Us</h2>
            <p>For privacy-related questions, contact us at privacy@olympus.dev</p>'''

TERMS_CONTENT = '''<h2>1. Acceptance of Terms</h2>
            <p>By using OLYMPUS, you agree to these Terms of Service and our Privacy Policy.</p>

            <h2>2. Use of Service</h2>
            <p>You may use OLYMPUS for lawful purposes only. You are responsible for all activity under your account.</p>

            <h2>3. Intellectual Property</h2>
            <p>You retain ownership of content you create. We retain ownership of the OLYMPUS platform and technology.</p>

            <h2>4. Payment Terms</h2>
            <p>Paid plans are billed monthly or annually. Refunds are available within 14 days of purchase.</p>

            <h2>5. Limitation of Liability</h2>
            <p>OLYMPUS is provided "as is" without warranties. Our liability is limited to the amount you paid us.</p>

            <h2>6. Changes to Terms</h2>
            <p>We may update these terms. Continued use after changes constitutes acceptance.</p>'''

SECURITY_CONTENT = '''<h2>Our Security Commitment</h2>
            <p>Security is fundamental to OLYMPUS. We implement comprehensive measures to protect your data.</p>

            <h2>Infrastructure Security</h2>
            <p>All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Our infrastructure runs on SOC 2 compliant providers.</p>

            <h2>Application Security</h2>
            <p>Regular security audits, penetration testing, and vulnerability scanning. Bug bounty program for responsible disclosure.</p>

            <h2>Access Controls</h2>
            <p>Role-based access control, multi-factor authentication, and single sign-on (SSO) for enterprise plans.</p>

            <h2>Data Protection</h2>
            <p>Automated backups, disaster recovery procedures, and data retention policies aligned with industry standards.</p>

            <h2>Report a Vulnerability</h2>
            <p>Found a security issue? Email security@olympus.dev. We appreciate responsible disclosure.</p>'''

COOKIES_CONTENT = '''<h2>What Are Cookies</h2>
            <p>Cookies are small text files stored on your device when you visit websites.</p>

            <h2>How We Use Cookies</h2>
            <p><strong>Essential:</strong> Required for the platform to function (authentication, preferences).</p>
            <p><strong>Analytics:</strong> Help us understand how you use OLYMPUS to improve our service.</p>
            <p><strong>Marketing:</strong> Used to show relevant content and measure campaign effectiveness.</p>

            <h2>Managing Cookies</h2>
            <p>You can control cookies through your browser settings. Note that disabling essential cookies may affect functionality.</p>

            <h2>Third-Party Cookies</h2>
            <p>We use services like Google Analytics and Stripe that may set their own cookies.</p>

            <h2>Updates</h2>
            <p>We may update this policy. Check back periodically for changes.</p>'''

# ============================================
# FIX 11: PLACEHOLDER PAGES
# ============================================
PLACEHOLDER_PAGE = '''\'use client\';

import Link from 'next/link';
import { Header, Footer } from '@/components/marketing';

export default function PlaceholderPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 text-center py-24">
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
            <span className="text-4xl">🚧</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Coming Soon</h1>
          <p className="text-xl text-slate-600 mb-8">
            This page is under construction. Check back soon!
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
'''

# ============================================
# SAVE ALL FIXES
# ============================================
def save_all():
    print("=" * 60)
    print("OLYMPUS CHEF FIX - Repairing All Issues")
    print("=" * 60)

    # 1. Fix Footer
    filepath = os.path.join(MARKETING_DIR, "Footer.tsx")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(FOOTER_FIXED)
    print("[OK] Fixed Footer.tsx (real links)")

    # 2. Add Testimonials
    filepath = os.path.join(MARKETING_DIR, "Testimonials.tsx")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(TESTIMONIALS)
    print("[OK] Added Testimonials.tsx")

    # 3. Add HowItWorks
    filepath = os.path.join(MARKETING_DIR, "HowItWorks.tsx")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(HOW_IT_WORKS)
    print("[OK] Added HowItWorks.tsx")

    # 4. Add CTASection
    filepath = os.path.join(MARKETING_DIR, "CTASection.tsx")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(CTA_SECTION)
    print("[OK] Added CTASection.tsx")

    # 5. Add PricingPreview
    filepath = os.path.join(MARKETING_DIR, "PricingPreview.tsx")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(PRICING_PREVIEW)
    print("[OK] Added PricingPreview.tsx")

    # 6. Update index
    filepath = os.path.join(MARKETING_DIR, "index.ts")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(MARKETING_INDEX)
    print("[OK] Updated marketing/index.ts")

    # 7. Update home page
    filepath = os.path.join(APP_DIR, "page.tsx")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(HOME_PAGE)
    print("[OK] Updated home page (all sections)")

    # 8. Create blog dynamic route
    blog_slug_dir = os.path.join(APP_DIR, "blog", "[slug]")
    os.makedirs(blog_slug_dir, exist_ok=True)
    filepath = os.path.join(blog_slug_dir, "page.tsx")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(BLOG_SLUG_PAGE)
    print("[OK] Created /blog/[slug]/page.tsx")

    # 9. Create docs dynamic route
    docs_slug_dir = os.path.join(APP_DIR, "docs", "[slug]")
    os.makedirs(docs_slug_dir, exist_ok=True)
    filepath = os.path.join(docs_slug_dir, "page.tsx")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(DOCS_SLUG_PAGE)
    print("[OK] Created /docs/[slug]/page.tsx")

    # 10. Create legal pages
    legal_pages = {
        'privacy': ('Privacy Policy', PRIVACY_CONTENT),
        'terms': ('Terms of Service', TERMS_CONTENT),
        'security': ('Security', SECURITY_CONTENT),
        'cookies': ('Cookie Policy', COOKIES_CONTENT),
    }

    for slug, (title, content) in legal_pages.items():
        page_dir = os.path.join(APP_DIR, slug)
        os.makedirs(page_dir, exist_ok=True)
        filepath = os.path.join(page_dir, "page.tsx")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(create_legal_page(title, content))
        print(f"[OK] Created /{slug}/page.tsx")

    # 11. Create placeholder pages
    placeholder_pages = ['templates', 'changelog', 'tutorials', 'community', 'careers', 'partners', 'demo']
    for slug in placeholder_pages:
        page_dir = os.path.join(APP_DIR, slug)
        os.makedirs(page_dir, exist_ok=True)
        filepath = os.path.join(page_dir, "page.tsx")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(PLACEHOLDER_PAGE)
        print(f"[OK] Created /{slug}/page.tsx (placeholder)")

    print("\n" + "=" * 60)
    print("ALL FIXES APPLIED!")
    print("=" * 60)
    print("\nFixed:")
    print("  - Footer links now go to real pages")
    print("  - Home page has all marketing sections")
    print("  - Blog posts have dynamic routes")
    print("  - Docs have dynamic routes")
    print("  - Legal pages created")
    print("  - Placeholder pages for coming soon content")
    print("\nRefresh http://localhost:3001 to see changes!")

if __name__ == '__main__':
    save_all()
