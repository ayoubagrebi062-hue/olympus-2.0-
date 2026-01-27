'use client';

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
