
import React, { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { IconSparkles, IconShieldCheck, IconChat, IconQuote, IconCheck, IconZap, IconCrown, IconArrowRight, IconBook } from './icons';
import { SignInButton } from './auth/SignInButton';
import { SignUpButton } from './auth/SignUpButton';
import { UserButton } from './auth/UserButton';
import { PricingCard } from './PricingCard';

interface LandingPageProps {
  onGetStarted: () => void;
  onShowDocumentation?: () => void;
  onShowPrivacyPolicy?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onShowDocumentation, onShowPrivacyPolicy }) => {
  const { isSignedIn } = useUser();

  // Agregar clase dark-mode al body y html cuando se monta el componente
  useEffect(() => {
    document.body.classList.add('dark-mode');
    document.documentElement.classList.add('dark-mode');
    
    // Limpiar al desmontar
    return () => {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
    };
  }, []);

  const features = [
    {
      icon: IconShieldCheck,
      title: 'Secure & Private',
      description: 'Your documents are processed entirely in your browser. Nothing is ever uploaded to a server, ensuring your data remains confidential.'
    },
    {
      icon: IconChat,
      title: 'AI-Powered Chat',
      description: 'Ask complex questions in natural language. Get instant answers based exclusively on your document content.'
    },
    {
      icon: IconQuote,
      title: 'Source Highlighting',
      description: 'Verify AI answers with one click. Instantly highlight the exact text in the PDF that supports each response.'
    },
    {
      icon: IconZap,
      title: 'Lightning Fast',
      description: 'Optimized processing pipeline delivers instant results. No waiting, no delays—just pure productivity.'
    }
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black w-full">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700 shadow-sm w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <IconSparkles className="w-8 h-8 text-blue-500" />
              <span className="text-xl font-bold text-white">Quaere</span>
            </div>
            <div className="flex items-center gap-4">
              {onShowDocumentation && (
                <button
                  onClick={onShowDocumentation}
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Documentation
                </button>
              )}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center space-y-8 animate-fadeInUp">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900/50 text-blue-300 rounded-full text-sm font-semibold border border-blue-700">
              <IconShieldCheck className="w-4 h-4" />
              Privacy-First Document Analysis
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight">
              Analyze PDFs with  
              <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI-Powered Intelligence
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Analyze and chat with your PDFs instantly. 100% local, private, and secure AI document processing — no uploads, no servers.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isSignedIn ? (
                <button
                  onClick={onGetStarted}
                  className="group px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-300 flex items-center gap-2"
                >
                  Go to App
                  <IconArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <SignUpButton className="group px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-300 flex items-center gap-2">
                  Get Started Free
                  <IconArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </SignUpButton>
              )}
              <button
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 text-lg font-semibold text-white bg-gray-800 border border-gray-700 rounded-full shadow-lg hover:shadow-xl hover:bg-gray-700 transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-600"
              >
                View Pricing
              </button>
            </div>
            <p className="mt-6 text-sm text-gray-400">
              7-day free trial • No credit card required 
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Why Choose Quaere?
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Powerful features designed to transform how you work with documents
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-8 bg-gray-800/50 border border-gray-700 rounded-2xl shadow-lg hover:shadow-2xl hover:border-blue-500/50 transform hover:-translate-y-2 transition-all duration-300 animate-fadeInUp"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-24">
        <PricingCard />
      </div>

      {/* Video Demo Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            See Quaere in Action
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Watch how Quaere transforms your PDF workflow with AI-powered intelligence
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src="https://www.youtube.com/embed/Y05ZDGX9FAM"
              title="Quaere Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={onGetStarted}
            className="group px-10 py-5 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-300 inline-flex items-center gap-2"
          >
            Start Analyzing Now
            <IconArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <IconSparkles className="w-6 h-6 text-blue-500" />
            <span className="text-xl font-bold text-white">Quaere</span>
          </div>
          <p className="text-sm">
            2025 Quaere. All rights reserved. • Privacy-first document analysis.
          </p>
          <div className="mt-4">
            <a
              href="/privacy-policy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white transition-colors underline"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
