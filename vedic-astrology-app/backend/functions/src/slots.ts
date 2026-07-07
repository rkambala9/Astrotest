import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { addMinutes, format, parse, addDays } from 'date-fns';
import type { AstrologerSettings, Slot } from './types';

const db = admin.firestore();
const GENERATION_WINDOW_DAYS = 30;

/**
 * Regenerates the rolling slot pool from AstrologerSettings. This is what
 * makes availability configuration-driven rather than hardcoded: change
 * working hours or slot duration in the admin screen, and the next run of
 * this function reflects it — no code deploy needed.
 *
 * Runs daily via Cloud Scheduler (see firebase.json "schedule" trigger) to
 * keep a rolling 30-day window of slots always available, and can also be
 * invoked manually after the astrologer edits settings (see admin.ts,
 * which calls this after updateAstrologerSettings).
 */
export async function regenerateSlots(): Promise<void> {
  const settingsSnap = await db.collection('settings').doc('astrologer').get();
  const settings = settingsSnap.data() as AstrologerSettings | undefined;
  if (!settings) {
    functions.logger.warn('regenerateSlots: no astrologer settings found, skipping.');
    return;
  }

  const batch = db.batch();
  const today = new Date();

  for (let dayOffset = 0; dayOffset < GENERATION_WINDOW_DAYS; dayOffset++) {
    const date = addDays(today, dayOffset);
    const dateISO = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();

    const isWorkingDay = settings.workingDays.includes(dayOfWeek);
    const isBlackedOut = settings.blackoutDates.includes(dateISO);
    if (!isWorkingDay || isBlackedOut) {
      continue;
    }

    let slotStart = parse(`${dateISO} ${settings.workStartTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const dayEnd = parse(`${dateISO} ${settings.workEndTime}`, 'yyyy-MM-dd HH:mm', new Date());

    while (addMinutes(slotStart, settings.slotDurationMins) <= dayEnd) {
      const slotEnd = addMinutes(slotStart, settings.slotDurationMins);
      const slotId = `${dateISO}_${format(slotStart, 'HHmm')}`;
      const slotRef = db.collection('slots').doc(slotId);

      // Use set with merge so existing isBooked state is preserved for
      // slots that already exist — we're only ever adding new slots or
      // refreshing metadata, never silently un-booking an existing one.
      const slot: Partial<Slot> = {
        id: slotId,
        dateISO,
        startTime: format(slotStart, 'HH:mm'),
        endTime: format(slotEnd, 'HH:mm'),
        isBlocked: false,
      };
      batch.set(slotRef, slot, { merge: true });

      slotStart = addMinutes(slotStart, settings.slotDurationMins + settings.bufferBetweenSlotsMins);
    }
  }

  await batch.commit();
}

/** Scheduled trigger: keeps the rolling slot window fresh every day at 00:15. */
export const generateSlots = functions.pubsub
  .schedule('15 0 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    await regenerateSlots();
  });
