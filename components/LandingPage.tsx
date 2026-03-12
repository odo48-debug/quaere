
import React from 'react';
import { SignInButton, SignedIn, SignedOut, useUser } from '@clerk/clerk-react';

const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <header className="px-8 py-5 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <span className="font-black text-lg uppercase italic tracking-tighter">Quaere Engine</span>
                </div>
                <SignInButton mode="modal">
                    <button className="px-4 py-2 text-sm font-bold bg-white text-black rounded-lg hover:bg-slate-200 transition-colors">
                        Sign In
                    </button>
                </SignInButton>
            </header>

            {/* Hero */}
            <main className="flex-grow flex flex-col items-center justify-center text-center px-6 py-24">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest mb-8">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
                    Local-First · Privacy by Default · Open Source
                </div>
                <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tight mb-6 leading-tight">
                    Give your<br />
                    <span className="text-indigo-400">AI Agent</span><br />
                    a Brain
                </h1>
                <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
                    Quaere Engine is a persistent, vector-powered PostgreSQL database that runs entirely in your browser — the perfect memory layer for AI agents like OpenClaw.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <SignInButton mode="modal">
                        <button className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)]">
                            Get Started Free →
                        </button>
                    </SignInButton>
                    <a
                        href="https://github.com/odo48-debug/quaere_pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-4 border border-white/20 hover:border-white/40 text-white font-bold text-sm rounded-xl transition-all"
                    >
                        View on GitHub
                    </a>
                </div>
            </main>

            {/* Features */}
            <section className="px-8 py-16 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full">
                {[
                    {
                        icon: '🧠',
                        title: 'Episodic Memory',
                        desc: 'Store time-stamped facts and observations. Queryable by text or by semantic similarity.',
                    },
                    {
                        icon: '🔗',
                        title: 'Semantic Knowledge',
                        desc: 'Subject–predicate–object triples for structured knowledge graphs your agent can reason over.',
                    },
                    {
                        icon: '⚙️',
                        title: 'Procedural Skills',
                        desc: 'Persist agent workflows, step-by-step plans, and learned skills as structured JSON.',
                    },
                ].map(f => (
                    <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
                        <div className="text-3xl">{f.icon}</div>
                        <h3 className="font-black uppercase text-sm tracking-widest text-white">{f.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                ))}
            </section>

            {/* Pricing */}
            <section className="px-8 py-16 border-t border-white/10 max-w-5xl mx-auto w-full">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-center mb-10">Pricing</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {[
                        {
                            plan: 'Free',
                            price: '€0',
                            features: ['Unlimited local databases', 'Up to 10K memories', 'Agent Bridge access', 'Open Source'],
                            cta: 'Start Free',
                            highlight: false,
                        },
                        {
                            plan: 'Pro',
                            price: '€9/mo',
                            features: ['Unlimited memories', 'Vector search (pgvector)', 'Priority support', 'Early access to features'],
                            cta: 'Upgrade to Pro',
                            highlight: true,
                        },
                    ].map(tier => (
                        <div
                            key={tier.plan}
                            className={`p-8 rounded-2xl border ${tier.highlight
                                ? 'bg-indigo-500/10 border-indigo-500/40'
                                : 'bg-white/5 border-white/10'}`}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-sm font-black uppercase tracking-widest text-slate-300">{tier.plan}</span>
                                <span className="text-2xl font-black">{tier.price}</span>
                            </div>
                            <ul className="space-y-2 mb-8">
                                {tier.features.map(f => (
                                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                                        <span className="text-indigo-400">✓</span> {f}
                                    </li>
                                ))}
                            </ul>
                            <SignInButton mode="modal">
                                <button className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${tier.highlight
                                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                    }`}>
                                    {tier.cta}
                                </button>
                            </SignInButton>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-600 uppercase tracking-widest">
                Quaere Engine — Local-First, Privacy by Default
            </footer>
        </div>
    );
};

export default LandingPage;
