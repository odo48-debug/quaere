import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { IconCheck, IconArrowRight } from './icons';
import { useClerkBilling } from '../hooks/useClerkBilling';

interface PricingTier {
  pages: number;
  price: number;
  label: string;
}

const pricingTiers: PricingTier[] = [
  { pages: 100, price: 9.99, label: '100' },
  { pages: 500, price: 19.99, label: '500' },
  { pages: 2000, price: 29.99, label: '2K' },
];

export const PricingCard: React.FC = () => {
  const [selectedTierIndex, setSelectedTierIndex] = useState(1); // Default to 500
  const { subscribeToPlan } = useClerkBilling();
  const { isSignedIn } = useUser();

  const selectedTier = pricingTiers[selectedTierIndex];
  const displayPrice = selectedTier.price;

  // Mapear el tier a un plan ID de Clerk (usando los Plan Keys de producción)
  const getPlanId = (tierIndex: number): string => {
    const clerkPlanIds = [
      import.meta.env.VITE_PLAN_100 || 'cplan_30VxITOcfVN0hdOhJXvXuWjspgl',   // 100_pages
      import.meta.env.VITE_PLAN_500 || 'cplan_33l2AseFDpR7GMjqvzVPWJNkOSj',   // 500_pages
      import.meta.env.VITE_PLAN_2000 || 'cplan_33l2ONRsdHgAyPiYJnwXAOdVQxx',   // 2000_pages
    ];
    return clerkPlanIds[tierIndex];
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTierIndex(parseInt(e.target.value));
  };

  const formatPages = (pages: number): string => {
    if (pages >= 1000000) return `${pages / 1000000}M`;
    if (pages >= 1000) return `${pages / 1000}K`;
    return pages.toString();
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      {/* Slider Section */}
      <div className="mb-8">
        <div className="bg-gray-800 text-white px-4 py-2 rounded-lg inline-block mb-4">
          Up to {formatPages(selectedTier.pages)} monthly pages processing
        </div>

        <div className="relative">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>100</span>
            <span>2K</span>
          </div>
          <input
            type="range"
            min="0"
            max={pricingTiers.length - 1}
            value={selectedTierIndex}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${(selectedTierIndex / (pricingTiers.length - 1)) * 100}%, #374151 ${(selectedTierIndex / (pricingTiers.length - 1)) * 100}%, #374151 100%)`
            }}
          />
        </div>
      </div>

      {/* Pricing Card */}
      <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl">
        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-bold text-white">€{displayPrice.toFixed(2)}</span>
            <span className="text-gray-400 text-xl">/month</span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-gray-300">
            <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span>{formatPages(selectedTier.pages)} monthly pages processing</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300">
            <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span>Unlimited PDFs</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300">
            <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span>Up to 200 pages per PDF</span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => subscribeToPlan(getPlanId(selectedTierIndex))}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2 group"
        >
          {isSignedIn
            ? `Subscribe — ${formatPages(selectedTier.pages)} pages/month`
            : 'Start 7-day free trial'
          }
          <IconArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-center text-gray-400 text-sm mt-4">
          7-day free trial · 100 pages included · No credit card required.
        </p>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};
