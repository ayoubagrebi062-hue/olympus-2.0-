import { Hero } from '@/components/landing/hero';
import { SocialProof } from '@/components/landing/socialProof';
import { HowItWorks } from '@/components/landing/howItWorks';
import { Features } from '@/components/landing/features';
import { Pricing } from '@/components/landing/pricing';
import { Testimonials } from '@/components/landing/testimonials';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <SocialProof />
      <HowItWorks />
      <Features />
      <Pricing />
      <Testimonials />
    </div>
  );
}
