import React, { useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { DemoRequestForm } from './DemoRequestForm';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({ 
  isOpen, 
  onClose, 
  initialMessage = '' 
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-xl bg-[#12181F] border border-white/10 rounded-xl p-6 sm:p-8 shadow-2xl my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6 text-left">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#0E131A] border border-white/10 text-blue-400 text-xs font-mono mb-3">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Design Partner Program · $0 License Fee</span>
          </div>
          <h2 id="modal-title" className="text-2xl font-bold text-white font-sans tracking-tight">
            Schedule a 30-Minute Architecture Walkthrough
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
            Connect your repositories in a sandboxed trial or explore our self-hosted Docker and Helm deployments.
          </p>
        </div>

        {/* Form Container */}
        <DemoRequestForm 
          onSuccess={() => {}} 
          initialMessage={initialMessage} 
          source="Modal Walkthrough Button" 
        />
      </div>
    </div>
  );
};
