import { useState } from 'react';
import { HeroSection } from './HeroSection';
import { VibeCodingRealitySection } from './VibeCodingRealitySection';
import { SevenBreachesSection } from './SevenBreachesSection';
import { InteractiveInspectorDemo } from './InteractiveInspectorDemo';
import { VibeRiskCalculator } from './VibeRiskCalculator';
import { PlatformFeaturesSection } from './PlatformFeaturesSection';
import { ComparisonMatrix } from './ComparisonMatrix';
import { CaseStudiesGrid } from './CaseStudiesGrid';
import { FAQSection } from './FAQSection';
import { CTASection } from './CTASection';
import { LandingFooter } from './LandingFooter';
import { Sparkles } from 'lucide-react';
import { AppLogo } from '@/components/ui/AppLogo';

interface LandingPageProps {
  onAnalyzeRepo: (url: string) => void;
  isLoading: boolean;
  onOpenWorkbenchDirectly: () => void;
}

export const LandingPage = ({
  onAnalyzeRepo,
  isLoading,
  onOpenWorkbenchDirectly
}: LandingPageProps) => {

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleHeroBreaches = () => {
    scrollToSection('sete-brechas');
  };

  const handleHeroCalculator = () => {
    scrollToSection('calculadora-risco');
  };

  return (
    <div className="min-h-screen bg-[#070709] text-gray-100 selection:bg-indigo-500 selection:text-white">
      {/* Sticky Header Nav */}
      <header className="sticky top-0 z-50 bg-[#070709]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <AppLogo 
            size="lg" 
            showText={true} 
            subtitle="Security Auditor & Remediation" 
          />

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-gray-300">
            <button 
              onClick={() => scrollToSection('sete-brechas')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              As 7 Brechas
            </button>
            <button 
              onClick={() => scrollToSection('calculadora-risco')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Calculadora de Risco
            </button>
            <button 
              onClick={() => scrollToSection('recursos')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Recursos
            </button>
            <button 
              onClick={() => scrollToSection('faq')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Quick Action Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenWorkbenchDirectly}
              className="bg-white/10 hover:bg-white/15 text-gray-200 hover:text-white px-3.5 py-2 rounded-lg text-xs font-semibold border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Modo</span> Workbench
            </button>
          </div>

        </div>
      </header>

      {/* Main Landing Page Sections */}
      <main>
        {/* 1. Hero Section */}
        <HeroSection
          onAnalyze={onAnalyzeRepo}
          isLoading={isLoading}
          onOpenWorkbench={onOpenWorkbenchDirectly}
          onExploreBreaches={handleHeroBreaches}
          onOpenCalculator={handleHeroCalculator}
        />

        {/* 2. VibeCoding Reality & The TiaApp Incident */}
        <VibeCodingRealitySection 
          onAuditClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />

        {/* 3. Deep Dive into the 7 Breaches */}
        <SevenBreachesSection 
          onAuditTrigger={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />

        {/* 4. Live Interactive F12 Simulator Demo */}
        <InteractiveInspectorDemo />

        {/* 5. VibeRisk Calculator */}
        <VibeRiskCalculator 
          onScanRepo={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />

        {/* 6. Platform Capabilities & Blueprints */}
        <PlatformFeaturesSection 
          onStartAudit={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />

        {/* 7. Comparison Matrix */}
        <ComparisonMatrix 
          onAuditClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />

        {/* 8. Real-world Case Studies Grid */}
        <CaseStudiesGrid />

        {/* 9. FAQ Section */}
        <FAQSection />

        {/* 10. High-converting Final CTA */}
        <CTASection 
          onAnalyze={onAnalyzeRepo}
          isLoading={isLoading}
          onOpenWorkbench={onOpenWorkbenchDirectly}
        />
      </main>

      {/* Footer */}
      <LandingFooter onOpenWorkbench={onOpenWorkbenchDirectly} />
    </div>
  );
};
