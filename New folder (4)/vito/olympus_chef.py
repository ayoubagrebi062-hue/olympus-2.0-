"""
OLYMPUS CHEF - Claude Code Generator
=====================================
This script acts as a bridge between OLYMPUS and Claude.
Claude generates the code, Python saves it.
"""

import os

# Output directory
OUTPUT_DIR = r"C:\Users\SBS\Desktop\New folder (4)\vito\src\components\marketing"

# Ensure directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================
# COMPONENT 1: HEADER (Glassmorphism + Light)
# ============================================
HEADER_CODE = '''\'use client\';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/70 backdrop-blur-xl shadow-lg shadow-slate-200/50 border-b border-white/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all group-hover:scale-105">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              OLYMPUS
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {['Features', 'Pricing', 'Docs', 'Blog'].map((item) => (
              <Link
                key={item}
                href={`/${item.toLowerCase()}`}
                className="px-4 py-2 text-slate-600 hover:text-indigo-600 font-medium transition-all rounded-lg hover:bg-indigo-50"
              >
                {item}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-slate-600 hover:text-indigo-600 font-medium transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-indigo-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 bg-white/90 backdrop-blur-xl border-b border-white/20 shadow-lg transition-all duration-300 ${
          menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="px-4 py-6 space-y-4">
          {['Features', 'Pricing', 'Docs', 'Blog'].map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase()}`}
              className="block px-4 py-3 text-slate-600 hover:text-indigo-600 font-medium rounded-xl hover:bg-indigo-50"
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </Link>
          ))}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <Link href="/login" className="block px-4 py-3 text-center text-slate-600 font-medium rounded-xl hover:bg-slate-50">
              Log in
            </Link>
            <Link href="/signup" className="block px-4 py-3 text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-lg">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
'''

# ============================================
# COMPONENT 2: HERO SECTION
# ============================================
HERO_CODE = '''\'use client\';

import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Floating Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-400/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-xl border border-white/20 rounded-full shadow-lg mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-slate-600">Now in Public Beta</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 animate-fade-in-up">
            Build Anything.{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              50X Faster.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-10 animate-fade-in-up delay-100">
            The ALL-IN-ONE platform that combines App Builder, E-commerce, Website Builder, and Mobile Apps.
            Describe what you want, watch it build.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up delay-200">
            <Link
              href="/signup"
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg rounded-2xl shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all"
            >
              Start Building Free
            </Link>
            <Link
              href="/demo"
              className="group px-8 py-4 bg-white/60 backdrop-blur-xl border border-white/20 text-slate-700 font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Demo
            </Link>
          </div>

          {/* Preview Card */}
          <div className="relative max-w-4xl mx-auto animate-fade-in-up delay-300">
            <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-2 md:p-4">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 md:p-8">
                {/* Code Preview Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-4 text-slate-400 text-sm font-mono">olympus-app/src/App.tsx</span>
                </div>
                {/* Code */}
                <pre className="text-left text-sm md:text-base font-mono text-slate-300 overflow-x-auto">
                  <code>{`// AI-generated in seconds
export default function App() {
  return (
    <Dashboard>
      <Sidebar />
      <MainContent>
        <Analytics data={metrics} />
        <RecentOrders />
      </MainContent>
    </Dashboard>
  );
}`}</code>
                </pre>
              </div>
            </div>
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
'''

# ============================================
# COMPONENT 3: SOCIAL PROOF
# ============================================
SOCIAL_PROOF_CODE = '''\'use client\';

export function SocialProof() {
  const logos = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix'];
  const stats = [
    { value: '50,000+', label: 'Apps Built' },
    { value: '99.9%', label: 'Uptime' },
    { value: '4.9/5', label: 'Rating' },
  ];

  return (
    <section className="py-20 bg-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logos */}
        <p className="text-center text-slate-500 text-sm font-medium mb-8">
          TRUSTED BY TEAMS AT
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 mb-16 opacity-60">
          {logos.map((logo) => (
            <div key={logo} className="text-2xl font-bold text-slate-400">
              {logo}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center p-8 bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-slate-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
'''

# ============================================
# COMPONENT 4: FEATURES OVERVIEW
# ============================================
FEATURES_CODE = '''\'use client\';

export function FeaturesOverview() {
  const features = [
    {
      icon: '⚡',
      title: 'AI-Powered Generation',
      description: 'Describe what you want in plain English. Our AI builds production-ready code in seconds.',
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      icon: '🎨',
      title: 'Visual Builder',
      description: 'Drag-and-drop interface for those who prefer visual editing. No coding required.',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: '🚀',
      title: 'One-Click Deploy',
      description: 'Deploy to Vercel, Netlify, or AWS with a single click. Custom domains included.',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      icon: '🗄️',
      title: 'Built-in Database',
      description: 'Supabase integration with real-time sync, auth, and storage out of the box.',
      gradient: 'from-cyan-500 to-blue-500',
    },
    {
      icon: '🔐',
      title: 'Authentication',
      description: 'Social login, magic links, 2FA - enterprise-grade security with zero config.',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: '🛒',
      title: 'E-commerce Ready',
      description: 'Stripe payments, inventory management, order tracking - everything to sell online.',
      gradient: 'from-orange-500 to-amber-500',
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-white/50 to-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Build & Ship
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            One platform replaces your entire tech stack. Build faster, ship sooner.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group p-8 bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>
              {/* Content */}
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
'''

# ============================================
# COMPONENT 5: FOOTER
# ============================================
FOOTER_CODE = '''\'use client\';

import Link from 'next/link';

export function Footer() {
  const links = {
    Product: ['Features', 'Pricing', 'Templates', 'Changelog'],
    Resources: ['Documentation', 'Tutorials', 'Blog', 'Community'],
    Company: ['About', 'Careers', 'Contact', 'Partners'],
    Legal: ['Privacy', 'Terms', 'Security', 'Cookies'],
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
            <div className="flex gap-4">
              {['twitter', 'github', 'discord'].map((social) => (
                <a key={social} href="#" className="text-slate-400 hover:text-indigo-600 transition-colors">
                  <span className="sr-only">{social}</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-indigo-50 flex items-center justify-center transition-colors">
                    <span className="text-xs font-bold uppercase">{social[0]}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-semibold text-slate-900 mb-4">{category}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-slate-500 hover:text-indigo-600 transition-colors text-sm">
                      {item}
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
            © 2026 OLYMPUS. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-slate-500 hover:text-indigo-600 text-sm">Privacy Policy</Link>
            <Link href="#" className="text-slate-500 hover:text-indigo-600 text-sm">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
'''

# ============================================
# COMPONENT 6: INDEX (Export all)
# ============================================
INDEX_CODE = '''// OLYMPUS Marketing Components
// Light Theme + Glassmorphism Design

export { Header } from './Header';
export { HeroSection } from './HeroSection';
export { SocialProof } from './SocialProof';
export { FeaturesOverview } from './FeaturesOverview';
export { Footer } from './Footer';
'''

# ============================================
# SAVE ALL COMPONENTS
# ============================================
def save_components():
    components = {
        'Header.tsx': HEADER_CODE,
        'HeroSection.tsx': HERO_CODE,
        'SocialProof.tsx': SOCIAL_PROOF_CODE,
        'FeaturesOverview.tsx': FEATURES_CODE,
        'Footer.tsx': FOOTER_CODE,
        'index.ts': INDEX_CODE,
    }

    print("=" * 50)
    print("OLYMPUS CHEF - Generating Components")
    print("=" * 50)
    print(f"Output: {OUTPUT_DIR}\n")

    for filename, code in components.items():
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"[OK] Created: {filename}")

    print("\n" + "=" * 50)
    print("All components generated successfully!")
    print("=" * 50)

if __name__ == '__main__':
    save_components()
