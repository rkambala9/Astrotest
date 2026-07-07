import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { astrologerSettingsSchema, blackoutDateInputSchema } from './validation';
import { regenerateSlots } from './slots';

const db = admin.firestore();

/**
 * SECURITY: admin status is a custom claim on the Firebase Auth token
 * (set out-of-band by a one-time setup script — never settable by the
 * client itself). Checking context.auth.token.admin here is the real
 * access control; the app's UI-level route guard is only a convenience.
 */
function requireAdmin(context: functions.https.CallableContext): void {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only the astrologer account can manage availability.',
    );
  }
}

export const updateAstrologerSettings = functions.https.onCall(
  async (data: unknown, context) => {
    requireAdmin(context);

    const parsed = astrologerSettingsSchema.safeParse(data);
    if (!parsed.success) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Invalid settings: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
      );
    }

    await db.collection('settings').doc('astrologer').set(parsed.data);
    // Regenerate immediately so the new hours/duration take effect without
    // waiting for the nightly scheduled run.
    await regenerateSlots();

    return { success: true as const };
  },
);

export const addBlackoutDate = functions.https.onCall(async (data: unknown, context) => {
  requireAdmin(context);
  const parsed = blackoutDateInputSchema.safeParse(data);
  if (!parsed.success) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid date format.');
  }

  const settingsRef = db.collection('settings').doc('astrologer');
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(settingsRef);
    const blackoutDates: string[] = (snap.data()?.blackoutDates as string[] | undefined) ?? [];
    if (!blackoutDates.includes(parsed.data.dateISO)) {
      tx.update(settingsRef, { blackoutDates: [...blackoutDates, parsed.data.dateISO] });
    }
  });

  // Also unblock/free any already-generated slots on that date that were
  // not yet booked, and leave already-booked ones for the astrologer to
  // handle manually (avoids silently cancelling a confirmed appointment).
  const slotsSnap = await db
    .collection('slots')
    .where('dateISO', '==', parsed.data.dateISO)
    .where('isBooked', '==', false)
    .get();
  const batch = db.batch();
  slotsSnap.docs.forEach((doc) => batch.update(doc.ref, { isBlocked: true }));
  await batch.commit();

  return { success: true as const };
});

export const removeBlackoutDate = functions.https.onCall(async (data: unknown, context) => {
  requireAdmin(context);
  const parsed = blackoutDateInputSchema.safeParse(data);
  if (!parsed.success) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid date format.');
  }

  const settingsRef = db.collection('settings').doc('astrologer');
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(settingsRef);
    const blackoutDates: string[] = (snap.data()?.blackoutDates as string[] | undefined) ?? [];
    tx.update(settingsRef, {
      blackoutDates: blackoutDates.filter((d) => d !== parsed.data.dateISO),
    });
  });

  const slotsSnap = await db
    .collection('slots')
    .where('dateISO', '==', parsed.data.dateISO)
    .get();
  const batch = db.batch();
  slotsSnap.docs.forEach((doc) => batch.update(doc.ref, { isBlocked: false }));
  await batch.commit();

  return { success: true as const };
});
