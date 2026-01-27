// Full component code here...
'use client';

import React, { useState, useRef } from 'react';
import { cn } from '../src/lib/utils';

interface StunningMarketingLandingPageProps {}

const StunningMarketingLandingPage = React.forwardRef<HTMLDivElement, StunningMarketingLandingPageProps>((props, ref) => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const testimonials = [
    { name: 'John Doe', feedback: 'Amazing service!', photo: 'john.jpg', rating: 5 },
    { name: 'Jane Smith', feedback: 'Highly recommend!', photo: 'jane.jpg', rating: 4.5 },
    // Add more testimonials as needed
  ];

  const handleNextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  return (
    <div ref={ref} className="bg-[#0a0a0a] text-white font-sans">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: 'url(/path/to/video-or-image.jpg)' }}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xl"></div>
        <div className="relative z-10 text-center">
          <h1 className="text-7xl font-bold">Transform Your Marketing with a Landing Page 50X Better Than the Rest!</h1>
          <p className="text-xl mt-4 text-white/60">Unlock exclusive features that will set your marketing apart and boost conversions.</p>
          <button className="mt-8 px-6 py-3 bg-[#7c3aed] text-white rounded-lg hover:bg-white/10 transition-all duration-200 focus:ring-2 focus:ring-violet-500">
            Get Started Now to Boost Your Conversions!
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <h2 className="text-5xl font-bold text-center">Discover the Features</h2>
        <p className="text-center text-white/60 mt-2">Seamless animations, dynamic visuals, and conversion optimization.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          {/* Feature items */}
          <div className="bg-white/[0.03] p-6 rounded-lg shadow-[0_0_50px_rgba(124,58,237,0.3)]">
            <h3 className="text-4xl font-semibold">Feature 1</h3>
            <p className="mt-2">Description of feature 1.</p>
          </div>
          <div className="bg-white/[0.03] p-6 rounded-lg shadow-[0_0_50px_rgba(124,58,237,0.3)]">
            <h3 className="text-4xl font-semibold">Feature 2</h3>
            <p className="mt-2">Description of feature 2.</p>
          </div>
          <div className="bg-white/[0.03] p-6 rounded-lg shadow-[0_0_50px_rgba(124,58,237,0.3)]">
            <h3 className="text-4xl font-semibold">Feature 3</h3>
            <p className="mt-2">Description of feature 3.</p>
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className="py-16 px-4 bg-[#0a0a0a]">
        <h2 className="text-5xl font-bold text-center">What Our Clients Say</h2>
        <p className="text-center text-white/60 mt-2">Hear from satisfied clients who have transformed their marketing.</p>
        <div className="mt-8 flex justify-center items-center">
          <div className="w-full max-w-lg">
            <div className="bg-white/[0.03] p-6 rounded-lg shadow-[0_0_50px_rgba(124,58,237,0.3)]">
              <img src={testimonials[currentTestimonial].photo} alt={testimonials[currentTestimonial].name} className="w-16 h-16 rounded-full mx-auto" />
              <p className="mt-4 text-center">{testimonials[currentTestimonial].feedback}</p>
              <p className="mt-2 text-center font-semibold">- {testimonials[currentTestimonial].name}</p>
            </div>
            <button onClick={handleNextTestimonial} className="mt-4 px-4 py-2 bg-[#7c3aed] text-white rounded-lg hover:bg-white/10 transition-all duration-200 focus:ring-2 focus:ring-violet-500">
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Table */}
      <section className="py-16 px-4">
        <h2 className="text-5xl font-bold text-center">Choose Your Plan</h2>
        <p className="text-center text-white/60 mt-2">Clearly defined pricing plans for the best value.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          {/* Pricing plans */}
          <div className="bg-white/[0.03] p-6 rounded-lg shadow-[0_0_50px_rgba(124,58,237,0.3)]">
            <h3 className="text-4xl font-semibold">Basic Plan</h3>
            <p className="mt-2">$19/month</p>
            <button className="mt-4 px-4 py-2 bg-[#7c3aed] text-white rounded-lg hover:bg-white/10 transition-all duration-200 focus:ring-2 focus:ring-violet-500">
              Get Started Now to Boost Your Conversions!
            </button>
          </div>
          <div className="bg-white/[0.03] p-6 rounded-lg shadow-[0_0_50px_rgba(124,58,237,0.3)]">
            <h3 className="text-4xl font-semibold">Pro Plan</h3>
            <p className="mt-2">$49/month</p>
            <button className="mt-4 px-4 py-2 bg-[#7c3aed] text-white rounded-lg hover:bg-white/10 transition-all duration-200 focus:ring-2 focus:ring-violet-500">
              Get Started Now to Boost Your Conversions!
            </button>
          </div>
          <div className="bg-white/[0.03] p-6 rounded-lg shadow-[0_0_50px_rgba(124,58,237,0.3)]">
            <h3 className="text-4xl font-semibold">Enterprise Plan</h3>
            <p className="mt-2">$99/month</p>
            <button className="mt-4 px-4 py-2 bg-[#7c3aed] text-white rounded-lg hover:bg-white/10 transition-all duration-200 focus:ring-2 focus:ring-violet-500">
              Get Started Now to Boost Your Conversions!
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-[#0a0a0a]">
        <h2 className="text-5xl font-bold text-center">Frequently Asked Questions</h2>
        <p className="text-center text-white/60 mt-2">Quick answers to common inquiries.</p>
        <div className="mt-8">
          {/* FAQ items */}
          <details className="bg-white/[0.03] p-4 rounded-lg shadow-[0_0_50px_rgba(124,58,237,0.3)] mb-4">
            <summary className="cursor-pointer text-xl">What is the refund policy?</summary>
            <p className="mt-2">We offer a 30-day money-back guarantee.</p>
          </details>
          <details className="bg-white/[0.03] p-4 rounded-lg shadow-[0_0_50px_rgba(124,58,237,0.3)] mb-4">
            <summary className="cursor-pointer text-xl">How do I upgrade my plan?</summary>
            <p className="mt-2">You can upgrade your plan from your account settings.</p>
          </details>
        </div>
      </section>
    </div>
  );
});

export { StunningMarketingLandingPage };
export type { StunningMarketingLandingPageProps };
