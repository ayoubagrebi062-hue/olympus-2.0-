'use client';

import React, { useState } from 'react';

type ViewType = 'marketing' | 'dashboard' | 'pricing';

export default function PreviewPage() {
  const [activeView, setActiveView] = useState<ViewType>('marketing');
  const [toast, setToast] = useState<string | null>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const testimonials = [
    {
      name: 'Alex Chen',
      feedback: 'OLYMPUS transformed our workflow. 10x faster development!',
      rating: 5,
    },
    {
      name: 'Sarah Miller',
      feedback: 'The AI agents are incredible. Best investment we made.',
      rating: 5,
    },
    { name: 'James Wilson', feedback: 'From idea to production in hours, not weeks.', rating: 5 },
  ];

  const views = [
    { id: 'marketing' as ViewType, label: 'Marketing Website' },
    { id: 'dashboard' as ViewType, label: 'Platform Dashboard' },
    { id: 'pricing' as ViewType, label: 'Pricing Cards' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            OLYMPUS <span className="text-violet-500">Preview</span>
          </h1>
          <div className="flex gap-2">
            {views.map(view => (
              <button
                key={view.id}
                onClick={() => {
                  setActiveView(view.id);
                  showToast(`Viewing: ${view.label}`);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeView === view.id
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Marketing Landing Page */}
      {activeView === 'marketing' && (
        <div className="text-white">
          {/* Hero Section */}
          <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-900/20 via-[#0a0a0f] to-blue-900/20">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
            <div className="relative z-10 text-center px-6 max-w-5xl">
              <div className="inline-block px-4 py-2 bg-violet-500/20 rounded-full text-violet-300 text-sm mb-6">
                AI-Powered Development Platform
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-violet-200 to-blue-200 bg-clip-text text-transparent">
                Build 50X Faster with OLYMPUS
              </h1>
              <p className="text-xl text-white/60 mb-8 max-w-2xl mx-auto">
                40 AI agents working together to transform your ideas into production-ready code in
                minutes.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => showToast('Starting free trial...')}
                  className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-all hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(139,92,246,0.4)]"
                >
                  Start Free Trial
                </button>
                <button
                  onClick={() => showToast('Playing demo video...')}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-all border border-white/10"
                >
                  Watch Demo
                </button>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="py-24 px-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-4">Powerful Features</h2>
              <p className="text-center text-white/60 mb-16">
                Everything you need to build at lightning speed
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { title: '40 AI Agents', desc: 'Specialized agents for every task', icon: '🤖' },
                  {
                    title: 'Real-time Generation',
                    desc: 'Watch code being written live',
                    icon: '⚡',
                  },
                  {
                    title: 'Quality Assurance',
                    desc: 'Automatic testing & validation',
                    icon: '✅',
                  },
                  { title: 'Component Library', desc: '100+ ready-to-use components', icon: '📦' },
                  { title: 'Multi-Model AI', desc: 'GPT-4, Claude, DeepSeek support', icon: '🧠' },
                  { title: 'One-Click Deploy', desc: 'Deploy to Vercel instantly', icon: '🚀' },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.03] backdrop-blur-xl p-8 rounded-2xl border border-white/10 hover:border-violet-500/50 transition-all hover:-translate-y-2 hover:shadow-[0_0_50px_rgba(139,92,246,0.2)]"
                  >
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-white/60">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="py-24 px-6 bg-gradient-to-b from-transparent via-violet-900/10 to-transparent">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-16">What Developers Say</h2>
              <div className="bg-white/[0.03] backdrop-blur-xl p-12 rounded-3xl border border-white/10">
                <div className="text-yellow-400 text-2xl mb-4">
                  {'★'.repeat(testimonials[currentTestimonial].rating)}
                </div>
                <p className="text-2xl text-white/90 mb-6">
                  "{testimonials[currentTestimonial].feedback}"
                </p>
                <p className="text-violet-400 font-semibold">
                  — {testimonials[currentTestimonial].name}
                </p>
                <div className="flex justify-center gap-2 mt-8">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentTestimonial(i)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        i === currentTestimonial
                          ? 'bg-violet-500 w-8'
                          : 'bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-24 px-6">
            <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-violet-900/50 to-blue-900/50 p-16 rounded-3xl border border-white/10">
              <h2 className="text-4xl font-bold mb-4">Ready to Build?</h2>
              <p className="text-white/60 mb-8">Join thousands of developers using OLYMPUS</p>
              <button
                onClick={() => showToast('Redirecting to signup...')}
                className="px-12 py-4 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-all"
              >
                Get Started Free
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Dashboard */}
      {activeView === 'dashboard' && (
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 h-screen sticky top-16 bg-[#0a0a0f] border-r border-white/10 p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center font-bold">
                A
              </div>
              <div>
                <div className="font-semibold text-white">Ayoub</div>
                <div className="text-xs text-white/40">Admin</div>
              </div>
            </div>
            <nav className="space-y-2">
              {[
                { icon: '📊', label: 'Dashboard', active: true },
                { icon: '🤖', label: 'AI Agents' },
                { icon: '📁', label: 'Projects' },
                { icon: '📈', label: 'Analytics' },
                { icon: '⚙️', label: 'Settings' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => showToast(`Navigating to ${item.label}...`)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    item.active
                      ? 'bg-violet-600 text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8">
            <header className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white">OLYMPUS Dashboard</h1>
                <p className="text-white/40">AI-Powered Command Center</p>
              </div>
              <button
                onClick={() => showToast('Starting new build...')}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-semibold transition-all"
              >
                + New Build
              </button>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Active Agents', value: '39', change: '+5', color: 'text-green-400' },
                { label: 'Builds Today', value: '12', change: '+3', color: 'text-blue-400' },
                { label: 'Components', value: '156', change: '+24', color: 'text-purple-400' },
                {
                  label: 'Success Rate',
                  value: '99.2%',
                  change: '+0.5%',
                  color: 'text-emerald-400',
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white/[0.03] backdrop-blur-xl p-6 rounded-xl border border-white/10"
                >
                  <div className="text-white/40 text-sm mb-2">{stat.label}</div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white">{stat.value}</span>
                    <span className={`text-sm ${stat.color}`}>{stat.change}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Builds */}
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Recent Builds</h2>
              <div className="space-y-4">
                {[
                  {
                    name: 'Marketing Landing Page',
                    status: 'Completed',
                    time: '2 min ago',
                    agents: 38,
                  },
                  {
                    name: 'E-commerce Dashboard',
                    status: 'In Progress',
                    time: '5 min ago',
                    agents: 40,
                  },
                  { name: 'Mobile App UI', status: 'Completed', time: '1 hour ago', agents: 35 },
                ].map((build, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-white">{build.name}</div>
                      <div className="text-sm text-white/40">
                        {build.agents} agents • {build.time}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        build.status === 'Completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {build.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Pricing */}
      {activeView === 'pricing' && (
        <div className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-white mb-4">Simple Pricing</h2>
            <p className="text-center text-white/60 mb-16">Choose the plan that works for you</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: 'Starter',
                  price: 'Free',
                  features: [
                    '5 builds/month',
                    '10 AI agents',
                    'Community support',
                    'Basic templates',
                  ],
                  cta: 'Get Started',
                  popular: false,
                },
                {
                  name: 'Pro',
                  price: '$49/mo',
                  features: [
                    'Unlimited builds',
                    '40 AI agents',
                    'Priority support',
                    'Premium templates',
                    'API access',
                  ],
                  cta: 'Start Trial',
                  popular: true,
                },
                {
                  name: 'Enterprise',
                  price: 'Custom',
                  features: [
                    'Everything in Pro',
                    'Custom agents',
                    'Dedicated support',
                    'SLA guarantee',
                    'On-premise option',
                  ],
                  cta: 'Contact Sales',
                  popular: false,
                },
              ].map((plan, i) => (
                <div
                  key={i}
                  className={`relative bg-white/[0.03] backdrop-blur-xl p-8 rounded-2xl border transition-all hover:-translate-y-2 ${
                    plan.popular
                      ? 'border-violet-500 shadow-[0_0_50px_rgba(139,92,246,0.3)]'
                      : 'border-white/10'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-violet-600 text-white text-sm font-semibold rounded-full">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold text-white mb-6">{plan.price}</div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-white/70">
                        <span className="text-green-400">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => showToast(`Selected ${plan.name} plan!`)}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      plan.popular
                        ? 'bg-violet-600 hover:bg-violet-500 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-6 py-3 bg-slate-900 text-white rounded-lg shadow-lg border border-white/10 animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}
