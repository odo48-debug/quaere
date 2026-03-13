
import React, { useState } from 'react';
import { SignInButton, SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import { DocsView } from './DocsView';
import { IconX } from './icons';

const LandingPage: React.FC = () => {
    const [showFullDocs, setShowFullDocs] = useState(false);

    if (showFullDocs) {
        return (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col">
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 shrink-0 bg-slate-950">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-lg">🧠</div>
                        <span className="font-black text-lg uppercase italic tracking-tighter text-white">Quaere Docs</span>
                    </div>
                    <button
                        onClick={() => setShowFullDocs(false)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <IconX className="w-6 h-6" />
                    </button>
                </header>
                <div className="flex-grow overflow-hidden">
                    <DocsView />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <header className="px-8 py-5 flex items-center justify-between border-b border-white/10 sticky top-0 bg-black/50 backdrop-blur-md z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <span className="font-black text-lg uppercase italic tracking-tighter">Quaere Engine</span>
                </div>
                <div className="flex items-center gap-6">
                    <a href="#features" className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Features</a>
                    <button
                        onClick={() => setShowFullDocs(true)}
                        className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                    >
                        Docs
                    </button>
                    <SignInButton mode="modal">
                        <button className="px-4 py-2 text-[11px] font-black uppercase tracking-widest bg-white text-black rounded-lg hover:bg-slate-200 transition-colors">
                            Sign In
                        </button>
                    </SignInButton>
                </div>
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
            <section id="features" className="px-8 py-24 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full">
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

            {/* API Showcase */}
            <section id="api" className="px-8 py-24 border-t border-white/10 bg-gradient-to-b from-transparent to-indigo-500/5">
                <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl mb-6">🔌</div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-6">Developer First API</h2>
                        <p className="text-slate-400 leading-relaxed mb-6">
                            Integrating Quaere with your AI agent is as simple as sending a browser message. No complex SDKs, no network bottlenecks. Use a simple <code className="text-indigo-400">BroadcastChannel</code> to store and search memories from any tab.
                        </p>
                        <ul className="space-y-4">
                            {[
                                'Zero-latency local communication',
                                'Standard Web API: BroadcastChannel',
                                'SQL injection protected',
                                'Cross-tab synchronization baked-in'
                            ].map(item => (
                                <li key={item} className="flex items-center gap-3 text-sm text-slate-300 font-bold italic">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => setShowFullDocs(true)}
                            className="mt-8 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                            Read Full Documentation →
                        </button>
                    </div>
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 font-mono text-[11px] leading-relaxed overflow-hidden shadow-2xl">
                            <div className="flex items-center gap-1.5 mb-4 px-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40"></div>
                                <span className="ml-2 text-slate-500 uppercase tracking-widest font-black text-[9px]">agent-memory-demo.js</span>
                            </div>
                            <div className="text-slate-300">
                                <span className="text-purple-400">const</span> <span className="text-blue-400">bridge</span> = <span className="text-purple-400">new</span> <span className="text-emerald-400">BroadcastChannel</span>(<span className="text-amber-200">'quaere_agent_bridge'</span>);<br /><br />
                                <span className="text-slate-500">// Store a new ephemeral memory</span><br />
                                <span className="text-blue-400">bridge</span>.<span className="text-blue-200">postMessage</span>({'{'}<br />
                                &nbsp;&nbsp;type: <span className="text-amber-200">'REMEMBER'</span>,<br />
                                &nbsp;&nbsp;memory_type: <span className="text-amber-200">'episodic'</span>,<br />
                                &nbsp;&nbsp;content: <span className="text-amber-200">'User likes dark UI and React'</span>,<br />
                                &nbsp;&nbsp;tags: [<span className="text-amber-200">'pref'</span>, <span className="text-amber-200">'ui'</span>]<br />
                                {'}'});<br /><br />
                                <span className="text-slate-500">// Semantic search (Pro users automatically get Gemini 2 embeddings)</span><br />
                                <span className="text-blue-400">bridge</span>.<span className="text-blue-200">postMessage</span>({'{'}<br />
                                &nbsp;&nbsp;type: <span className="text-amber-200">'SEARCH'</span>,<br />
                                &nbsp;&nbsp;query: <span className="text-amber-200">'Does the user have UI preferences?'</span><br />
                                {'}'});
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="px-8 py-16 border-t border-white/10 max-w-5xl mx-auto w-full">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-center mb-10">Pricing</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {[
                        {
                            plan: 'Free',
                            price: '€0',
                            features: ['10,000 memories', 'Standard keyword search', 'Unlimited local databases', 'Agent Bridge access'],
                            cta: 'Start Free',
                            highlight: false,
                        },
                        {
                            plan: 'Pro',
                            price: '€9/mo',
                            features: [
                                'Unlimited memories',
                                'AI-Powered Semantic Search',
                                'Gemini 2 Auto-Embeddings',
                                'Brain Control Panel',
                                'Priority Support'
                            ],
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
