import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, Search, ExternalLink, ShieldAlert } from 'lucide-react';
import type { StaleOutlierPr } from '../lib/api';

interface OutlierPrModalProps {
  isOpen: boolean;
  onClose: () => void;
  outliers: StaleOutlierPr[];
  repoName?: string;
}

export const OutlierPrModal: React.FC<OutlierPrModalProps> = ({
  isOpen,
  onClose,
  outliers,
  repoName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredOutliers = outliers.filter((pr) => {
    const term = searchTerm.toLowerCase();
    return (
      pr.title.toLowerCase().includes(term) ||
      pr.author.toLowerCase().includes(term) ||
      pr.prId.toLowerCase().includes(term)
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="outlier-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="cortex-card w-full max-w-3xl max-h-[85vh] flex flex-col bg-[var(--bg-panel)] border border-[var(--border-strong)] shadow-2xl rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-subtle)]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 id="outlier-modal-title" className="text-base font-bold text-[var(--text-primary)]">
                  Stale & Outlier Pull Requests
                </h3>
                <span className="cortex-badge badge-moderate text-xs">
                  {outliers.length} PR{outliers.length === 1 ? '' : 's'} &gt; 30d
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {repoName ? `Isolated from headline stats for ${repoName}` : 'Isolated from organization headline median'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close outlier modal"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Label / Non-Punitive Notice */}
        <div className="p-4 bg-amber-500/5 border-b border-amber-500/15 flex items-start space-x-3 text-xs text-amber-200/90">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">
              Excluded from headline stats — not "worst performers"
            </p>
            <p className="text-amber-200/80 leading-relaxed">
              Per <code className="text-amber-300 font-mono text-[11px]">docs/metrics-definitions.md</code>, pull requests open or pending review for more than 30 days are segregated to prevent long-running, dormant, or experimental branches from distorting standard team delivery cadence.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        {outliers.length > 3 && (
          <div className="px-6 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search by title, author, or PR identifier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-md pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Outlier List / Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {outliers.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Clock className="w-10 h-10 mx-auto text-emerald-400/60" />
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Zero Stale Outliers</h4>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                All merged pull requests in this evaluation period completed review within 30 calendar days.
              </p>
            </div>
          ) : filteredOutliers.length === 0 ? (
            <div className="text-center py-8 text-xs text-[var(--text-muted)]">
              No stale PRs match "{searchTerm}".
            </div>
          ) : (
            <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
              <table className="cortex-table">
                <thead>
                  <tr>
                    <th>Pull Request</th>
                    <th>Author</th>
                    <th>Days Open</th>
                    <th>Headline Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOutliers.map((pr) => (
                    <tr key={pr.prId} className="group">
                      <td className="font-medium text-[var(--text-primary)]">
                        <div className="flex items-center space-x-2">
                          <span className="text-[var(--text-secondary)] font-mono text-[11px]">
                            {pr.prId}
                          </span>
                          <span className="truncate max-w-md" title={pr.title}>
                            {pr.title}
                          </span>
                        </div>
                      </td>
                      <td className="text-[var(--text-secondary)] font-mono text-xs">
                        {pr.author}
                      </td>
                      <td className="text-amber-400 font-mono font-semibold text-xs whitespace-nowrap">
                        {pr.durationDays} days
                      </td>
                      <td>
                        <span className="cortex-badge badge-moderate text-[10px]">
                          Segregated (&gt;30d)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>
            Showing {filteredOutliers.length} of {outliers.length} outlier{outliers.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={onClose}
            className="cortex-btn-secondary px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
