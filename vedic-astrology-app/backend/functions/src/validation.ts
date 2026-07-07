import { z } from 'zod';

/**
 * THIS FILE IS THE SECURITY BOUNDARY.
 * The client-side copy (src/utils/validation.ts) exists for UX only —
 * inline error messages before a network round trip. Nothing the client
 * sends is trusted until it passes THIS validation, running here on the
 * server, inside the Cloud Function, before any Firestore write happens.
 */

const E164_MOBILE_REGEX = /^\+[1-9]\d{7,14}$/;
const MIN_BIRTH_YEAR = 1900;

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  mobile: z.string().trim().regex(E164_MOBILE_REGEX),
});

export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const birthDetailsSchema = z
  .object({
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((val) => {
      const date = new Date(val);
      const year = date.getFullYear();
      return !Number.isNaN(date.getTime()) && year >= MIN_BIRTH_YEAR && date <= new Date();
    }),
    birthPlace: z.object({
      text: z.string().trim().min(2),
      coords: geoPointSchema,
      timezone: z.string().min(1),
    }),
    birthTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable(),
    birthTimeUnknown: z.boolean(),
  })
  .refine((data) => data.birthTimeUnknown || data.birthTime !== null, {
    message: 'birthTime required unless birthTimeUnknown is true',
    path: ['birthTime'],
  });

export const createBookingInputSchema = z.object({
  contact: contactSchema,
  birth: birthDetailsSchema,
  slotId: z.string().min(1),
});

export const rescheduleInputSchema = z.object({
  bookingId: z.string().min(1),
  newSlotId: z.string().min(1),
});

export const cancelInputSchema = z.object({
  bookingId: z.string().min(1),
});

export const astrologerSettingsSchema = z.object({
  workingDays: z.array(z.number().int().min(0).max(6)).min(0).max(7),
  workStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  workEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  slotDurationMins: z.number().int().min(10).max(240),
  bufferBetweenSlotsMins: z.number().int().min(0).max(60),
  blackoutDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  timezone: z.string().min(1),
  consultationFeePaise: z.number().int().min(0),
});

export const blackoutDateInputSchema = z.object({
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
