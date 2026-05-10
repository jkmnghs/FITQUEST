import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Checks the user's subscription tier from the `subscriptions` table.
 * Returns { tier, isPremium, expiresAt, loading }.
 *
 * Free tier: 5 Quest messages/week.
 * Premium tier: unlimited Quest access + all premium features.
 *
 * Gracefully no-ops if Supabase is not configured.
 */
export function useSubscription(userId) {
  const [tier, setTier] = useState('free');
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !userId) {
      setLoading(false);
      return;
    }

    supabase
      .from('subscriptions')
      .select('tier, status, expires_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.tier === 'premium') {
          // Double-check expiry client-side (server is authoritative but this
          // prevents a brief flash of premium UI on expired subscriptions)
          const expired = data.expires_at && new Date(data.expires_at) < new Date();
          setTier(expired ? 'free' : 'premium');
          setExpiresAt(data.expires_at);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  return {
    tier,
    isPremium: tier === 'premium',
    expiresAt,
    loading,
  };
}
