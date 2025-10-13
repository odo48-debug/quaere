
import React, { useEffect } from 'react';
import { IconSparkles, IconShieldCheck } from './icons';
import { SignInButton } from './auth/SignInButton';
import { SignUpButton } from './auth/SignUpButton';
import { UserButton } from './auth/UserButton';
import { useUser } from '@clerk/clerk-react';

interface PrivacyPolicyPageProps {
  onGetStarted: () => void;
  onBackToHome: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onGetStarted, onBackToHome }) => {
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
            <button onClick={onBackToHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <IconSparkles className="w-8 h-8 text-blue-500" />
              <span className="text-xl font-bold text-white">Quaere</span>
            </button>
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
              <IconShieldCheck className="w-4 h-4" />
              Privacy Policy
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight">
              Privacy Policy for Quaere
            </h1>
            <p className="text-lg text-gray-400">
              Effective Date: October 13, 2025
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 space-y-8">
          <p className="text-lg text-gray-300 leading-relaxed">
            Quaere values your privacy. This policy explains how we collect, use, and protect your information.
          </p>

          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">1. Information We Collect</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                <strong className="text-white">Personal Data:</strong> We collect email addresses and user profile information when you sign up for a free trial or subscription through our authentication provider (Clerk). This data is used to manage your account, communicate with you, and provide access to our services.
              </p>
              <p>
                <strong className="text-white">Document Data:</strong> All PDF processing, including text extraction and rendering, happens entirely within your browser. Your documents are <strong>never uploaded to our servers</strong> and remain completely private on your device.
              </p>
              <p>
                <strong className="text-white">Usage Data:</strong> We collect usage statistics such as the number of pages processed and API calls made to manage subscription limits and improve our services.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">2. Use of Information</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                <strong className="text-white">Personal Data:</strong> Your email address and profile information are used for account management, service-related communications, billing, and providing access to our platform.
              </p>
              <p>
                <strong className="text-white">Usage Data:</strong> Usage statistics are used to enforce subscription limits, analyze service performance, and improve the user experience.
              </p>
              <p>
                <strong className="text-white">AI Processing:</strong> When you chat with your documents, the extracted text is sent to Google's Gemini API for processing. This data is used solely to provide AI-powered responses and is subject to Google's privacy policy.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">3. Sharing of Data</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                We do not sell, trade, or share your email address or other personal data with third parties, except as necessary to provide services or comply with legal obligations:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">Authentication:</strong> Clerk (our authentication provider) for account management</li>
                <li><strong className="text-white">AI Services:</strong> Google Gemini API for document analysis and chat functionality</li>
                <li><strong className="text-white">Payment Processing:</strong> Payment processors for subscription management</li>
                <li><strong className="text-white">Legal Compliance:</strong> When required by law or to protect our rights</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">4. Data Security</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                We take reasonable steps to protect your personal data from unauthorized access, disclosure, or misuse:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All PDF processing happens locally in your browser</li>
                <li>Secure authentication through industry-standard providers</li>
                <li>Encrypted data transmission (HTTPS)</li>
                <li>Regular security updates and monitoring</li>
              </ul>
              <p className="mt-3">
                However, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">5. User Rights</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                You have the following rights regarding your personal data:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">Access:</strong> Request a copy of your personal data</li>
                <li><strong className="text-white">Modification:</strong> Update your account information at any time</li>
                <li><strong className="text-white">Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong className="text-white">Data Portability:</strong> Request your data in a portable format</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, please contact us through your account settings or reach out to our support team.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">6. Data Retention</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                <strong className="text-white">Free Trial:</strong> If you do not subscribe after the free trial, your usage data will be retained for a limited period. Your account information may be retained for future communication unless you request its deletion.
              </p>
              <p>
                <strong className="text-white">Active Subscriptions:</strong> Your data is retained for as long as your account is active and for a reasonable period afterward to comply with legal obligations.
              </p>
              <p>
                <strong className="text-white">Document Data:</strong> Since all document processing happens in your browser, we do not store your PDF files or their contents on our servers.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">7. Cookies and Tracking</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintain your login session</li>
                <li>Remember your preferences</li>
                <li>Analyze website usage and performance</li>
                <li>Improve user experience</li>
              </ul>
              <p className="mt-3">
                You can disable cookies in your browser settings, but doing so may limit your access to certain features.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">8. Third-Party Services</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                Quaere integrates with the following third-party services:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">Clerk:</strong> Authentication and user management</li>
                <li><strong className="text-white">Google Gemini API:</strong> AI-powered document analysis</li>
              </ul>
              <p className="mt-3">
                These services have their own privacy policies, and we encourage you to review them.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">9. Children's Privacy</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                Quaere is not intended for use by children under the age of 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">10. Updates to Privacy Policy</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                We may update this policy from time to time to reflect changes in our practices or legal requirements. You will be notified of any significant changes via email or through a notice on our website. Continued use of Quaere after such changes constitutes acceptance of the updated policy.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">11. Contact Us</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                If you have any questions or concerns about this Privacy Policy or our data practices, please contact us through your account settings or our support channels.
              </p>
            </div>
          </section>
        </div>

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-400">
          Last Updated: October 13, 2025
        </div>
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
        </div>
      </footer>
    </div>
  );
};
