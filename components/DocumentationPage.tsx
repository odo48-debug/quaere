
import React, { useEffect } from 'react';
import { IconSparkles, IconShieldCheck, IconChat, IconQuote, IconZap, IconUpload, IconArrowRight, IconBook, IconDocument } from './icons';
import { SignInButton } from './auth/SignInButton';
import { SignUpButton } from './auth/SignUpButton';
import { UserButton } from './auth/UserButton';
import { useUser } from '@clerk/clerk-react';

interface DocumentationPageProps {
  onGetStarted: () => void;
  onBackToHome: () => void;
  onShowPrivacyPolicy?: () => void;
}

export const DocumentationPage: React.FC<DocumentationPageProps> = ({ onGetStarted, onBackToHome, onShowPrivacyPolicy }) => {
  const { isSignedIn } = useUser();

  // Add dark-mode class to body and html when component mounts
  useEffect(() => {
    document.body.classList.add('dark-mode');
    document.documentElement.classList.add('dark-mode');

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black w-full">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700 shadow-sm w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <button onClick={onBackToHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <IconSparkles className="w-8 h-8 text-blue-500" />
                <span className="text-xl font-bold text-white">Quaere</span>
              </button>
              <button
                onClick={onBackToHome}
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Home
              </button>
            </div>
            <div className="flex items-center gap-4">
              {isSignedIn ? (
                <>
                  <button
                    onClick={onGetStarted}
                    className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:shadow-lg transition-all"
                  >
                    Go to App
                  </button>
                  <UserButton />
                </>
              ) : (
                <>
                  <SignInButton className="px-6 py-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors">
                    Sign In
                  </SignInButton>
                  <SignUpButton className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:shadow-lg transition-all">
                    Sign Up
                  </SignUpButton>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center space-y-6 animate-fadeInUp">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900/50 text-blue-300 rounded-full text-sm font-semibold border border-blue-700">
              <IconBook className="w-4 h-4" />
              Documentation
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight">
              Master Your Documents with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Precision AI</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Extract, map, and generate consistent documents through surgical AI-powered intelligence.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* Overview Section */}
        <section className="space-y-6 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold text-white">The Precision Engine</h2>
          <p className="text-lg text-gray-300 leading-relaxed">
            Quaere is a specialized <strong>Precision Document Engine</strong>. It goes beyond simple analysis by allowing you to
            transform raw document data into structured variables, which are then used to generate consistent,
            high-quality professional documents at scale.
          </p>
        </section>

        {/* Key Features Section */}
        <section className="space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Surgical Features</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <IconZap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Surgical Extraction</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Identify and extract variable data points with 100% accuracy using our AI-driven OCR and layout engine.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <IconShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Variable Intelligence</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Map extracted data to structured database tags. Control every variable before it enters your generation workflow.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <IconDocument className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Consistent Generation</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Use your structured variables to build powerful templates. Generate perfectly formatted documents consistently.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <IconShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Local & Private</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Your data is processed in the browser. Privacy is part of our core architecture, ensuring your documents remain secure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="space-y-8 bg-gray-800/30 p-8 rounded-2xl border border-gray-700">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center">The Workflow</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto shadow-lg shadow-blue-500/20">
                1
              </div>
              <h3 className="text-xl font-bold text-white">Identify & Extract</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Upload your document. Our AI scans the layout and extracts precise data points into structured fields.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto shadow-lg shadow-purple-500/20">
                2
              </div>
              <h3 className="text-xl font-bold text-white">Structure & Map</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Define and map your variables. Transform the extracted text into reliable database tags for your workflow.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto shadow-lg shadow-indigo-500/20">
                3
              </div>
              <h3 className="text-xl font-bold text-white">Compose & Generate</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Build your template using your mapped tags. Generate and export professional documents instantly.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900/50 backdrop-blur-sm text-gray-400 py-12 mt-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <IconSparkles className="w-6 h-6 text-blue-500" />
            <span className="text-xl font-bold text-white">Quaere</span>
          </div>
          <p className="text-sm">
            &copy; 2026 Quaere. All rights reserved. • Building the future of document intelligence.
          </p>
          <div className="mt-4">
            <button
              onClick={onShowPrivacyPolicy}
              className="text-sm text-gray-500 hover:text-white transition-colors underline"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
