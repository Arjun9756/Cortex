import React, { useState } from 'react';
import { 
  UserMinus, 
  UserPlus, 
  Flame, 
  FileText, 
  Layers 
} from 'lucide-react';

interface UseCase {
  id: string;
  icon: any;
  title: string;
  tag: string;
  scenario: string;
  productBehavior: string;
  evidenceProduced: string[];
  sampleQueryResult: {
    query: string;
    resultSnippet: string;
  };
}

export const UseCasesSection: React.FC = () => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('departure');

  const useCases: UseCase[] = [
    {
      id: 'departure',
      icon: UserMinus,
      title: 'Sudden Engineer Departure',
      tag: 'Successor Recommendation',
      scenario:
        'A principal engineer who authored 84% of your payment tokenization microservice gives two weeks notice. Team leadership needs an objective, data-backed handover plan before knowledge walks out the door.',
      productBehavior:
        'Cortex runs a 4-factor successor matching algorithm across remaining active team members: evaluating technology footprint Jaccard similarity (40%), direct repository contribution history (30%), 30-day activity recency (20%), and current workload capacity headroom (10%). Overloaded peers maintaining existing SPOF services are penalized.',
      evidenceProduced: [
        'Deterministic candidate ranking: Top match scored 82% based on shared TypeScript & Stripe webhook contributions.',
        'Targeted transition checklist: Generates exact list of files and pull requests where departing engineer was sole reviewer.',
        'Zero ghost successors: Excludes alumni and bot accounts from succession pools.'
      ],
      sampleQueryResult: {
        query: 'cortex successor recommend --person "priyasharma" --repo "payment-gateway"',
        resultSnippet: 'Recommended: Vikram Patel (Score: 82% · Tech Jaccard: 0.78 · Repo Overlap: 1.0 · Workload: Healthy)'
      }
    },
    {
      id: 'onboarding',
      icon: UserPlus,
      title: 'New Hire Engineering Onboarding',
      tag: 'Living Knowledge Map',
      scenario:
        'A newly hired engineer is assigned their first bug fix in a distributed microservices repo with 20 services. Internal Confluence wikis were last updated 14 months ago and contradict current production code.',
      productBehavior:
        'The new engineer queries the living knowledge graph to inspect who actively touches each service, decayed code ownership percentages over the last 180 days, and current technology stacks without constantly interrupting senior engineers.',
      evidenceProduced: [
        'Decayed ownership breakdown: Shows who wrote the active code today, not who created the repo 4 years ago.',
        'Technology footprint matrix: Identifies primary frameworks (Fastify, Neo4j, Redis) utilized in the target repository.',
        'Recent PR context: Surfaces the last 10 merged pull requests and their review turnaround times.'
      ],
      sampleQueryResult: {
        query: 'cortex repo inspect "auth-service" --view ownership',
        resultSnippet: 'Primary Owner: Devendra Singh (54% decayed ownership) · Bus Factor: 3 (Healthy) · Tech: TypeScript, Redis, JWT'
      }
    },
    {
      id: 'incident',
      icon: Flame,
      title: 'Production Incident Triage',
      tag: 'Blast Radius & Recent Changes',
      scenario:
        'A critical P1 error spikes in core payment routing at 2:00 AM. The on-call engineer needs to determine within minutes: what changed recently, what downstream services depend on this, and who has deepest current operational context.',
      productBehavior:
        'Cortex instantly surfaces the repository’s Single Point of Failure (SPOF) rating, recent pull request merges within the last 48 hours, active microservice dependency edges, and the primary author of the affected module.',
      evidenceProduced: [
        'Change correlation: Isolates recent PRs merged in the last 48 hours with author metadata and line diff counts.',
        'AST dependency traversal: Maps which downstream services call the failing endpoint.',
        'Primary maintainer contact: Identifies the active engineer holding highest decayed commit ownership.'
      ],
      sampleQueryResult: {
        query: 'cortex incident blast-radius --service "billing-engine" --window "48h"',
        resultSnippet: 'SPOF Alert: Bus Factor 1 · Recent Merges: PR #142 (Stripe webhook refactor) · Primary Maintainer: Arjun Kumar'
      }
    },
    {
      id: 'stale-docs',
      icon: FileText,
      title: 'Stale Architecture & Technical Debt',
      tag: 'Evidence-Backed Q&A',
      scenario:
        'An engineering team is debating why an in-memory Redis cache was replaced with Valkey six months ago. Documentation contains conflicting Jira tickets and no one remembers the exact context.',
      productBehavior:
        'Engineers ask Cortex natural language architectural queries. The agent navigates the property graph and vector embeddings, returning grounded answers with exact commit SHAs, PR review discussions, and Slack architectural thread citations.',
      evidenceProduced: [
        'Zero generative speculation: Answers are synthesized strictly from retrieved commit messages and issue threads.',
        'Exact citation SHAs: Every factual claim links to verifiable git commit hashes and PR numbers.',
        'Explicit data completeness: If no historical record exists, Cortex returns "No records found" rather than hallucinating.'
      ],
      sampleQueryResult: {
        query: '"Why was Redis replaced with Valkey in core-platform-gateway?"',
        resultSnippet: 'Grounded Answer: "Redis was replaced with Valkey in commit 8f3b12a (PR #89) following licensing policy revisions. Verified in discussion thread #eng-backend."'
      }
    }
  ];

  const currentCase = useCases.find(c => c.id === selectedCaseId) || useCases[0];

  return (
    <section id="use-cases" className="py-20 md:py-28 bg-[#0B0F14] relative border-t border-white/10 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#12181F] border border-white/10 text-slate-300 text-xs font-mono mb-4">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Built For Production Engineering</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
            Engineered for real operational scenarios.
          </h2>

          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Concrete problems solved by deterministic knowledge graphs. No fabricated customer testimonials or marketing fluff.
          </p>
        </div>

        {/* 4 Interactive Scenario Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 max-w-6xl mx-auto">
          {useCases.map((uc) => {
            const Icon = uc.icon;
            const isSelected = selectedCaseId === uc.id;
            return (
              <button
                key={uc.id}
                onClick={() => setSelectedCaseId(uc.id)}
                className={`p-5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-[#12181F] border-blue-500/50 shadow-md'
                    : 'bg-[#0E131A] border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {uc.tag}
                  </span>
                </div>

                <div className="font-semibold text-sm text-white font-sans">
                  {uc.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Deep Dive Scenario Card */}
        <div className="bg-[#12181F] border border-white/10 rounded-2xl p-6 sm:p-10 max-w-6xl mx-auto space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Scenario & Product Behavior */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">
                  Scenario Context
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  {currentCase.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  {currentCase.scenario}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Deterministic Product Behavior
                </span>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  {currentCase.productBehavior}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Verifiable Evidence Generated
                </span>
                <ul className="space-y-2 text-xs text-slate-300 font-sans leading-relaxed">
                  {currentCase.evidenceProduced.map((ev, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-blue-400 font-bold shrink-0">✓</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Terminal Command & Grounded Output Frame */}
            <div className="lg:col-span-5 space-y-3">
              <div className="browser-chrome">
                <div className="browser-header justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="browser-dot bg-[#EF4444]/80" />
                    <span className="browser-dot bg-[#F59E0B]/80" />
                    <span className="browser-dot bg-[#10B981]/80" />
                    <span className="text-xs text-slate-400 font-mono ml-2">Cortex CLI &amp; API Output</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Live Telemetry</span>
                </div>

                <div className="p-5 bg-[#080B0F] space-y-4 font-mono text-xs">
                  <div className="space-y-1">
                    <div className="text-slate-500 text-[11px]">$ CLI Command</div>
                    <code className="text-blue-400 block break-all">{currentCase.sampleQueryResult.query}</code>
                  </div>

                  <div className="space-y-1 pt-3 border-t border-white/5">
                    <div className="text-slate-500 text-[11px]">$ Evidence-Backed Response</div>
                    <p className="text-slate-300 text-xs leading-relaxed font-sans bg-[#0E131A] p-3 rounded-lg border border-white/5">
                      {currentCase.sampleQueryResult.resultSnippet}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-500 text-center">
                Query executed directly against live Neo4j graph &amp; PostgreSQL metrics.
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
