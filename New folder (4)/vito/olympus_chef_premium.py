"""
OLYMPUS CHEF PREMIUM - World-Class Glassmorphism Design
=========================================================
NOT lazy AI design. REAL premium glassmorphism with:
- Multi-layer depth
- Gradient borders
- Inner glow effects
- Animated mesh backgrounds
- Floating 3D elements
- Premium typography
- Unique visual identity
"""

import os

BASE_DIR = r"C:\Users\SBS\Desktop\New folder (4)\vito\src"
MARKETING_DIR = os.path.join(BASE_DIR, "components", "marketing")
APP_DIR = os.path.join(BASE_DIR, "app")

# ============================================
# GLOBAL STYLES (Add to globals.css)
# ============================================
GLOBAL_STYLES = '''
/* OLYMPUS Premium Glassmorphism */

/* Animated Gradient Background */
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

@keyframes float-reverse {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(20px) rotate(-5deg); }
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes border-dance {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* Glass Card Base */
.glass-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.5);
  box-shadow:
    0 8px 32px rgba(99, 102, 241, 0.1),
    inset 0 0 32px rgba(255,255,255,0.5),
    0 0 0 1px rgba(255,255,255,0.1);
}

/* Glass Card Hover */
.glass-card-hover {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.glass-card-hover:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow:
    0 20px 60px rgba(99, 102, 241, 0.2),
    inset 0 0 32px rgba(255,255,255,0.6),
    0 0 0 1px rgba(99, 102, 241, 0.2);
}

/* Gradient Border */
.gradient-border {
  position: relative;
  background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%);
  backdrop-filter: blur(20px);
}
.gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  padding: 2px;
  border-radius: inherit;
  background: linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: border-dance 4s ease-in-out infinite;
  background-size: 200% 200%;
}

/* Noise Overlay */
.noise-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.02;
  pointer-events: none;
  border-radius: inherit;
}

/* Premium Button */
.btn-premium {
  position: relative;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
  overflow: hidden;
}
.btn-premium::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: shimmer 2s infinite;
}

/* Floating Elements */
.float-element {
  animation: float 6s ease-in-out infinite;
}
.float-element-reverse {
  animation: float-reverse 8s ease-in-out infinite;
}

/* Glow Effect */
.glow-indigo {
  box-shadow: 0 0 60px rgba(99, 102, 241, 0.4);
}
.glow-purple {
  box-shadow: 0 0 60px rgba(168, 85, 247, 0.4);
}
'''

# ============================================
# HEADER - Premium Glassmorphism
# ============================================
HEADER = '''\'use client\';

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

  const navItems = [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Docs', href: '/docs' },
    { name: 'Blog', href: '/blog' },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
      scrolled ? 'py-2' : 'py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className={`relative flex items-center justify-between px-6 py-3 rounded-2xl transition-all duration-700 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(99,102,241,0.1)] border border-white/50'
            : 'bg-transparent'
        }`}>
          {/* Gradient border on scroll */}
          {scrolled && (
            <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 -z-10">
              <div className="w-full h-full rounded-2xl bg-white/90 backdrop-blur-2xl" />
            </div>
          )}

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/40 transition-all duration-500 group-hover:scale-110">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
            </div>
            <span className="text-2xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                OLYMPUS
              </span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="relative px-4 py-2 text-slate-600 hover:text-indigo-600 font-medium transition-all duration-300 rounded-xl group"
              >
                <span className="relative z-10">{item.name}</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-indigo-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-300" />
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="px-5 py-2.5 text-slate-600 hover:text-indigo-600 font-semibold transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="relative px-6 py-2.5 font-semibold text-white rounded-xl overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 transition-all duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
              <span className="relative">Get Started</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/50 backdrop-blur-xl border border-white/20"
          >
            <div className={`w-5 flex flex-col gap-1.5 transition-all duration-300 ${menuOpen ? 'rotate-45' : ''}`}>
              <span className={`h-0.5 bg-slate-600 rounded-full transition-all duration-300 ${menuOpen ? 'rotate-90 translate-y-2' : ''}`} />
              <span className={`h-0.5 bg-slate-600 rounded-full transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`h-0.5 bg-slate-600 rounded-full transition-all duration-300 ${menuOpen ? '-rotate-90 -translate-y-2' : ''}`} />
            </div>
          </button>
        </nav>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden absolute top-full left-4 right-4 mt-2 transition-all duration-500 ${
        menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        <div className="p-6 rounded-2xl bg-white/90 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(99,102,241,0.15)]">
          <div className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-slate-600 hover:text-indigo-600 font-medium rounded-xl hover:bg-gradient-to-r hover:from-indigo-500/10 hover:to-purple-500/10 transition-all"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200/50 space-y-3">
            <Link href="/login" className="block px-4 py-3 text-center text-slate-600 font-semibold rounded-xl hover:bg-slate-100 transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="block px-4 py-3 text-center bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30">
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
# HERO SECTION - Premium with 3D Elements
# ============================================
HERO_SECTION = '''\'use client\';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function HeroSection() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Mesh Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-white to-white" />

      {/* Animated Orbs with Depth */}
      <div
        className="absolute top-20 left-[10%] w-[500px] h-[500px] rounded-full opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(129,140,248,0.4) 0%, rgba(129,140,248,0) 70%)',
          transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      />
      <div
        className="absolute bottom-20 right-[10%] w-[600px] h-[600px] rounded-full opacity-50"
        style={{
          background: 'radial-gradient(circle, rgba(192,132,252,0.4) 0%, rgba(192,132,252,0) 70%)',
          transform: `translate(${mousePos.x * -0.3}px, ${mousePos.y * -0.3}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(244,114,182,0.3) 0%, rgba(244,114,182,0) 70%)',
          transform: `translate(calc(-50% + ${mousePos.x * 0.2}px), calc(-50% + ${mousePos.y * 0.2}px))`,
          transition: 'transform 0.3s ease-out',
        }}
      />

      {/* Floating 3D Shapes */}
      <div className="absolute top-32 right-[15%] w-20 h-20 opacity-20" style={{ animation: 'float 8s ease-in-out infinite' }}>
        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 rotate-12" />
      </div>
      <div className="absolute bottom-40 left-[12%] w-16 h-16 opacity-20" style={{ animation: 'float 10s ease-in-out infinite 1s' }}>
        <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
      </div>
      <div className="absolute top-1/2 right-[8%] w-12 h-12 opacity-15" style={{ animation: 'float 12s ease-in-out infinite 2s' }}>
        <div className="w-full h-full rotate-45 bg-gradient-to-br from-pink-500 to-orange-400" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-3 px-5 py-2.5 mb-8 rounded-full bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(99,102,241,0.1)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-sm font-semibold text-slate-700">Now in Public Beta</span>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full">NEW</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 mb-8">
            Build Anything.
            <br />
            <span className="relative">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                50X Faster.
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path d="M2 10C50 4 100 4 150 7C200 10 250 6 298 2" stroke="url(#gradient)" strokeWidth="4" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="300" y2="0">
                    <stop stopColor="#6366f1"/>
                    <stop offset="0.5" stopColor="#a855f7"/>
                    <stop offset="1" stopColor="#ec4899"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed">
            The <span className="font-semibold text-slate-800">ALL-IN-ONE</span> platform for App Builder, E-commerce,
            Websites, and Mobile Apps. <span className="text-indigo-600 font-semibold">Describe it. Watch it build.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/signup"
              className="group relative px-8 py-4 font-bold text-lg text-white rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 blur-2xl opacity-50 group-hover:opacity-80 transition-opacity" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600" />
              </div>
              <span className="relative flex items-center gap-2">
                Start Building Free
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <Link
              href="/demo"
              className="group px-8 py-4 font-semibold text-lg text-slate-700 rounded-2xl bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_rgba(99,102,241,0.15)] hover:border-indigo-200 transition-all duration-500 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              Watch Demo
            </Link>
          </div>

          {/* Preview Card - Premium Glass Effect */}
          <div className="relative max-w-5xl mx-auto">
            {/* Outer Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-[2.5rem] blur-2xl" />

            {/* Glass Container */}
            <div className="relative p-3 rounded-[2rem] bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_32px_64px_rgba(99,102,241,0.15)]">
              {/* Inner Glow */}
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/80 via-transparent to-transparent" />

              {/* Gradient Border Effect */}
              <div className="absolute inset-0 rounded-[2rem] p-[1px] bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30 -z-10" />

              {/* Code Preview */}
              <div className="relative rounded-[1.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 overflow-hidden">
                {/* Noise texture */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
                }} />

                {/* Window Controls */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/30" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/30" />
                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1.5 rounded-lg bg-slate-700/50 backdrop-blur text-slate-400 text-sm font-mono">
                      olympus-app/src/App.tsx
                    </div>
                  </div>
                </div>

                {/* Code with Syntax Highlighting */}
                <pre className="text-left text-sm md:text-base font-mono overflow-x-auto">
                  <code>
                    <span className="text-slate-500">{"// AI-generated in seconds"}</span>{`
`}<span className="text-purple-400">export default</span> <span className="text-blue-400">function</span> <span className="text-yellow-300">App</span>() {"{"}
  <span className="text-purple-400">return</span> (
    {"<"}<span className="text-green-400">Dashboard</span>{">"}
      {"<"}<span className="text-green-400">Sidebar</span> <span className="text-cyan-300">items</span>={"{"}<span className="text-orange-300">navItems</span>{"}"} {"/>"}
      {"<"}<span className="text-green-400">MainContent</span>{">"}
        {"<"}<span className="text-green-400">Analytics</span> <span className="text-cyan-300">data</span>={"{"}<span className="text-orange-300">metrics</span>{"}"} {"/>"}
        {"<"}<span className="text-green-400">RecentOrders</span> <span className="text-cyan-300">limit</span>={"{"}<span className="text-orange-300">5</span>{"}"} {"/>"}
      {"</"}<span className="text-green-400">MainContent</span>{">"}
    {"</"}<span className="text-green-400">Dashboard</span>{">"}
  );
{"}"}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
'''

# ============================================
# SOCIAL PROOF - Premium Design
# ============================================
SOCIAL_PROOF = '''\'use client\';

const logos = [
  { name: 'Google', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' },
  { name: 'Microsoft', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/></svg>' },
  { name: 'Amazon', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.493.13.063.108.039.234-.055.394-.12.201-.347.4-.674.596-1.533.918-3.245 1.618-5.134 2.1-1.89.48-3.744.72-5.567.72-2.34 0-4.596-.368-6.77-1.1-2.174-.732-4.013-1.682-5.515-2.848-.128-.1-.18-.223-.15-.37.03-.15.118-.27.266-.37z"/></svg>' },
  { name: 'Stripe', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg>' },
  { name: 'Vercel', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg>' },
];

const stats = [
  { value: '50,000+', label: 'Apps Built', icon: '🚀' },
  { value: '99.9%', label: 'Uptime SLA', icon: '⚡' },
  { value: '4.9/5', label: 'User Rating', icon: '⭐' },
  { value: '<50ms', label: 'Response Time', icon: '🔥' },
];

export function SocialProof() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-indigo-50/30 to-white" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logos */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-slate-500 tracking-wider uppercase mb-8">
            Trusted by teams at world-class companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
            {logos.map((logo) => (
              <div
                key={logo.name}
                className="w-8 h-8 text-slate-400 hover:text-slate-600 transition-colors duration-300"
                dangerouslySetInnerHTML={{ __html: logo.svg }}
              />
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="group relative p-8 rounded-2xl bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.12)] transition-all duration-500 hover:-translate-y-1"
            >
              {/* Gradient Border on Hover */}
              <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-indigo-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-indigo-500/20 group-hover:via-purple-500/20 group-hover:to-pink-500/20 transition-all duration-500 -z-10">
                <div className="w-full h-full rounded-2xl bg-white" />
              </div>

              <div className="text-3xl mb-4">{stat.icon}</div>
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
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
# FEATURES OVERVIEW - Premium Cards
# ============================================
FEATURES_OVERVIEW = '''\'use client\';

const features = [
  {
    icon: '⚡',
    title: 'AI-Powered Generation',
    description: 'Describe what you want in plain English. Our AI understands context and builds production-ready code.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: '🎨',
    title: 'Visual Builder',
    description: 'Drag and drop components. See changes instantly. Switch to code view anytime for full control.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: '🚀',
    title: 'One-Click Deploy',
    description: 'Deploy to production with one click. Global CDN, automatic SSL, instant scaling included.',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    icon: '🛒',
    title: 'E-commerce Ready',
    description: 'Stripe integration, inventory management, order tracking. Launch your store in minutes.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: '📱',
    title: 'Mobile First',
    description: 'Every app is responsive by default. Export to iOS and Android with a single codebase.',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    icon: '🔒',
    title: 'Enterprise Security',
    description: 'SOC 2 compliant. SSO/SAML support. Audit logs. Your data is encrypted at rest and in transit.',
    gradient: 'from-rose-500 to-red-500',
  },
];

export function FeaturesOverview() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-purple-50/20 to-white" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg mb-6">
            <span className="text-sm font-semibold text-indigo-600">Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              build & ship
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            One platform replaces your entire tech stack. From idea to production in minutes.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group relative p-8 rounded-2xl bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.15)] transition-all duration-500 hover:-translate-y-2"
            >
              {/* Gradient Glow on Hover */}
              <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`} />

              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-2xl mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>

              {/* Arrow */}
              <div className="mt-6 flex items-center gap-2 text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span>Learn more</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
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
# TESTIMONIALS - Premium Masonry Grid
# ============================================
TESTIMONIALS = '''\'use client\';

const testimonials = [
  {
    content: 'OLYMPUS cut our development time by 80%. We launched our MVP in a weekend instead of months. The AI actually understands what we want.',
    author: 'Sarah Chen',
    role: 'Founder @ TechStart',
    avatar: 'SC',
    gradient: 'from-indigo-500 to-purple-500',
  },
  {
    content: 'The AI understands exactly what I want. I describe features in plain English and watch them come to life. It is like having a 10x engineer on demand.',
    author: 'Marcus Johnson',
    role: 'CTO @ ScaleUp Inc',
    avatar: 'MJ',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    content: 'Finally, a tool that lets designers build real apps without waiting on developers. I shipped 3 products last month.',
    author: 'Emily Rodriguez',
    role: 'Product Designer',
    avatar: 'ER',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    content: 'I built and launched 3 SaaS products in one month. Each one is generating revenue. Complete game changer for indie makers.',
    author: 'David Park',
    role: 'Indie Maker',
    avatar: 'DP',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    content: 'Our agency delivers 5x more projects now. Clients are amazed at how fast we ship. OLYMPUS is our secret weapon.',
    author: 'Lisa Thompson',
    role: 'Agency Owner',
    avatar: 'LT',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    content: 'Raised our seed round with a fully functional product built in 2 weeks. Investors were blown away by the speed.',
    author: 'James Wilson',
    role: 'Startup Founder',
    avatar: 'JW',
    gradient: 'from-green-500 to-emerald-500',
  },
];

export function Testimonials() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-indigo-50/30 to-white" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg mb-6">
            <span className="text-sm font-semibold text-indigo-600">Testimonials</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            Loved by{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              10,000+ builders
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            See what developers, designers, and founders are building with OLYMPUS.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="group relative p-8 rounded-2xl bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.12)] transition-all duration-500 hover:-translate-y-1"
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-6 text-6xl text-indigo-100 font-serif leading-none">"</div>

              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Content */}
              <p className="text-slate-600 leading-relaxed mb-8 relative z-10">
                "{t.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold shadow-lg`}>
                  {t.avatar}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{t.author}</div>
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
# HOW IT WORKS - Premium Steps
# ============================================
HOW_IT_WORKS = '''\'use client\';

const steps = [
  {
    number: '01',
    title: 'Describe Your Vision',
    description: 'Tell OLYMPUS what you want to build in plain English. Our AI understands context, intent, and best practices.',
    icon: '💬',
    gradient: 'from-indigo-500 to-purple-500',
  },
  {
    number: '02',
    title: 'Watch It Build',
    description: 'See your app come to life in real-time. Every component, every line of code, generated before your eyes.',
    icon: '⚡',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    number: '03',
    title: 'Customize & Refine',
    description: 'Use our visual editor to tweak layouts, colors, and content. Or dive into the code for full control.',
    icon: '🎨',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    number: '04',
    title: 'Deploy Instantly',
    description: 'One click to go live. Your app is deployed globally with SSL, CDN, and automatic scaling.',
    icon: '🚀',
    gradient: 'from-amber-500 to-orange-500',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-purple-50/20 to-white" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg mb-6">
            <span className="text-sm font-semibold text-indigo-600">How It Works</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            From idea to production in{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
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
                <div className="hidden lg:block absolute top-12 left-full w-full h-[2px] -translate-x-1/2 z-0">
                  <div className="w-full h-full bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200" />
                </div>
              )}

              <div className="group relative p-8 rounded-2xl bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.15)] transition-all duration-500 hover:-translate-y-2">
                {/* Number Badge */}
                <div className={`absolute -top-4 -left-4 w-10 h-10 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white font-black text-sm shadow-lg`}>
                  {step.number}
                </div>

                {/* Icon */}
                <div className="text-4xl mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  {step.icon}
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed">{step.description}</p>
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
# CTA SECTION - Premium Gradient
# ============================================
CTA_SECTION = '''\'use client\';

import Link from 'next/link';

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-[2.5rem] overflow-hidden">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" style={{ backgroundSize: '200% 200%', animation: 'gradient-shift 8s ease infinite' }} />

          {/* Mesh Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="cta-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                  <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cta-grid)" />
            </svg>
          </div>

          {/* Floating Orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

          {/* Content */}
          <div className="relative px-8 py-16 md:px-16 md:py-24 text-center">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6">
              Ready to build something
              <br />
              <span className="text-white/90">amazing?</span>
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Join 10,000+ builders who are shipping products 50X faster with OLYMPUS.
              Start free, no credit card required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="group px-8 py-4 bg-white text-indigo-600 font-bold text-lg rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300 flex items-center gap-2"
              >
                Start Building Free
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/demo"
                className="px-8 py-4 bg-white/10 backdrop-blur-xl text-white font-semibold text-lg rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                Watch Demo
              </Link>
            </div>

            <p className="mt-8 text-white/60 text-sm">
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
# PRICING PREVIEW
# ============================================
PRICING_PREVIEW = '''\'use client\';

import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '$0',
    desc: 'For trying out',
    features: ['5 projects', '1GB storage', 'Community support'],
    gradient: 'from-slate-500 to-slate-600',
  },
  {
    name: 'Pro',
    price: '$29',
    desc: 'For serious builders',
    features: ['Unlimited projects', '50GB storage', 'Priority support', 'Custom domains'],
    popular: true,
    gradient: 'from-indigo-500 to-purple-500',
  },
  {
    name: 'Team',
    price: '$99',
    desc: 'For teams',
    features: ['Everything in Pro', 'Team collaboration', 'SSO / SAML', 'Dedicated support'],
    gradient: 'from-purple-500 to-pink-500',
  },
];

export function PricingPreview() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-indigo-50/30 to-white" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg mb-6">
            <span className="text-sm font-semibold text-indigo-600">Pricing</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            Simple,{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
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
              className={`group relative p-8 rounded-2xl transition-all duration-500 ${
                plan.popular
                  ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white scale-105 shadow-[0_16px_48px_rgba(99,102,241,0.3)]'
                  : 'bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.12)] hover:-translate-y-1'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white text-indigo-600 text-xs font-bold rounded-full shadow-lg">
                  MOST POPULAR
                </div>
              )}

              <h3 className={`text-xl font-bold mb-1 ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
                {plan.name}
              </h3>
              <p className={`text-sm mb-6 ${plan.popular ? 'text-white/70' : 'text-slate-500'}`}>
                {plan.desc}
              </p>

              <div className="mb-8">
                <span className={`text-5xl font-black ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
                  {plan.price}
                </span>
                <span className={plan.popular ? 'text-white/70' : 'text-slate-500'}>/mo</span>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-center gap-3 ${plan.popular ? 'text-white/90' : 'text-slate-600'}`}>
                    <svg className={`w-5 h-5 ${plan.popular ? 'text-white' : 'text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`block w-full py-3 text-center font-semibold rounded-xl transition-all ${
                  plan.popular
                    ? 'bg-white text-indigo-600 hover:shadow-lg'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/pricing" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold group">
            View full pricing details
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
'''

# ============================================
# FOOTER - Premium with Real Links
# ============================================
FOOTER = '''\'use client\';

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
    <footer className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white to-slate-50" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6 group">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/40 transition-shadow">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <span className="text-2xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                OLYMPUS
              </span>
            </Link>
            <p className="text-slate-500 mb-6 max-w-xs">
              Build anything. 50X faster. The ALL-IN-ONE platform for modern builders.
            </p>

            {/* Social */}
            <div className="flex gap-3">
              {[
                { name: 'Twitter', href: 'https://twitter.com/olympus', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                { name: 'GitHub', href: 'https://github.com/olympus', icon: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z' },
                { name: 'Discord', href: 'https://discord.gg/olympus', icon: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z' },
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-lg transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={social.icon} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-bold text-slate-900 mb-4">{category}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            2026 OLYMPUS. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-slate-500 hover:text-indigo-600 text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-slate-500 hover:text-indigo-600 text-sm transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
'''

# ============================================
# INDEX EXPORTS
# ============================================
MARKETING_INDEX = '''// OLYMPUS Marketing Components - Premium Edition
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
# HOME PAGE
# ============================================
HOME_PAGE = '''\'use client\';

import {
  Header,
  HeroSection,
  SocialProof,
  HowItWorks,
  FeaturesOverview,
  Testimonials,
  PricingPreview,
  CTASection,
  Footer,
} from '@/components/marketing';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
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
# SAVE ALL
# ============================================
def save_all():
    print("=" * 60)
    print("OLYMPUS CHEF PREMIUM - World-Class Glassmorphism")
    print("=" * 60)

    # Marketing components
    components = {
        'Header.tsx': HEADER,
        'HeroSection.tsx': HERO_SECTION,
        'SocialProof.tsx': SOCIAL_PROOF,
        'FeaturesOverview.tsx': FEATURES_OVERVIEW,
        'Testimonials.tsx': TESTIMONIALS,
        'HowItWorks.tsx': HOW_IT_WORKS,
        'CTASection.tsx': CTA_SECTION,
        'PricingPreview.tsx': PRICING_PREVIEW,
        'Footer.tsx': FOOTER,
        'index.ts': MARKETING_INDEX,
    }

    for filename, code in components.items():
        filepath = os.path.join(MARKETING_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"[OK] {filename}")

    # Home page
    filepath = os.path.join(APP_DIR, "page.tsx")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(HOME_PAGE)
    print("[OK] Home page updated")

    # Add global styles
    styles_path = os.path.join(APP_DIR, "globals.css")
    if os.path.exists(styles_path):
        with open(styles_path, 'r', encoding='utf-8') as f:
            existing = f.read()
        if 'OLYMPUS Premium' not in existing:
            with open(styles_path, 'a', encoding='utf-8') as f:
                f.write('\n' + GLOBAL_STYLES)
            print("[OK] Added premium styles to globals.css")

    print("\n" + "=" * 60)
    print("PREMIUM DESIGN APPLIED!")
    print("=" * 60)
    print("\nFeatures:")
    print("  - Multi-layer glassmorphism")
    print("  - Gradient borders")
    print("  - Mouse-following orbs")
    print("  - Animated gradients")
    print("  - Premium hover effects")
    print("  - 3D floating elements")
    print("  - Real footer links")
    print("\nRefresh http://localhost:3001")

if __name__ == '__main__':
    save_all()
