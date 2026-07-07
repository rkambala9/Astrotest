import { useEffect, useState } from 'react';
import { subscribeToMyBookings } from '@/services/bookingService';
import type { Booking } from '@/types';

interface UseBookingsResult {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
}

export function useBookings(userId: string | null): UseBookingsResult {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToMyBookings(
      userId,
      (nextBookings) => {
        setBookings(nextBookings);
        setLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [userId]);

  return { bookings, loading, error };
}
