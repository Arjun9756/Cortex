import React, { useState, useEffect } from 'react';
import { ArrowRight, Menu, X, Zap } from 'lucide-react';
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
          ? 'bg-[#06080e]/90 backdrop-blur-xl border-b border-slate-800/80 py-3 shadow-2xl shadow-indigo-950/10'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <div
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/40 overflow-hidden shadow-lg shadow-indigo-500/20 group-hover:border-indigo-400 transition-all">
            <img src="/cortex-logo.png" alt="Cortex Logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-extrabold tracking-tight text-white font-sans">
              Cortex
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider font-bold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
              Pipeline Hardened
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <button
            onClick={() => scrollToSection('architecture')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Architecture
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Capabilities
          </button>
          <button
            onClick={() => scrollToSection('byoc')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Self-Hosted Setup
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            FAQ
          </button>
        </nav>

        {/* Right Action CTAs */}
        <div className="hidden md:flex items-center space-x-3">
          {onLaunchDemo && isDemoEnabled && (
            <button
              onClick={onLaunchDemo}
              className="px-4 py-2 text-xs font-bold font-mono text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all cursor-pointer flex items-center space-x-2 shadow-lg shadow-indigo-600/25 border border-indigo-400/20"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Launch Live Assistant</span>
            </button>
          )}

          <button
            onClick={onOpenContact}
            className="px-4 py-2 text-xs font-bold font-mono text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer"
          >
            Get Enterprise Setup
          </button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="md:hidden flex items-center space-x-2">
          {onLaunchDemo && isDemoEnabled && (
            <button
              onClick={onLaunchDemo}
              className="px-3 py-1.5 text-xs font-bold font-mono text-white bg-indigo-600 rounded-lg flex items-center space-x-1"
            >
              <span>Demo</span>
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#07090e]/95 border-b border-slate-800/80 px-4 pt-3 pb-6 space-y-3 font-mono text-xs text-slate-300 backdrop-blur-xl animate-in fade-in duration-200">
          <button
            onClick={() => scrollToSection('architecture')}
            className="block w-full text-left py-2 hover:text-white border-b border-slate-900"
          >
            Architecture
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="block w-full text-left py-2 hover:text-white border-b border-slate-900"
          >
            Capabilities
          </button>
          <button
            onClick={() => scrollToSection('byoc')}
            className="block w-full text-left py-2 hover:text-white border-b border-slate-900"
          >
            Self-Hosted Setup
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            className="block w-full text-left py-2 hover:text-white border-b border-slate-900"
          >
            FAQ
          </button>

          <button
            onClick={onOpenContact}
            className="w-full mt-2 py-3 font-bold text-center text-white bg-indigo-600 rounded-xl flex items-center justify-center space-x-2"
          >
            <span>Request Enterprise Setup</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};
