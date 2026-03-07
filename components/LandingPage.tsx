
import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { IconSparkles, IconShieldCheck, IconCheck, IconArrowRight } from './icons';
import { SignInButton } from './auth/SignInButton';
import { SignUpButton } from './auth/SignUpButton';
import { UserButton } from './auth/UserButton';
import { PricingCard } from './PricingCard';

interface LandingPageProps {
  onGetStarted: () => void;
  onShowDocumentation?: () => void;
  onShowPrivacyPolicy?: () => void;
}

const USE_CASES = [
  { emoji: '🧾', label: 'Invoices & receipts' },
  { emoji: '📄', label: 'Contracts' },
  { emoji: '📦', label: 'Delivery notes' },
  { emoji: '💊', label: 'Medical reports' },
  { emoji: '🏠', label: 'Rental agreements' },
  { emoji: '📊', label: 'Bank statements' },
  { emoji: '👔', label: 'CVs & job applications' },
  { emoji: '⚖️', label: 'Legal documents' },
];

const STEPS = [
  {
    num: '01',
    title: 'Upload your documents',
    desc: 'Drop PDFs or images. Works with scanned documents, invoices, contracts, reports — any format.',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    num: '02',
    title: 'AI extracts & maps the data',
    desc: 'Quaere reads every field — dates, amounts, parties, signatures — and maps them to your table columns automatically.',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    num: '03',
    title: 'Stored locally. Always.',
    desc: 'Your extracted data lives in a real PostgreSQL database inside your browser. Zero cloud, zero vendor, zero data leaving your machine.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    num: '04',
    title: 'Ask in any language',
    desc: '"Show me the 5 highest invoices from January" — no SQL needed. Ask in Spanish, English, French or any language you prefer.',
    color: 'from-pink-500 to-rose-500',
  },
];

const PRIVACY_POINTS = [
  'Your files never leave your browser',
  'PostgreSQL runs locally — zero cloud storage',
  'GDPR compliant by design',
  'No vendor lock-in',
];

// Animated ticker for use cases
const UseCaseTicker: React.FC = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % USE_CASES.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="inline-flex items-center gap-2 text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent transition-all duration-500">
      {USE_CASES[idx].emoji} {USE_CASES[idx].label}
    </span>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onShowDocumentation, onShowPrivacyPolicy }) => {
  const { isSignedIn } = useUser();

  useEffect(() => {
    document.body.classList.add('dark-mode');
    document.documentElement.classList.add('dark-mode');
    return () => {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black w-full overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <IconSparkles className="w-7 h-7 text-blue-400" />
              <span className="text-xl font-extrabold text-white tracking-tight">Quaere</span>
            </div>
            <div className="flex items-center gap-4">
              {onShowDocumentation && (
                <button onClick={onShowDocumentation} className="hidden sm:block text-sm font-medium text-gray-400 hover:text-white transition-colors">
                  Docs
                </button>
              )}
              {isSignedIn ? (
                <>
                  <button onClick={onGetStarted} className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:shadow-lg transition-all">
                    Open App
                  </button>
                  <UserButton />
                </>
              ) : (
                <>
                  <SignInButton className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Sign In</SignInButton>
                  <SignUpButton className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:shadow-lg transition-all">
                    Start Free
                  </SignUpButton>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 bg-blue-900/40 text-blue-300 rounded-full text-xs font-bold border border-blue-800 uppercase tracking-widest">
          <IconShieldCheck className="w-3.5 h-3.5" />
          Privacy-first · Runs 100% in your browser
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-4">
          Stop copying PDFs<br />
          <span className="text-gray-500">into spreadsheets.</span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed">
          Drag in your documents, and let AI extract every field into a live database — in seconds. Then ask anything in your own language.
        </p>

        {/* Live use-case ticker */}
        <div className="text-center py-4 mb-10 min-h-[60px] flex items-center justify-center">
          <UseCaseTicker />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isSignedIn ? (
            <button onClick={onGetStarted} className="group inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
              Open my workspace <IconArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <SignUpButton className="group inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
              Try it free — no credit card <IconArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </SignUpButton>
          )}
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-gray-300 bg-gray-800 border border-gray-700 rounded-full hover:bg-gray-700 hover:scale-105 transition-all"
          >
            See how it works
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-600">No data leaves your browser</p>
      </div>

      {/* VIDEO DEMO */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-24 transition-all duration-1000 transform translate-y-0 opacity-100">
        <div className="relative group bg-gray-900/50 p-2 sm:p-4 rounded-3xl border border-gray-800/80 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] hover:border-blue-500/30 transition-all duration-500">
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/mWQnYvrrs5s?autoplay=0&rel=0&modestbranding=1"
              title="Quaere Demo Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            ></iframe>
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-700"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all duration-700"></div>
        </div>
      </div>

      {/* Social proof / document types strip */}
      <div className="border-y border-gray-800 bg-gray-900/40 py-6 overflow-hidden">
        <div className="flex gap-6 animate-[scroll_20s_linear_infinite] whitespace-nowrap w-max">
          {[...USE_CASES, ...USE_CASES].map((u, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-full font-medium">
              {u.emoji} {u.label}
            </span>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">How it works</h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">Three steps between your pile of PDFs and a structured, queryable database.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step) => (
            <div key={step.num} className="group bg-gray-800/50 border border-gray-700 rounded-2xl p-8 hover:border-blue-500/50 hover:-translate-y-1 transition-all">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} text-white text-lg font-extrabold mb-6`}>
                {step.num}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
              <p className="text-gray-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PRIVACY BLOCK */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-purple-950 border-y border-blue-900/50 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-5xl mb-6">🔒</div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Your documents never leave your computer
          </h2>
          <p className="text-lg text-blue-300 mb-10 max-w-2xl mx-auto">
            Quaere embeds a full PostgreSQL database inside your browser. No cloud storage, no SaaS vendors who can read your invoices, no GDPR headaches.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
            {PRIVACY_POINTS.map((p) => (
              <div key={p} className="flex items-center gap-3 text-blue-200 bg-blue-900/30 border border-blue-800 rounded-xl px-4 py-3">
                <IconCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-sm font-medium">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-24">
        <PricingCard />
      </div>

      {/* BOTTOM CTA */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
          Ready to stop the copy-paste?
        </h2>
        <p className="text-lg text-gray-400 mb-10">
          Start for free. No credit card, no installation, no cloud storage. Just drag a PDF and watch the magic happen.
        </p>
        {isSignedIn ? (
          <button onClick={onGetStarted} className="group inline-flex items-center gap-2 px-10 py-5 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
            Open my workspace <IconArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <SignUpButton className="group inline-flex items-center gap-2 px-10 py-5 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
            Start for free <IconArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </SignUpButton>
        )}
      </div>

      {/* FOOTER */}
      <footer className="bg-gray-950 border-t border-gray-800 text-gray-500 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <IconSparkles className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-gray-300">Quaere</span>
            <span className="text-xs text-gray-600 ml-2">© 2025</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            {onShowDocumentation && (
              <button onClick={onShowDocumentation} className="hover:text-white transition-colors">Docs</button>
            )}
            {onShowPrivacyPolicy && (
              <button onClick={onShowPrivacyPolicy} className="hover:text-white transition-colors">Privacy Policy</button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
