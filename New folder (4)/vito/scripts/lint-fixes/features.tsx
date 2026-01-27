'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '../Button';

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
];

export function Features() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const handleFeatureHover = (index: number | null) => {
    setHoveredFeature(index);
  };

  const handleLearnMore = () => {
    window.location.href = '/features';
  };

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
              className={`group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all ${
                hoveredFeature === index ? 'scale-[1.02] shadow-xl' : ''
              }`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-2xl mb-4`}>
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
  );
}
