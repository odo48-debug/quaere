import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from './useSubscription';

interface UsageData {
  pagesProcessedThisMonth: number;
  lastResetDate: string; // Now stores the month (YYYY-MM format)
}

const STORAGE_KEY = 'pdf_analyzer_usage';

export const useUsageLimit = () => {
  const { user, isSignedIn } = useUser();
  const { limits, isPaidUser, isFreeTrialActive } = useSubscription();
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [usage, setUsage] = useState<UsageData>({ pagesProcessedThisMonth: 0, lastResetDate: getCurrentMonth() });

  // Load usage from localStorage
  useEffect(() => {
    if (!isSignedIn || !user) return;

    const storageKey = `${STORAGE_KEY}_${user.id}`;

    const loadUsage = () => {
      const savedUsage = localStorage.getItem(storageKey);
      if (savedUsage) {
        const parsed = JSON.parse(savedUsage) as UsageData;
        const currentMonth = getCurrentMonth();

        // Reset if it's a new month
        if (parsed.lastResetDate !== currentMonth) {
          const resetUsage = { pagesProcessedThisMonth: 0, lastResetDate: currentMonth };
          setUsage(resetUsage);
          localStorage.setItem(storageKey, JSON.stringify(resetUsage));
        } else {
          setUsage(parsed);
        }
      }
    };

    loadUsage();

    // Sync across different instances of this hook (e.g. App.tsx and AppSidebar.tsx)
    window.addEventListener('usageUpdated', loadUsage);
    return () => window.removeEventListener('usageUpdated', loadUsage);
  }, [isSignedIn, user]);

  const incrementPageCount = (pageCount: number) => {
    if (!isSignedIn || !user) return;

    const storageKey = `${STORAGE_KEY}_${user.id}`;
    const currentMonth = getCurrentMonth();

    let currentCount = 0;
    const savedUsage = localStorage.getItem(storageKey);
    if (savedUsage) {
      const parsed = JSON.parse(savedUsage) as UsageData;
      if (parsed.lastResetDate === currentMonth) {
        currentCount = parsed.pagesProcessedThisMonth || 0;
      }
    }

    const newUsage = {
      pagesProcessedThisMonth: currentCount + pageCount,
      lastResetDate: currentMonth,
    };

    localStorage.setItem(storageKey, JSON.stringify(newUsage));
    window.dispatchEvent(new Event('usageUpdated'));
  };

  const canProcessPages = (pageCount: number): boolean => {
    if (!isSignedIn) return false;
    // If not paid and trial is over, no pages allowed
    if (!isPaidUser && !isFreeTrialActive) return false;

    // Check if the total pages (current + requested) exceeds the plan limit
    return (usage.pagesProcessedThisMonth + pageCount) <= limits.pagesPerMonth;
  };

  const getRemainingPages = (): number => {
    // Calculate remaining pages independently of trial status
    return Math.max(0, limits.pagesPerMonth - usage.pagesProcessedThisMonth);
  };

  return {
    usage,
    limits,
    canProcessPages,
    incrementPageCount,
    getRemainingPages,
    isPaidUser,
    isFreeTrialActive,
  };
};
