import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { isDemoEnabled } from '../config';

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

      const sectionIds = ['proof', 'how-it-works', 'differentiation', 'security', 'pricing', 'faq'];
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
    { id: 'proof', label: 'Product Proof' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'differentiation', label: 'Architecture & Math' },
    { id: 'security', label: 'Security & BYOC' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-200 ${
        isScrolled
          ? 'bg-[#0B0F14]/95 backdrop-blur-md border-b border-white/10 py-3 shadow-md'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <div
          className="flex items-center space-x-3 cursor-pointer group rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none p-1"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#161B22] border border-white/10 overflow-hidden text-blue-400 font-mono font-bold text-sm">
            <img src="/cortex-logo.png" alt="Cortex" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-base font-bold tracking-tight text-white font-sans">
              Cortex
            </span>
            <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400">
              engineering intelligence
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-7 text-xs font-medium text-slate-300">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`transition-colors py-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action CTAs */}
        <div className="hidden sm:flex items-center space-x-3">
          {onLaunchDemo && isDemoEnabled && (
            <button
              onClick={onLaunchDemo}
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#12181F] hover:bg-[#1A222D] border border-white/10 rounded-lg transition-colors cursor-pointer"
            >
              Interactive Demo
            </button>
          )}

          <button
            onClick={onOpenContact}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            Request Walkthrough
          </button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="lg:hidden flex items-center space-x-2">
          <button
            onClick={onOpenContact}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg"
          >
            Request Demo
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0E131A] border-b border-white/10 px-4 pt-3 pb-6 space-y-2 text-sm text-slate-300 animate-in fade-in duration-150">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`block w-full text-left py-2 px-2 rounded-lg transition-colors ${
                activeSection === item.id ? 'bg-white/5 text-white font-semibold' : 'text-slate-400 hover:text-white'
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
              className="w-full text-left py-2 px-2 text-slate-300 font-mono text-xs hover:text-white"
            >
              Launch Live App Demo →
            </button>
          )}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenContact();
            }}
            className="w-full mt-3 py-2.5 font-semibold text-center text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center space-x-2 shadow-sm"
          >
            <span>Request Walkthrough</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};
