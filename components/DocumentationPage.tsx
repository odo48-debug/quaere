
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
              How Quaere Works
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Learn how to analyze your PDF documents with AI-powered intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        
        {/* Overview Section */}
        <section className="space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Overview</h2>
          <p className="text-lg text-gray-300 leading-relaxed">
            Quaere is a powerful web application designed to help you interact with your PDF documents like never before. 
            This tool allows you to upload a PDF, extract its content, and engage in to find the information you need, quickly and accurately.
          </p>
        </section>

        {/* Key Features Section */}
        <section className="space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Key Features</h2>
          
          <div className="grid gap-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <IconZap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Fast & Efficient</h3>
                  <p className="text-gray-300 leading-relaxed">
                    The entire analysis process, from text extraction to rendering, is optimized for speed, 
                    giving you instant access to your document's content.
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
                  <h3 className="text-xl font-bold text-white mb-2">Secure & Private</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Your privacy is paramount. All processing, including PDF rendering and text extraction, happens 
                    entirely within your browser. Your documents are <strong>never</strong> uploaded to any server, 
                    ensuring your data remains confidential.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <IconChat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Precise AI-Powered Chat</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Ask complex questions in natural language. The AI assistant provides answers and analysis
                    based <em>exclusively</em> on the content of your document, eliminating guesswork and external information.
                  </p>
                </div>
              </div>
            </div>

    

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <IconQuote className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Source Highlighting</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Never lose track of where information comes from. When the AI cites a piece of text from the document, 
                    you can click to instantly highlight the exact passage on the PDF page, verifying the source with a single click.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white">How It Works</h2>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">Upload</h3>
                <p className="text-gray-300 leading-relaxed">
                  Select any PDF file from your local computer. Click the "Choose PDF" button in the sidebar and 
                  browse to your document.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">Analyze</h3>
                <p className="text-gray-300 leading-relaxed">
                  The application renders the document and extract all text directly in your browser. No data is 
                  sent to external servers during this process.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">Chat</h3>
                <p className="text-gray-300 leading-relaxed">
                  The extracted text is then passed as context to the model. You can ask questions, request 
                  summaries, or search specific information. The model uses its advanced understanding and function 
                  calling capabilities to respond accurately.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-16">
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
