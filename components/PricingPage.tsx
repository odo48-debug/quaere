import React from 'react';
import { PricingCard } from './PricingCard';
import { IconSparkles } from './icons';
import { UserButton } from './auth/UserButton';

interface PricingPageProps {
  onBack?: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconSparkles className="w-7 h-7 text-blue-500" />
            <h1 className="text-xl font-bold text-white">Quaere</h1>
          </div>
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Back to App
              </button>
            )}
            <UserButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="py-16 px-4">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Choose the plan that fits your needs. Start with a 7-day free trial, no credit card required.
          </p>
        </div>

        <PricingCard />

        {/* FAQ or Additional Info */}
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <h3 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h3>
          <div className="space-y-4 text-left">
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-2">What happens after the free trial?</h4>
              <p className="text-gray-400">
                After your 7-day free trial, you'll be charged based on your selected plan. You can cancel anytime before the trial ends.
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-2">Can I change my plan later?</h4>
              <p className="text-gray-400">
                Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-2">What if I exceed my monthly page limit?</h4>
              <p className="text-gray-400">
                You'll be notified when you're approaching your limit. You can upgrade your plan or wait until the next month when your limit resets.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
