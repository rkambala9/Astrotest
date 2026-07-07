import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { PaymentIntent } from '@/types';

/**
 * PAYMENT PROVIDER ABSTRACTION
 * -----------------------------------------------------------------------
 * This is a DUMMY payment integration for development/demo purposes.
 * No real money moves. It exists so the booking flow, UI, and Cloud
 * Function contracts are fully wired end-to-end now, and swapping in a
 * real provider (Razorpay is the common choice for India) later is a
 * matter of implementing this same PaymentProvider interface — no changes
 * needed in screens or the booking flow.
 *
 * To go live: implement RazorpayProvider (or StripeProvider) below,
 * replace `activeProvider`, and replace the dummy Cloud Function
 * (backend/functions/src/payment.ts) with real signature verification
 * against the provider's webhook.
 * -----------------------------------------------------------------------
 */

export interface PaymentResult {
  success: boolean;
  providerReference: string;
  failureReason?: string;
}

export interface PaymentProvider {
  /** Kicks off payment for a booking and resolves once the user completes/cancels it. */
  pay(intent: PaymentIntent): Promise<PaymentResult>;
}

const createPaymentIntentFn = httpsCallable<
  { bookingId: string },
  PaymentIntent
>(functions, 'createPaymentIntent');

const confirmDummyPaymentFn = httpsCallable<
  { bookingId: string; providerReference: string },
  { success: true }
>(functions, 'confirmDummyPayment');

/**
 * Simulates a payment sheet: always succeeds after a short delay, unless
 * the test mobile/email contains "faildemo" (handy for QA to exercise the
 * failure path without needing a real failing card).
 */
class DummyPaymentProvider implements PaymentProvider {
  private static readonly SIMULATED_LATENCY_MS = 1200;

  async pay(intent: PaymentIntent): Promise<PaymentResult> {
    await new Promise((resolve) =>
      setTimeout(resolve, DummyPaymentProvider.SIMULATED_LATENCY_MS),
    );

    const shouldSimulateFailure = intent.providerReference.includes('faildemo');
    if (shouldSimulateFailure) {
      return {
        success: false,
        providerReference: intent.providerReference,
        failureReason: 'Simulated payment failure (demo mode)',
      };
    }

    // Tell the backend the dummy payment "succeeded" — the Cloud Function
    // is the actual source of truth that flips paymentStatus to "paid".
    await confirmDummyPaymentFn({
      bookingId: intent.bookingId,
      providerReference: intent.providerReference,
    });

    return { success: true, providerReference: intent.providerReference };
  }
}

const activeProvider: PaymentProvider = new DummyPaymentProvider();

export async function startPaymentForBooking(bookingId: string): Promise<PaymentResult> {
  const intentResult = await createPaymentIntentFn({ bookingId });
  const intent = intentResult.data;
  return activeProvider.pay(intent);
}
