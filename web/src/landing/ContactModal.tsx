import React, { useState } from 'react';
import { X, Send, CheckCircle2, Mail, User, Building2, MessageSquare, Sparkles } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          access_key: '9eddc368-c586-4cdf-afea-5fa2e28b24c4',
          name: formData.name,
          email: formData.email,
          company: formData.company || 'N/A',
          message: formData.message,
          subject: `Cortex Setup Request - ${formData.name} (${formData.company || 'Individual'})`,
          from_name: 'Cortex Landing Page',
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSubmitted(true);
      } else {
        setSubmitted(true);
      }
    } catch (error) {
      console.warn('[Web3Forms] Error submitting form:', error);
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({ name: '', email: '', company: '', message: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#12141A] border border-white/10 rounded-xl p-6 sm:p-8 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#9497A6] hover:text-[#F5F5F7] rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            {/* Header */}
            <div className="mb-6 text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-[#0A0B0E] border border-white/10 text-[#3B82F6] text-xs font-mono mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Free Platform Setup</span>
              </div>
              <h3 className="text-2xl font-bold text-[#F5F5F7] font-mono">
                Request Free Cortex Setup
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[#9497A6] leading-relaxed">
                Reach out to request assistance in deploying Cortex on your free-tier Oracle, Neo4j &amp; Qdrant accounts — ₹0 cost.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* Name */}
              <div>
                <label className="block text-xs font-mono text-[#F5F5F7] mb-1">
                  Full Name <span className="text-[#3B82F6]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#9497A6] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Morgan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A0B0E] border border-white/10 rounded-xl text-[#F5F5F7] text-xs sm:text-sm focus:border-[#3B82F6] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-mono text-[#F5F5F7] mb-1">
                  Work Email <span className="text-[#3B82F6]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9497A6] absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="alex@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A0B0E] border border-white/10 rounded-xl text-[#F5F5F7] text-xs sm:text-sm focus:border-[#3B82F6] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Company / Team Name */}
              <div>
                <label className="block text-xs font-mono text-[#F5F5F7] mb-1">
                  Company / Team Name <span className="text-[#9497A6]">(Optional)</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#9497A6] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Acme Engineering"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A0B0E] border border-white/10 rounded-xl text-[#F5F5F7] text-xs sm:text-sm focus:border-[#3B82F6] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Short Message / Team Setup */}
              <div>
                <label className="block text-xs font-mono text-[#F5F5F7] mb-1">
                  Tell us about your team setup <span className="text-[#9497A6]">(GitHub / Slack / Jira)</span>
                </label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-[#9497A6] absolute left-3.5 top-3.5" />
                  <textarea
                    rows={3}
                    placeholder="We use GitHub for repos, Slack #engineering channels, and Jira Cloud for sprint planning..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A0B0E] border border-white/10 rounded-xl text-[#F5F5F7] text-xs sm:text-sm focus:border-[#3B82F6] focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 px-4 text-xs sm:text-sm font-mono font-bold text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.35)] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Sending Request...</span>
                ) : (
                  <>
                    <span>Submit Setup Request</span>
                    <Send className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Inline Success State */
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#3B82F6]/20 border border-[#3B82F6]/50 text-[#3B82F6] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(59,130,246,0.3)]">
              <CheckCircle2 className="w-10 h-10 text-[#3B82F6]" />
            </div>
            <h3 className="text-2xl font-bold text-[#F5F5F7] font-mono">
              Request Received!
            </h3>
            <p className="text-sm text-[#9497A6] leading-relaxed max-w-sm mx-auto">
              Thanks <span className="text-[#F5F5F7] font-semibold">{formData.name}</span> — I'll reach out directly to <span className="text-[#3B82F6] font-semibold">{formData.email}</span> within 24 hours to set up your free Cortex BYOC instance.
            </p>
            <button
              onClick={handleReset}
              className="mt-4 px-6 py-2.5 text-xs font-mono font-semibold text-[#F5F5F7] bg-[#0A0B0E] border border-white/10 rounded-xl hover:border-white/20 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
