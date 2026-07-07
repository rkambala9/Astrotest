import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createBookingInputSchema, rescheduleInputSchema, cancelInputSchema } from './validation';
import type { Booking, Slot, AstrologerSettings } from './types';

const db = admin.firestore();

const HTTPS_OPTIONS: functions.RuntimeOptions = {
  // Modest resource allocation is fine at this scale (100 concurrent users);
  // memory/timeout kept explicit rather than left at defaults so cost and
  // behavior under load are predictable.
  memory: '256MB',
  timeoutSeconds: 30,
};

function requireAuth(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to book an appointment.',
    );
  }
  return context.auth.uid;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Creates a booking, atomically locking the requested slot so two users
 * racing for the same slot cannot both succeed. This is the function most
 * exercised under the 100-concurrent-user load test (see tests/bookingTransaction.test.ts) —
 * the slot read+write happens inside a single Firestore transaction, which
 * Firestore retries automatically on write conflicts, giving exactly one
 * winner per slot with no manual locking needed.
 */
export const createBooking = functions
  .runWith(HTTPS_OPTIONS)
  .https.onCall(async (data: unknown, context) => {
    const userId = requireAuth(context);

    const parsed = createBookingInputSchema.safeParse(data);
    if (!parsed.success) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Invalid booking input: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
      );
    }
    const input = parsed.data;

    const settingsSnap = await db.collection('settings').doc('astrologer').get();
    const settings = settingsSnap.data() as AstrologerSettings | undefined;
    if (!settings) {
      throw new functions.https.HttpsError('internal', 'Astrologer settings not configured.');
    }

    const bookingRef = db.collection('bookings').doc();
    const slotRef = db.collection('slots').doc(input.slotId);

    const bookingId = await db.runTransaction(async (tx) => {
      const slotSnap = await tx.get(slotRef);
      if (!slotSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Selected slot does not exist.');
      }
      const slot = slotSnap.data() as Slot;

      if (slot.isBooked || slot.isBlocked) {
        // This is the race-condition guard: if two requests reach this
        // transaction for the same slot, Firestore ensures only one commits
        // with isBooked:false read — the second automatically retries, rereads
        // isBooked:true, and lands here instead of double-booking.
        throw new functions.https.HttpsError(
          'already-exists',
          'This slot has just been booked by someone else. Please choose another.',
        );
      }

      const requiresPayment = settings.consultationFeePaise > 0;
      const booking: Booking = {
        id: bookingRef.id,
        userId,
        contact: input.contact,
        birth: input.birth,
        slotId: input.slotId,
        status: requiresPayment ? 'pending_payment' : 'confirmed',
        paymentStatus: requiresPayment ? 'pending' : 'not_required',
        paymentAmountPaise: requiresPayment ? settings.consultationFeePaise : 0,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      tx.set(bookingRef, booking);
      tx.update(slotRef, { isBooked: true });

      return bookingRef.id;
    });

    return {
      bookingId,
      requiresPayment: settings.consultationFeePaise > 0,
      amountPaise: settings.consultationFeePaise,
    };
  });

/**
 * Cancels a booking and releases its slot back to the available pool.
 * Ownership check (booking.userId === caller) prevents cancelling someone
 * else's appointment even if a bookingId were guessed/leaked.
 */
export const cancelBooking = functions
  .runWith(HTTPS_OPTIONS)
  .https.onCall(async (data: unknown, context) => {
    const userId = requireAuth(context);
    const parsed = cancelInputSchema.safeParse(data);
    if (!parsed.success) {
      throw new functions.https.HttpsError('invalid-argument', 'bookingId is required.');
    }

    const bookingRef = db.collection('bookings').doc(parsed.data.bookingId);

    await db.runTransaction(async (tx) => {
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Booking not found.');
      }
      const booking = bookingSnap.data() as Booking;

      if (booking.userId !== userId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'You can only cancel your own bookings.',
        );
      }
      if (booking.status === 'cancelled') {
        return; // idempotent
      }

      const slotRef = db.collection('slots').doc(booking.slotId);
      tx.update(bookingRef, { status: 'cancelled', updatedAt: nowIso() });
      tx.update(slotRef, { isBooked: false });
    });

    return { success: true as const };
  });

/**
 * Reschedules a booking: releases the old slot and locks the new one,
 * both inside one transaction so a failure partway through can't leave
 * the booking in a state where neither slot is properly held.
 */
export const rescheduleBooking = functions
  .runWith(HTTPS_OPTIONS)
  .https.onCall(async (data: unknown, context) => {
    const userId = requireAuth(context);
    const parsed = rescheduleInputSchema.safeParse(data);
    if (!parsed.success) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'bookingId and newSlotId are required.',
      );
    }
    const { bookingId, newSlotId } = parsed.data;

    const bookingRef = db.collection('bookings').doc(bookingId);
    const newSlotRef = db.collection('slots').doc(newSlotId);

    await db.runTransaction(async (tx) => {
      const [bookingSnap, newSlotSnap] = await Promise.all([tx.get(bookingRef), tx.get(newSlotRef)]);

      if (!bookingSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Booking not found.');
      }
      const booking = bookingSnap.data() as Booking;

      if (booking.userId !== userId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'You can only reschedule your own bookings.',
        );
      }
      if (booking.status !== 'confirmed') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Only confirmed bookings can be rescheduled.',
        );
      }
      if (!newSlotSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'New slot does not exist.');
      }
      const newSlot = newSlotSnap.data() as Slot;
      if (newSlot.isBooked || newSlot.isBlocked) {
        throw new functions.https.HttpsError(
          'already-exists',
          'The new slot is no longer available.',
        );
      }

      const oldSlotRef = db.collection('slots').doc(booking.slotId);
      tx.update(oldSlotRef, { isBooked: false });
      tx.update(newSlotRef, { isBooked: true });
      tx.update(bookingRef, {
        slotId: newSlotId,
        status: 'confirmed',
        updatedAt: nowIso(),
      });
    });

    return { success: true as const };
  });
