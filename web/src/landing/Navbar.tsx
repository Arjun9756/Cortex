import React, { useState, useEffect } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { isDemoEnabled } from '../config';

interface NavbarProps {
  onOpenContact: () => void;
  onLaunchDemo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenContact, onLaunchDemo }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#0A0B0E]/90 backdrop-blur-md border-b border-white/10 py-3 shadow-xl'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#12141A] border border-[#3B82F6]/50 overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <img src="/cortex-logo.png" alt="Cortex Logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-[#F5F5F7] font-mono">
              Cortex
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider font-semibold rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 uppercase">
              v1.0 Beta
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-[#9497A6]">
          <button
            onClick={() => scrollToSection('architecture')}
            className="hover:text-[#F5F5F7] transition-colors cursor-pointer"
          >
            Architecture
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="hover:text-[#F5F5F7] transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection('byoc')}
            className="hover:text-[#F5F5F7] transition-colors cursor-pointer"
          >
            BYOC Setup
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            className="hover:text-[#F5F5F7] transition-colors cursor-pointer"
          >
            FAQ
          </button>
          <button
            onClick={() => scrollToSection('contact')}
            className="hover:text-[#F5F5F7] transition-colors cursor-pointer"
          >
            Get Started
          </button>
        </nav>

        {/* Right CTA Buttons */}
        <div className="hidden md:flex items-center space-x-3">
          {onLaunchDemo && (
            isDemoEnabled ? (
              <button
                onClick={onLaunchDemo}
                className="px-3.5 py-2 text-xs font-semibold font-mono text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Launch Live Demo</span>
              </button>
            ) : (
              <button
                disabled
                title="Live Demo is disabled in this deployment environment"
                className="px-3.5 py-2 text-xs font-semibold font-mono text-slate-500 bg-slate-800/40 border border-slate-700/50 rounded-xl cursor-not-allowed flex items-center space-x-1.5 opacity-60"
              >
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                <span>Demo Offline</span>
              </button>
            )
          )}

          <button
            onClick={onOpenContact}
            className="group relative inline-flex items-center justify-center px-4 py-2 text-xs font-semibold font-mono tracking-wide text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(59,130,246,0.3)] cursor-pointer"
          >
            <span>Request Free Setup</span>
            <ArrowRight className="w-3.5 h-3.5 ml-2 text-white" />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#9497A6] hover:text-[#F5F5F7]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0A0B0E]/95 border-b border-white/10 px-4 pt-4 pb-6 space-y-3 font-medium text-[#9497A6] backdrop-blur-lg">
          <button
            onClick={() => scrollToSection('architecture')}
            className="block w-full text-left py-2 hover:text-[#F5F5F7]"
          >
            Architecture
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="block w-full text-left py-2 hover:text-[#F5F5F7]"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection('byoc')}
            className="block w-full text-left py-2 hover:text-[#F5F5F7]"
          >
            BYOC Setup
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            className="block w-full text-left py-2 hover:text-[#F5F5F7]"
          >
            FAQ
          </button>
          <button
            onClick={() => scrollToSection('contact')}
            className="block w-full text-left py-2 hover:text-[#F5F5F7]"
          >
            Get Started
          </button>
          <div className="pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenContact();
              }}
              className="w-full flex items-center justify-center px-4 py-2.5 text-xs font-mono font-semibold text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl"
            >
              <span>Request Free Setup</span>
              <ArrowRight className="w-4 h-4 ml-2 text-white" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
