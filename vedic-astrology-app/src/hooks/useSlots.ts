import { useEffect, useState } from 'react';
import { format, addDays } from 'date-fns';
import { subscribeToAvailableSlots } from '@/services/bookingService';
import type { Slot } from '@/types';

const DEFAULT_WINDOW_DAYS = 14;

interface UseSlotsResult {
  slots: Slot[];
  loading: boolean;
  error: string | null;
}

/** Subscribes to slots for the next `windowDays` days, updating live as the admin changes availability. */
export function useSlots(windowDays: number = DEFAULT_WINDOW_DAYS): UseSlotsResult {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromDateISO = format(new Date(), 'yyyy-MM-dd');
    const toDateISO = format(addDays(new Date(), windowDays), 'yyyy-MM-dd');

    const unsubscribe = subscribeToAvailableSlots(
      fromDateISO,
      toDateISO,
      (nextSlots) => {
        setSlots(nextSlots);
        setLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [windowDays]);

  return { slots, loading, error };
}
