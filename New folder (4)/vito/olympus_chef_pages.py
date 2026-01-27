"""
OLYMPUS CHEF - Extra Pages
============================
Light Theme + Glassmorphism Design
"""

import os

PAGES_DIR = r"C:\Users\SBS\Desktop\New folder (4)\vito\src\app"

# ============================================
# FEATURES PAGE
# ============================================
FEATURES_PAGE = '''\'use client\';

import { Header, Footer } from '@/components/marketing';

const features = [
  {
    category: 'AI-Powered Generation',
    icon: '⚡',
    gradient: 'from-indigo-500 to-purple-500',
    items: [
      { title: 'Natural Language Input', desc: 'Describe your app in plain English. Our AI understands context and intent.' },
      { title: 'Real-Time Code Generation', desc: 'Watch as your app is built line by line with full transparency.' },
      { title: 'Smart Suggestions', desc: 'AI suggests improvements and catches potential issues automatically.' },
      { title: 'Context-Aware Editing', desc: 'Make changes by describing what you want. AI understands your codebase.' },
    ],
  },
  {
    category: 'Visual Builder',
    icon: '🎨',
    gradient: 'from-purple-500 to-pink-500',
    items: [
      { title: 'Drag & Drop Interface', desc: 'Build layouts visually by dragging components. No coding required.' },
      { title: 'Real-Time Preview', desc: 'See changes instantly. Desktop, tablet, and mobile views.' },
      { title: 'Component Library', desc: '100+ pre-built components. Buttons, forms, cards, charts.' },
      { title: 'Full Code Access', desc: 'Switch to code view anytime. Clean, readable code.' },
    ],
  },
  {
    category: 'One-Click Deploy',
    icon: '🚀',
    gradient: 'from-cyan-500 to-blue-500',
    items: [
      { title: 'Vercel Integration', desc: 'Deploy with one click. Automatic builds and previews.' },
      { title: 'Custom Domains', desc: 'Connect your own domain. SSL configured automatically.' },
      { title: 'Global CDN', desc: 'Your app served from 100+ edge locations worldwide.' },
      { title: 'Environment Variables', desc: 'Manage secrets securely. Different values per environment.' },
    ],
  },
  {
    category: 'E-commerce Ready',
    icon: '🛒',
    gradient: 'from-orange-500 to-amber-500',
    items: [
      { title: 'Stripe Integration', desc: 'Accept payments in minutes. Cards, wallets, local methods.' },
      { title: 'Product Management', desc: 'Inventory, variants, pricing. Everything organized.' },
      { title: 'Order Fulfillment', desc: 'Track orders, manage shipping, handle returns.' },
      { title: 'Analytics Dashboard', desc: 'Sales, conversion rates, customer insights.' },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="py-16 text-center">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Build & Ship
              </span>
            </h1>
            <p className="text-xl text-slate-600">
              One platform replaces your entire tech stack. From idea to production in minutes.
            </p>
          </div>
        </section>

        {/* Features */}
        {features.map((section, i) => (
          <section key={i} className={`py-16 ${i % 2 === 1 ? 'bg-white/50' : ''}`}>
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center text-2xl shadow-lg`}>
                  {section.icon}
                </div>
                <h2 className="text-3xl font-bold text-slate-900">{section.category}</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {section.items.map((item, j) => (
                  <div key={j} className="p-6 bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                    <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
'''

# ============================================
# PRICING PAGE
# ============================================
PRICING_PAGE = '''\'use client\';

import { useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components/marketing';

const plans = [
  {
    name: 'Free',
    desc: 'Perfect for trying out OLYMPUS',
    monthly: 0,
    annual: 0,
    features: ['5 projects', '1GB storage', 'Community support', 'Basic templates', 'OLYMPUS subdomain'],
    notIncluded: ['Custom domains', 'Remove branding', 'Team collaboration', 'Priority support'],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Pro',
    desc: 'For serious builders and startups',
    monthly: 29,
    annual: 24,
    features: ['Unlimited projects', '50GB storage', 'Priority support', 'All templates', 'Custom domains', 'Remove branding', 'API access', 'Analytics dashboard'],
    notIncluded: ['Team collaboration', 'SSO / SAML'],
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    name: 'Team',
    desc: 'For teams and agencies',
    monthly: 99,
    annual: 79,
    features: ['Everything in Pro', 'Unlimited storage', 'Team collaboration', 'White-label', 'SSO / SAML', 'Audit logs', 'Dedicated support', 'Custom integrations'],
    notIncluded: [],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="py-16 text-center">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              Simple,{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                transparent
              </span>{' '}
              pricing
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Start free, upgrade when you are ready. No hidden fees.
            </p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-4 p-1.5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-full shadow-lg">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  !annual ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-slate-600'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  annual ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-slate-600'
                }`}
              >
                Annual
                <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Save 20%</span>
              </button>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative bg-white/60 backdrop-blur-xl border rounded-2xl shadow-lg overflow-hidden transition-all hover:-translate-y-1 ${
                    plan.popular ? 'border-indigo-500 shadow-xl scale-105' : 'border-white/20'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold text-center py-2">
                      MOST POPULAR
                    </div>
                  )}
                  <div className={`p-8 ${plan.popular ? 'pt-12' : ''}`}>
                    <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-slate-500 text-sm mt-1">{plan.desc}</p>
                    <div className="mt-6">
                      <span className="text-5xl font-bold text-slate-900">
                        ${annual ? plan.annual : plan.monthly}
                      </span>
                      {plan.monthly > 0 && (
                        <span className="text-slate-500 ml-2">/month</span>
                      )}
                    </div>
                    <ul className="mt-8 space-y-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-3 text-slate-600">
                          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                      {plan.notIncluded.map((f) => (
                        <li key={f} className="flex items-center gap-3 text-slate-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/signup"
                      className={`block w-full mt-8 py-3 text-center font-semibold rounded-xl transition-all ${
                        plan.popular
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl'
                          : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
'''

# ============================================
# ABOUT PAGE
# ============================================
ABOUT_PAGE = '''\'use client\';

import { Header, Footer } from '@/components/marketing';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* Hero */}
          <section className="py-16 text-center">
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              About{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                OLYMPUS
              </span>
            </h1>
            <p className="text-xl text-slate-600">
              We are building the future of app development.
            </p>
          </section>

          {/* Mission */}
          <section className="py-12">
            <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
              <p className="text-slate-600 leading-relaxed">
                OLYMPUS was born from a simple idea: building software should not be this hard.
                We are combining the power of AI with intuitive design to create a platform where
                anyone can build production-ready apps, websites, and e-commerce stores in minutes,
                not months.
              </p>
            </div>
          </section>

          {/* Values */}
          <section className="py-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: '⚡', title: 'Speed', desc: '50X faster than traditional development.' },
                { icon: '🎯', title: 'Simplicity', desc: 'Powerful features, simple interface.' },
                { icon: '🔒', title: 'Security', desc: 'Enterprise-grade security by default.' },
              ].map((v) => (
                <div key={v.title} className="p-6 bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl text-center">
                  <div className="text-4xl mb-4">{v.icon}</div>
                  <h3 className="font-semibold text-slate-900 mb-2">{v.title}</h3>
                  <p className="text-slate-600 text-sm">{v.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
'''

# ============================================
# CONTACT PAGE
# ============================================
CONTACT_PAGE = '''\'use client\';

import { Header, Footer } from '@/components/marketing';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <section className="py-16 text-center">
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              Get in{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Touch
              </span>
            </h1>
            <p className="text-xl text-slate-600">
              Have questions? We would love to hear from you.
            </p>
          </section>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-lg">
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="How can we help?"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Send Message
                </button>
              </form>
            </div>

            {/* Info */}
            <div className="space-y-6">
              {[
                { icon: '📧', title: 'Email', value: 'hello@olympus.dev' },
                { icon: '💬', title: 'Discord', value: 'discord.gg/olympus' },
                { icon: '🐦', title: 'Twitter', value: '@olympusdev' },
              ].map((c) => (
                <div key={c.title} className="p-6 bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg flex items-center gap-4">
                  <div className="text-3xl">{c.icon}</div>
                  <div>
                    <div className="font-medium text-slate-900">{c.title}</div>
                    <div className="text-indigo-600">{c.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
'''

# ============================================
# BLOG PAGE
# ============================================
BLOG_PAGE = '''\'use client\';

import Link from 'next/link';
import { Header, Footer } from '@/components/marketing';

const posts = [
  { slug: '1', title: 'Introducing OLYMPUS 2.0', desc: 'The biggest update yet with AI-powered code generation.', date: 'Jan 20, 2026', category: 'Product' },
  { slug: '2', title: 'How to Build an E-commerce Store in 10 Minutes', desc: 'Step-by-step guide to launching your online store.', date: 'Jan 18, 2026', category: 'Tutorial' },
  { slug: '3', title: 'The Future of No-Code Development', desc: 'Why AI is changing everything about how we build software.', date: 'Jan 15, 2026', category: 'Industry' },
  { slug: '4', title: 'Case Study: How Startup X Saved 6 Months', desc: 'Real results from real customers using OLYMPUS.', date: 'Jan 12, 2026', category: 'Case Study' },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <section className="py-16 text-center">
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Blog
              </span>
            </h1>
            <p className="text-xl text-slate-600">
              News, tutorials, and insights from the OLYMPUS team.
            </p>
          </section>

          <div className="space-y-6">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <div className="p-6 bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                      {post.category}
                    </span>
                    <span className="text-slate-500 text-sm">{post.date}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">{post.title}</h2>
                  <p className="text-slate-600">{post.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
'''

# ============================================
# DOCS PAGE
# ============================================
DOCS_PAGE = '''\'use client\';

import Link from 'next/link';
import { Header, Footer } from '@/components/marketing';

const sections = [
  { icon: '🚀', title: 'Getting Started', desc: 'Learn the basics of OLYMPUS in 5 minutes.', href: '/docs/getting-started' },
  { icon: '⚡', title: 'AI Generation', desc: 'How to use natural language to build apps.', href: '/docs/ai-generation' },
  { icon: '🎨', title: 'Visual Builder', desc: 'Master the drag-and-drop interface.', href: '/docs/visual-builder' },
  { icon: '📦', title: 'Components', desc: 'Explore our 100+ pre-built components.', href: '/docs/components' },
  { icon: '🗄️', title: 'Database', desc: 'Connect and manage your data.', href: '/docs/database' },
  { icon: '🚢', title: 'Deployment', desc: 'Deploy your app to production.', href: '/docs/deployment' },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <section className="py-16 text-center">
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Documentation
              </span>
            </h1>
            <p className="text-xl text-slate-600">
              Everything you need to build with OLYMPUS.
            </p>
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            {sections.map((s) => (
              <Link key={s.title} href={s.href}>
                <div className="p-6 bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all h-full">
                  <div className="text-3xl mb-4">{s.icon}</div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">{s.title}</h2>
                  <p className="text-slate-600 text-sm">{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
'''

# ============================================
# SAVE ALL
# ============================================
def save_all():
    print("=" * 50)
    print("OLYMPUS CHEF - Extra Pages")
    print("=" * 50)

    pages = {
        'features': FEATURES_PAGE,
        'pricing': PRICING_PAGE,
        'about': ABOUT_PAGE,
        'contact': CONTACT_PAGE,
        'blog': BLOG_PAGE,
        'docs': DOCS_PAGE,
    }

    for name, code in pages.items():
        page_dir = os.path.join(PAGES_DIR, name)
        os.makedirs(page_dir, exist_ok=True)
        filepath = os.path.join(page_dir, 'page.tsx')
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"[OK] /{name}")

    print("\n" + "=" * 50)
    print("All extra pages generated!")
    print("=" * 50)

if __name__ == '__main__':
    save_all()
