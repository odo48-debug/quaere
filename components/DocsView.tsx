
import React, { useState } from 'react';

type Section = 'what' | 'how' | 'bridge' | 'plans' | 'quickstart';

const SECTIONS: { id: Section; icon: string; title: string }[] = [
    { id: 'what', icon: '🧠', title: 'What is Quaere?' },
    { id: 'quickstart', icon: '🚀', title: 'Quick Start' },
    { id: 'how', icon: '⚙️', title: 'How it Works' },
    { id: 'bridge', icon: '🔌', title: 'Agent Bridge API' },
    { id: 'plans', icon: '💎', title: 'Plans & Features' },
];

const Code: React.FC<{ children: string; lang?: string }> = ({ children, lang = 'js' }) => (
    <pre className="bg-slate-900 border border-slate-700 rounded-xl p-4 overflow-x-auto text-xs text-slate-300 font-mono leading-relaxed my-3 whitespace-pre-wrap">
        <code>{children.trim()}</code>
    </pre>
);

const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-base font-black uppercase tracking-widest text-white mt-6 mb-3 flex items-center gap-2">{children}</h2>
);

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-slate-400 text-sm leading-relaxed mb-3">{children}</p>
);

const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'indigo' }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-${color}-500/20 text-${color}-300 border border-${color}-500/30`}>{children}</span>
);

/* ─── Content Sections ─── */
const WhatSection = () => (
    <div>
        <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/30 rounded-2xl p-5 mb-5">
            <div className="text-4xl mb-3">🧠</div>
            <h1 className="text-xl font-black text-white mb-2">Give your AI Agent a Brain</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
                Quaere is a <strong className="text-white">local-first, vector-powered PostgreSQL database</strong> that runs entirely in your browser — no servers, no cloud, no privacy concerns. It's the perfect persistent memory layer for AI agents like <strong className="text-white">OpenClaw</strong>.
            </p>
        </div>

        <H2>🤔 What problem does it solve?</H2>
        <P>
            Most AI agents are <strong className="text-white">stateless</strong> — they forget everything when the conversation ends. Quaere gives your agent a permanent, searchable memory that persists across sessions. Think of it as the long-term memory that your AI was missing.
        </P>

        <H2>📦 Three types of memory</H2>
        <div className="grid grid-cols-1 gap-3 my-3">
            {[
                { icon: '💬', name: 'Episodic', desc: 'Time-stamped observations and facts. "The user said they prefer dark mode" or "This task was completed on Monday".' },
                { icon: '🔗', name: 'Semantic', desc: 'Structured knowledge as Subject → Predicate → Object triples. "User → works-at → Google" or "Python → is-a → programming language".' },
                { icon: '⚙️', name: 'Procedural', desc: 'Step-by-step workflows and skills. Store your agent\'s learned routines as structured JSON.' },
            ].map(m => (
                <div key={m.name} className="flex gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <div className="text-2xl shrink-0">{m.icon}</div>
                    <div>
                        <div className="font-black text-white text-sm mb-1">{m.name} Memory</div>
                        <div className="text-slate-400 text-xs leading-relaxed">{m.desc}</div>
                    </div>
                </div>
            ))}
        </div>

        <H2>🔒 Privacy by design</H2>
        <P>All your data lives <strong className="text-white">inside your browser</strong> using IndexedDB. We never see your memories. Not even the server knows what your agent has learned.</P>
    </div>
);

const QuickStartSection = () => (
    <div>
        <H2>🚀 Test it in 30 seconds</H2>
        <P>Open the browser console (<code className="text-indigo-400">F12</code>) and paste this to send your first memory:</P>
        <Code>{`const bridge = new BroadcastChannel('quaere_agent_bridge');

bridge.postMessage({
  type: 'REMEMBER',
  content: 'The user prefers dark mode and likes React.',
  source: 'my-agent',
  tags: ['preferences', 'ui']
});`}</Code>

        <P>Then click on <strong className="text-white">🧠 Episodic Memory</strong> in the sidebar — you'll see your memory appear in real time!</P>

        <H2>🔍 Test semantic search</H2>
        <P>Click the <strong className="text-white">Brain</strong> tab when you have a brain_ table selected, and type a question in the search bar. Quaere will find semantically similar memories — not just keyword matches.</P>

        <H2>🌐 Use from any app</H2>
        <P>Any website or web app running in the same browser can communicate with Quaere using the BroadcastChannel API. No SDK needed — just standard Web APIs.</P>
        <Code>{`// From your AI agent or any web app:
const brain = new BroadcastChannel('quaere_agent_bridge');

// Store a memory
brain.postMessage({ type: 'REMEMBER', content: '...', tags: ['...'] });

// Search by meaning (requires embed)
brain.postMessage({ 
  type: 'SEARCH', 
  query: 'What does the user like?',
  embedding: [...768 numbers...]  // optional, Pro users get auto-embed
});

// Listen for results
brain.onmessage = (e) => console.log('Result:', e.data);`}</Code>
    </div>
);

const HowSection = () => (
    <div>
        <H2>🏗️ Architecture</H2>
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-xs text-slate-400 leading-loose my-3">
            <div className="text-indigo-400">// 1. Your AI Agent (OpenClaw, ChatGPT plugin, etc.)</div>
            <div className="text-white">   ↓  BroadcastChannel('quaere_agent_bridge')</div>
            <div className="text-indigo-400">// 2. Agent Bridge (agentBridge.ts)</div>
            <div className="text-white">   ↓  Parse command + generate embedding (Pro)</div>
            <div className="text-indigo-400">// 3. PGlite Worker (PostgreSQL 17 in WASM)</div>
            <div className="text-white">   ↓  pgvector extension — store & search</div>
            <div className="text-indigo-400">// 4. IndexedDB (Your Browser)</div>
            <div className="text-white">   ↓  Persistent local storage</div>
            <div className="text-emerald-400">// 5. Brain Control Panel (React UI)</div>
            <div className="text-white">   ↓  Real-time live queries</div>
        </div>

        <H2>🧬 Vector Search Explained</H2>
        <P>
            When you store a memory with Pro, Quaere sends the text to <strong className="text-white">Google Gemini Embedding 2</strong> (the brand-new model released in 2025). This model converts your text into <strong className="text-white">768 numbers</strong> that capture its meaning mathematically.
        </P>
        <P>
            Later, when searching, the same process happens to your query. Then pgvector finds memories whose numbers are <strong className="text-white">closest in mathematical space</strong> — which means closest in meaning. This is how you find "coffee" when you search "hot beverages", without needing an exact word match.
        </P>

        <H2>⚡ Multi-tab support</H2>
        <P>Quaere uses a <strong className="text-white">Leader/Follower</strong> architecture. The first tab to open becomes the "Leader" and directly owns the database. Other tabs are "Followers" that proxy their queries through the Leader. This ensures data integrity across multiple browser tabs.</P>
    </div>
);

const BridgeSection = () => (
    <div>
        <H2>🔌 Agent Bridge Commands</H2>
        <P>Send messages via <code className="text-indigo-400">BroadcastChannel('quaere_agent_bridge')</code>. All commands require a unique <code className="text-slate-300">id</code> field.</P>

        {[
            {
                cmd: 'REMEMBER', badge: 'emerald', desc: 'Store a memory',
                code: `bridge.postMessage({
  type: 'REMEMBER',
  id: 'mem-001',
  memory_type: 'episodic', // 'semantic' | 'procedural'
  content: 'User likes TypeScript.',
  source: 'my-agent',
  tags: ['prefs'],
  // embedding: [...] // optional, auto-generated for Pro users
});`},
            {
                cmd: 'SEARCH', badge: 'blue', desc: 'Find memories by vector similarity',
                code: `bridge.postMessage({
  type: 'SEARCH',
  id: 'search-001',
  embedding: [...768 numbers...], // vector to search with
  limit: 5                        // optional, default 10
});

// Listen for results:
bridge.onmessage = (e) => {
  if (e.data.requestId === 'search-001') {
    console.log(e.data.data.rows); // Matching memories
  }
};`},
            {
                cmd: 'RECALL', badge: 'violet', desc: 'Full-text keyword search (Free tier)',
                code: `bridge.postMessage({
  type: 'RECALL',
  id: 'recall-001',
  query: 'dark mode preferences',
  limit: 10
});`},
            {
                cmd: 'FORGET', badge: 'red', desc: 'Delete a memory by ID',
                code: `bridge.postMessage({
  type: 'FORGET',
  id: 'forget-001',
  memory_id: 42  // The brain_episodic.id to delete
});`},
            {
                cmd: 'SQL_QUERY', badge: 'amber', desc: 'Run any SELECT query',
                code: `bridge.postMessage({
  type: 'SQL_QUERY',
  id: 'q-001',
  sql: 'SELECT * FROM brain_episodic WHERE source = $1 LIMIT 5',
  params: ['my-agent']
});`},
        ].map(item => (
            <div key={item.cmd} className="mb-5 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <code className="text-white font-black text-sm">{item.cmd}</code>
                    <Badge color={item.badge}>{item.badge === 'emerald' ? 'Free + Pro' : item.badge === 'blue' ? 'Pro' : 'Free'}</Badge>
                </div>
                <p className="text-slate-500 text-xs mb-2">{item.desc}</p>
                <Code>{item.code}</Code>
            </div>
        ))}
    </div>
);

const PlansSection = () => (
    <div>
        <H2>💎 Plans</H2>
        <div className="grid grid-cols-1 gap-4 my-3">
            <div className="border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <span className="font-black text-white uppercase tracking-widest text-sm">Free</span>
                    <span className="text-2xl font-black text-white">€0</span>
                </div>
                <ul className="space-y-2">
                    {['Up to 10,000 memories', 'Keyword search (RECALL)', 'Unlimited databases', 'Agent Bridge access', 'Full open-source code'].map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="text-emerald-400 font-black">✓</span>{f}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="border border-indigo-500/50 bg-indigo-500/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <span className="font-black text-indigo-300 uppercase tracking-widest text-sm">Pro</span>
                    <span className="text-2xl font-black text-white">€9<span className="text-sm text-slate-400">/mo</span></span>
                </div>
                <ul className="space-y-2">
                    {['Unlimited memories', 'AI-powered semantic search', 'Auto vector embeddings (Gemini 2)', 'Brain Control Panel', 'Priority support'].map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                            <span className="text-indigo-400 font-black">✓</span>{f}
                        </li>
                    ))}
                </ul>
            </div>
        </div>

        <H2>🌐 Self-hosting</H2>
        <P>Quaere is **100% open-source**. You can clone the repository and run all "Pro" features for free by providing your own API keys. The SaaS plan is for users who want a managed version with AI credits included.</P>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 my-3 text-xs text-amber-200 uppercase font-black tracking-widest">
            💡 Tip: Set VITE_GEMINI_API_KEY in your .env to enable all vector features locally.
        </div>
        <Code>{`git clone https://github.com/your-org/quaere-engine
cd quaere-engine
npm install
npm run dev`}</Code>
    </div>
);

/* ─── Main Component ─── */
export const DocsView: React.FC = () => {
    const [active, setActive] = useState<Section>('what');

    const renderContent = () => {
        switch (active) {
            case 'what': return <WhatSection />;
            case 'quickstart': return <QuickStartSection />;
            case 'how': return <HowSection />;
            case 'bridge': return <BridgeSection />;
            case 'plans': return <PlansSection />;
        }
    };

    return (
        <div className="h-full bg-slate-950 flex overflow-hidden text-white">
            {/* Sidebar nav */}
            <div className="w-48 shrink-0 border-r border-slate-800 flex flex-col p-3 gap-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 px-3 pb-2 pt-1">Documentation</div>
                {SECTIONS.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActive(s.id)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${active === s.id
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'}`}
                    >
                        <span>{s.icon}</span>
                        {s.title}
                    </button>
                ))}

                <div className="mt-auto pt-4 border-t border-slate-800">
                    <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:text-slate-400 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                        View on GitHub
                    </a>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-2xl">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
