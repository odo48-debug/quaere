import React from 'react';
import { IconCrown, IconCheck, IconArrowRight } from './icons';

interface UpgradePromptProps {
  onUpgrade: () => void;
  reason?: string;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({ onUpgrade, reason }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fadeInUp">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mb-4">
            <IconCrown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upgrade to Pro</h2>
          {reason && (
            <p className="text-sm text-gray-600">{reason}</p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">Unlimited PDFs per day</span>
          </div>
          <div className="flex items-start gap-3">
            <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">Up to 50 pages per PDF</span>
          </div>
          <div className="flex items-start gap-3">
            <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">Unlimited AI chat</span>
          </div>
          <div className="flex items-start gap-3">
            <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">Priority processing</span>
          </div>
          <div className="flex items-start gap-3">
            <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">Premium support</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span className="text-4xl font-extrabold text-gray-900">$99</span>
            <span className="text-lg text-gray-600">/month</span>
          </div>
        </div>

        <button
          onClick={onUpgrade}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
        >
          Upgrade Now
          <IconArrowRight className="w-5 h-5" />
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Secure payment powered by Stripe
        </p>
      </div>
    </div>
  );
};
