import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { randomUUID } from 'crypto';
import type { Booking, PaymentIntent } from './types';

const db = admin.firestore();

function requireAuth(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }
  return context.auth.uid;
}

/**
 * DUMMY PAYMENT INTEGRATION
 * -----------------------------------------------------------------------
 * This mints a fake PaymentIntent — no real payment gateway is contacted.
 * It exists so the full booking -> payment -> confirmation flow can be
 * built, tested, and demoed end-to-end today.
 *
 * TO GO LIVE WITH A REAL GATEWAY (e.g. Razorpay):
 *   1. Replace this function's body with a real order-creation call to the
 *      provider's API (e.g. razorpay.orders.create).
 *   2. Replace confirmDummyPayment below with a webhook handler that
 *      verifies the provider's signature — never trust a client-reported
 *      "payment succeeded" the way confirmDummyPayment currently does.
 *   3. No changes needed in bookings.ts, or any screen — they only depend
 *      on the PaymentIntent shape and the paymentStatus field on Booking.
 * -----------------------------------------------------------------------
 */
export const createPaymentIntent = functions.https.onCall(
  async (data: unknown, context) => {
    const userId = requireAuth(context);
    const bookingId = typeof data === 'object' && data !== null ? (data as { bookingId?: unknown }).bookingId : undefined;
    if (typeof bookingId !== 'string' || bookingId.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'bookingId is required.');
    }

    const bookingSnap = await db.collection('bookings').doc(bookingId).get();
    if (!bookingSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Booking not found.');
    }
    const booking = bookingSnap.data() as Booking;

    if (booking.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not your booking.');
    }
    if (booking.paymentStatus !== 'pending') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Payment is not pending for this booking (status: ${booking.paymentStatus}).`,
      );
    }

    const intent: PaymentIntent = {
      bookingId,
      amountPaise: booking.paymentAmountPaise,
      currency: 'INR',
      provider: 'dummy',
      providerReference: `dummy_${randomUUID()}`,
    };
    return intent;
  },
);

/**
 * DUMMY confirmation endpoint: trusts the client's report that payment
 * succeeded. This is ONLY acceptable because no real money moves here.
 * A real integration must NEVER take payment confirmation from the client
 * this way — it must come from a signed server-to-server webhook from the
 * payment provider, which the client cannot forge.
 */
export const confirmDummyPayment = functions.https.onCall(
  async (data: unknown, context) => {
    const userId = requireAuth(context);
    const input = data as { bookingId?: unknown; providerReference?: unknown };
    if (typeof input.bookingId !== 'string' || typeof input.providerReference !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid confirmation payload.');
    }

    const bookingRef = db.collection('bookings').doc(input.bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Booking not found.');
    }
    const booking = bookingSnap.data() as Booking;
    if (booking.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not your booking.');
    }

    await bookingRef.update({
      paymentStatus: 'paid',
      status: 'confirmed',
      updatedAt: new Date().toISOString(),
    });

    return { success: true as const };
  },
);
