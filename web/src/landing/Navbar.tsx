import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight, Sparkles } from 'lucide-react';
import { isDemoEnabled } from '../config';
import { CortexLogo } from '../components/CortexLogo';

interface NavbarProps {
  onOpenContact: () => void;
  onLaunchDemo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenContact, onLaunchDemo }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      const sectionIds = [
        'proof',
        'how-it-works',
        'metrics-defined',
        'guarantees',
        'use-cases',
        'security',
        'pricing',
        'faq'
      ];
      const scrollPosition = window.scrollY + 120;

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(id);
            return;
          }
        }
      }
      if (window.scrollY < 200) {
        setActiveSection('');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = [
    { id: 'proof', label: 'Proof' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'metrics-defined', label: 'Metrics' },
    { id: 'guarantees', label: 'Guarantees' },
    { id: 'use-cases', label: 'Use Cases' },
    { id: 'security', label: 'Security' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#06090F]/80 backdrop-blur-xl border-b border-white/[0.06] py-2.5'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <div
          className="flex items-center space-x-3 cursor-pointer group rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none p-1 shrink-0"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        >
          <CortexLogo className="w-8 h-8" />
          <div className="flex items-center space-x-2.5">
            <span className="text-base font-bold tracking-tight text-white font-sans">
              Cortex
            </span>
            <span className="hidden xl:inline-flex items-center space-x-1 text-[10px] font-mono text-slate-500 bg-white/[0.03] px-2 py-0.5 rounded-full border border-white/[0.06]">
              <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
              <span>engineering intelligence</span>
            </span>
          </div>
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-1.5 py-1">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-white bg-white/[0.08] shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Action CTAs */}
        <div className="hidden sm:flex items-center space-x-3 shrink-0">
          {onLaunchDemo && isDemoEnabled && (
            <button
              onClick={onLaunchDemo}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] rounded-xl transition-all duration-200 cursor-pointer"
            >
              Interactive Demo
            </button>
          )}

          <button
            onClick={onOpenContact}
            className="group px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all duration-200 shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/30 cursor-pointer flex items-center space-x-1.5 hover:-translate-y-px"
          >
            <span>Request Walkthrough</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="lg:hidden flex items-center space-x-2">
          <button
            onClick={onOpenContact}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg"
          >
            Request Demo
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div 
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-[#0A0E16]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 pt-3 pb-6 space-y-1 text-sm text-slate-300">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`block w-full text-left py-2.5 px-3 rounded-xl transition-all duration-200 ${
                activeSection === item.id 
                  ? 'bg-white/[0.06] text-white font-semibold' 
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              {item.label}
            </button>
          ))}

          {onLaunchDemo && isDemoEnabled && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLaunchDemo();
              }}
              className="w-full text-left py-2.5 px-3 text-slate-300 font-mono text-xs hover:text-white rounded-xl hover:bg-white/[0.03]"
            >
              Launch Live App Demo →
            </button>
          )}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenContact();
            }}
            className="w-full mt-3 py-3 font-semibold text-center text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/20"
          >
            <span>Request Walkthrough</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
