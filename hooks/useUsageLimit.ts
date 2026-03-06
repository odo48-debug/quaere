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
  }, [isSignedIn, user]);

  const incrementPageCount = (pageCount: number) => {
    if (!isSignedIn || !user) return;

    const storageKey = `${STORAGE_KEY}_${user.id}`;
    const newUsage = {
      pagesProcessedThisMonth: usage.pagesProcessedThisMonth + pageCount,
      lastResetDate: usage.lastResetDate,
    };

    setUsage(newUsage);
    localStorage.setItem(storageKey, JSON.stringify(newUsage));
  };

  const canProcessPages = (pageCount: number): boolean => {
    if (!isSignedIn) return false;
    // During free trial, allow processing pages
    if (isFreeTrialActive) return true;
    // After trial, only paid users can continue
    if (!isPaidUser) return false;
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
