// Home Page
'use client';

import { Hero } from '@/components/landing/Hero';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { SocialProofSection } from '@/components/landing/SocialProofSection';

export default function HomePage() {
  return (
    <div>
      <Hero />
      <SocialProofSection />
      <FeaturesSection />
      <TestimonialsSection />
    </div>
  );
}