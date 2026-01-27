'use client';

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
];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleDotClick = (index: number) => {
    setActiveIndex(index);
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
              className={`p-6 rounded-2xl transition-all ${
                activeIndex === index
                  ? 'bg-gradient-to-b from-purple-500/20 to-slate-900 border border-purple-500/50'
                  : 'bg-slate-900 border border-slate-800'
              }`}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-slate-300 mb-6">&quot;{testimonial.content}&quot;</p>

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
  );
}
