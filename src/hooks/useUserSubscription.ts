'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SubscriptionData {
  plan: 'starter' | 'pro' | 'studio' | 'free';
  planName: string;
  status: string;
  isSubscribed: boolean;
  frequency?: string;
  paymentMethod?: string;
  currentPeriodEnd?: string;
  features: {
    maxMonthlyAudits: number;
    canDownloadPatch: boolean;
    canDownloadBlueprint: boolean;
    hasASTDeepScan: boolean;
    hasGithubPRAutoCreate: boolean;
    hasUnlimitedAudits: boolean;
    hasCustomRules: boolean;
  };
}

const STORAGE_KEY = 'mitigar_user_email';

export function useUserSubscription() {
  const [email, setEmail] = useState<string>('');
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Carrega e-mail salvo no cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem(STORAGE_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, []);

  const fetchSubscription = useCallback(async (targetEmail?: string) => {
    const checkEmail = targetEmail || email;
    if (!checkEmail) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/user/subscription?email=${encodeURIComponent(checkEmail)}`);
      const data = await res.json();
      setSubscription(data);
    } catch (err) {
      console.warn('Erro ao checar assinatura:', err);
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (email) {
      fetchSubscription(email);
    }
  }, [email, fetchSubscription]);

  const saveEmailAndSync = (newEmail: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newEmail);
    }
    setEmail(newEmail);
    fetchSubscription(newEmail);
  };

  const isPro = subscription?.plan === 'pro' || subscription?.plan === 'studio';
  const isStudio = subscription?.plan === 'studio';

  return {
    email,
    subscription,
    isLoading,
    isPro,
    isStudio,
    saveEmailAndSync,
    refreshSubscription: () => fetchSubscription(email)
  };
}
