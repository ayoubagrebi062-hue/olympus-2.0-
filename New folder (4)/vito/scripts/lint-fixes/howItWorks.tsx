'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '../Button';

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
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  const handleStepClick = (index: number) => {
    setActiveStep(index);
  };

  const handleTryNow = () => {
    window.location.href = '/signup';
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
            How It Works
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            From idea to production in four simple steps
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleStepClick(index)}
                className={`p-6 rounded-xl cursor-pointer transition-all ${
                  activeStep === index
                    ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30'
                    : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className={`text-3xl font-bold ${
                    activeStep === index ? 'text-purple-400' : 'text-slate-600'
                  }`}>
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
  );
}
