import { httpsCallable } from 'firebase/functions';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { functions, db } from './firebase';
import type { Booking, CreateBookingInput, Slot } from '@/types';

/**
 * All mutating operations go through Cloud Functions (httpsCallable), never
 * direct client writes to Firestore. This is deliberate: it means every
 * write path re-runs server-side validation, the slot-locking transaction,
 * and auth checks — a client can never bypass those by writing to Firestore
 * directly, because Firestore rules (see backend/firestore.rules) deny
 * client writes to `bookings` and `slots` entirely.
 */

interface CreateBookingResponse {
  bookingId: string;
  requiresPayment: boolean;
  amountPaise: number;
}

const createBookingFn = httpsCallable<CreateBookingInput, CreateBookingResponse>(
  functions,
  'createBooking',
);

const cancelBookingFn = httpsCallable<{ bookingId: string }, { success: true }>(
  functions,
  'cancelBooking',
);

const rescheduleBookingFn = httpsCallable<
  { bookingId: string; newSlotId: string },
  { success: true }
>(functions, 'rescheduleBooking');

export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResponse> {
  const result = await createBookingFn(input);
  return result.data;
}

export async function cancelBooking(bookingId: string): Promise<void> {
  await cancelBookingFn({ bookingId });
}

export async function rescheduleBooking(bookingId: string, newSlotId: string): Promise<void> {
  await rescheduleBookingFn({ bookingId, newSlotId });
}

/**
 * Subscribes to the current user's bookings in real time.
 * Firestore rules restrict this query to documents where userId == request.auth.uid,
 * so this can never leak another user's bookings even if the query were modified.
 */
export function subscribeToMyBookings(
  userId: string,
  onChange: (bookings: Booking[]) => void,
  onError: (error: Error) => void,
): () => void {
  const bookingsQuery = query(
    collection(db, 'bookings'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    bookingsQuery,
    (snapshot) => {
      const bookings = snapshot.docs.map((doc) => doc.data() as Booking);
      onChange(bookings);
    },
    (error) => onError(error),
  );
}

/**
 * Subscribes to available (bookable) slots for a date range.
 * Read-only for clients — Firestore rules allow reads but deny writes.
 */
export function subscribeToAvailableSlots(
  fromDateISO: string,
  toDateISO: string,
  onChange: (slots: Slot[]) => void,
  onError: (error: Error) => void,
): () => void {
  const slotsQuery = query(
    collection(db, 'slots'),
    where('dateISO', '>=', fromDateISO),
    where('dateISO', '<=', toDateISO),
    orderBy('dateISO', 'asc'),
  );

  return onSnapshot(
    slotsQuery,
    (snapshot) => {
      const slots = snapshot.docs.map((doc) => doc.data() as Slot);
      onChange(slots);
    },
    (error) => onError(error),
  );
}
