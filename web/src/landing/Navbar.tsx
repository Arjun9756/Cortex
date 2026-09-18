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
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      const sectionIds = ['proof', 'architecture', 'features', 'byoc', 'pricing', 'faq'];
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

  const navItems = [
    { id: 'proof', label: 'Product Proof' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'features', label: 'Capabilities' },
    { id: 'byoc', label: 'Self-Hosted Setup' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#06080e]/95 backdrop-blur-xl border-b border-slate-800/80 py-3 shadow-2xl shadow-indigo-950/10'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <div
          className="flex items-center space-x-3 cursor-pointer group focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none rounded-xl"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/40 overflow-hidden shadow-lg shadow-indigo-500/20 group-hover:border-indigo-400 transition-all">
            <img src="/cortex-logo.png" alt="Cortex Logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-extrabold tracking-tight text-white font-sans">
              Cortex
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-mono tracking-wider font-bold rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase">
              Self-Hosted Knowledge Graph
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links with Active Scrollspy */}
        <nav className="hidden md:flex items-center space-x-7 text-xs font-semibold uppercase tracking-wider">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`transition-all duration-200 cursor-pointer py-1 border-b-2 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none rounded-sm ${
                  isActive
                    ? 'text-white border-indigo-400 font-bold'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action CTAs */}
        <div className="hidden md:flex items-center space-x-3">
          {onLaunchDemo && isDemoEnabled && (
            <button
              onClick={onLaunchDemo}
              className="px-4 py-2 text-xs font-bold font-mono text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer flex items-center space-x-2 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Launch Demo</span>
            </button>
          )}

          <button
            onClick={onOpenContact}
            className="px-4 py-2 text-xs font-bold font-mono text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/25 border border-indigo-400/20 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
          >
            Request Free Setup
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
            className="p-2 text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-lg"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#07090e]/95 border-b border-slate-800/80 px-4 pt-3 pb-6 space-y-3 font-mono text-xs text-slate-300 backdrop-blur-xl animate-in fade-in duration-200">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`block w-full text-left py-2.5 border-b border-slate-900 transition-colors ${
                activeSection === item.id ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenContact();
            }}
            className="w-full mt-3 py-3 font-bold text-center text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30"
          >
            <span>Request Free Setup</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};
